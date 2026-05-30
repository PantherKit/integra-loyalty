import type { Context, Next } from 'hono';
import { verifyIdToken } from '../lib/cognito';
import { getUser } from '../lib/repositories/user';

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

  // Dev fallback — requiere DOS condiciones explícitas para no abrir
  // aislamiento por un ENV=dev accidental en infra alcanzable (hallazgo A4).
  if (process.env.ENV === 'dev' && process.env.ALLOW_HEADER_AUTH === 'true') {
    const headerTenant = c.req.header('x-tenant-id');
    if (headerTenant) {
      const headerUserId = c.req.header('x-user-id') ?? 'dev-user';
      const user = await getUser(headerTenant, headerUserId).catch(() => null);

      c.set('tenantId', headerTenant);
      c.set('userId', headerUserId);
      c.set('userEmail', user?.email ?? c.req.header('x-user-email') ?? 'dev@example.com');
      c.set('userRole', user?.role ?? 'owner');
      await next();
      return;
    }
  }

  return c.json({ error: 'unauthorized', hint: 'missing Bearer token' }, 401);
}

/** Roles con permiso para operar el back office del comercio. */
export const MERCHANT_ROLES = ['owner', 'merchant', 'staff', 'integra_admin'] as const;

/**
 * Roles internos de Integra. Su JWT lleva tenantId = INTEGRA_TENANT_ID y
 * gestionan la fuerza de ventas / consola interna. `integra_admin` aparece
 * en ambas listas porque también puede operar el back office del comercio.
 */
export const INTEGRA_ROLES = ['sales_admin', 'sales_rep', 'integra_admin'] as const;

/**
 * Autorización por rol (hallazgo C2). Debe ir DESPUÉS de requireTenant.
 * Bloquea tokens que no sean del comercio (p.ej. un futuro end_customer)
 * en operaciones sensibles como stamp/redeem.
 */
export function requireRole(...allowed: string[]) {
  return async (c: Context, next: Next) => {
    const role = c.get('userRole');
    if (!role || !allowed.includes(role)) {
      return c.json({ error: 'forbidden', hint: 'rol sin permiso para esta operación' }, 403);
    }
    await next();
  };
}
