import { Hono } from 'hono';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import {
  createCognitoUser,
  authenticateUser,
  verifyIdToken,
} from '../lib/cognito';
import { createTenant } from '../lib/repositories/tenant';
import { findUserByEmail, touchLastLogin } from '../lib/repositories/user';
import { Industry } from '../lib/entities';

export const auth = new Hono();

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  merchantName: z.string().min(2).max(120),
  industry: Industry,
});

auth.post('/signup', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);

  // Check si el email ya existe (idempotency básica)
  const existing = await findUserByEmail(parsed.data.email);
  if (existing) return c.json({ error: 'email_already_registered' }, 409);

  const tenantId = randomUUID();

  // Cognito primero (si falla, no creamos entities)
  const { cognitoSub } = await createCognitoUser({
    email: parsed.data.email,
    password: parsed.data.password,
    tenantId,
  });

  // Crear Tenant + Merchant + User en DDB transaccional con el MISMO tenantId
  const result = await createTenant({
    email: parsed.data.email,
    merchantName: parsed.data.merchantName,
    industry: parsed.data.industry,
    cognitoSub,
    tenantId, // alinea con custom:tenantId en Cognito
  });

  // Generar tokens (auto-login post-signup)
  const tokens = await authenticateUser(parsed.data.email, parsed.data.password);

  return c.json(
    {
      tenant: { tenantId: result.tenant.tenantId, plan: result.tenant.plan },
      merchant: { name: result.merchant.name, industry: result.merchant.industry },
      user: { userId: result.user.userId, email: result.user.email, role: result.user.role },
      tokens,
    },
    201
  );
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

auth.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);

  try {
    const tokens = await authenticateUser(parsed.data.email, parsed.data.password);
    const claims = await verifyIdToken(tokens.idToken);
    if (claims.tenantId) {
      await touchLastLogin(claims.tenantId, claims.sub).catch(() => {
        // Best-effort, no bloquear login
      });
    }
    return c.json({ tokens, claims });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'auth_failed';
    return c.json({ error: 'invalid_credentials', detail: msg }, 401);
  }
});

auth.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  try {
    const claims = await verifyIdToken(authHeader.slice(7));
    return c.json({ claims });
  } catch (e) {
    return c.json({ error: 'invalid_token', detail: e instanceof Error ? e.message : '' }, 401);
  }
});
