import type { Context, Next } from 'hono';
import { verifyIdToken } from '../lib/cognito';

declare module 'hono' {
  interface ContextVariableMap {
    tenantId: string;
    userId: string;
    userEmail: string;
    userRole: string;
  }
}

/**
 * Tenant guard — ADR-002.
 * Verifica el JWT del Authorization header y carga tenant_id del custom claim.
 * En dev permite también `x-tenant-id` header como fallback para curl/testing.
 */
export async function requireTenant(c: Context, next: Next) {
  const auth = c.req.header('Authorization');
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    try {
      const claims = await verifyIdToken(token);
      if (!claims.tenantId) {
        return c.json({ error: 'jwt_missing_tenant', hint: 'token sin custom:tenantId' }, 401);
      }
      c.set('tenantId', claims.tenantId);
      c.set('userId', claims.sub);
      c.set('userEmail', claims.email);
      c.set('userRole', claims.role);
      await next();
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'invalid_token';
      return c.json({ error: 'jwt_invalid', detail: msg }, 401);
    }
  }

  // Dev fallback — solo si no hay JWT y env=dev
  if (process.env.ENV === 'dev') {
    const headerTenant = c.req.header('x-tenant-id');
    if (headerTenant) {
      c.set('tenantId', headerTenant);
      c.set('userId', c.req.header('x-user-id') ?? 'dev-user');
      c.set('userEmail', c.req.header('x-user-email') ?? 'dev@example.com');
      c.set('userRole', 'owner');
      await next();
      return;
    }
  }

  return c.json({ error: 'unauthorized', hint: 'missing Bearer token' }, 401);
}
