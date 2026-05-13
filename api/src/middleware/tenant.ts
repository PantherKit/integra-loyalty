import type { Context, Next } from 'hono';

declare module 'hono' {
  interface ContextVariableMap {
    tenantId: string;
  }
}

/**
 * Tenant guard — ADR-002.
 * Verifica que el JWT incluya `tenant_id` y lo inyecta en el context.
 * TODO (Q-7 BR wallet-onboarding): integrar verificación real de JWT con Cognito.
 */
export async function requireTenant(c: Context, next: Next) {
  // En dev/stage acceptamos un header temporal `x-tenant-id` para pruebas.
  // En prod, esto se reemplaza con verifyJwt(authHeader) del Cognito User Pool.
  const headerTenant = c.req.header('x-tenant-id');
  if (!headerTenant) {
    return c.json({ error: 'no_tenant', hint: 'pass x-tenant-id header (dev) or Authorization JWT (prod)' }, 401);
  }
  c.set('tenantId', headerTenant);
  await next();
}
