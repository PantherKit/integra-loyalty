import type { Context, Next } from 'hono';
import { getTenant } from '../lib/repositories/tenant';
import { entitlement } from '../lib/entitlement';
import type { Tenant } from '../lib/entities';

/**
 * Paywall (gate de suscripción). DEBE ir DESPUÉS de requireTenant.
 *
 * Si el tenant no tiene entitlement activo (prueba vencida / sin suscripción
 * / past_due / canceled) responde 402 subscription_required y NO ejecuta el
 * handler. Solo aplicar a operaciones de escritura del back office
 * (stamp/redeem/crear programa). NUNCA a GET ni a endpoints públicos ni al
 * .pkpass: los clientes finales jamás se bloquean.
 *
 * Cache module-level corta por tenant: el paywall se consulta en cada
 * stamp/redeem y los datos cambian poco. TTL corto para reflejar pagos
 * recientes sin pegarle a DDB en cada request en warm Lambda.
 */
interface CacheEntry {
  tenant: Tenant | null;
  at: number;
}
const TTL_MS = 30_000;
const cache = new Map<string, CacheEntry>();

async function loadTenantCached(tenantId: string): Promise<Tenant | null> {
  const hit = cache.get(tenantId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.tenant;
  const tenant = await getTenant(tenantId);
  cache.set(tenantId, { tenant, at: Date.now() });
  return tenant;
}

export async function requireSubscription(c: Context, next: Next) {
  const tenantId = c.get('tenantId');
  const tenant = await loadTenantCached(tenantId);
  const ent = entitlement(tenant);

  if (!ent.active) {
    return c.json(
      {
        error: 'subscription_required',
        reason: ent.reason,
        status: tenant?.subscriptionStatus ?? 'none',
        trialEndsAt: tenant?.trialEndsAt ?? null,
      },
      402
    );
  }

  await next();
}
