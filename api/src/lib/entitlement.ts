import type { Tenant } from './entities';

export interface Entitlement {
  /** true si el comercio puede operar el back office (sellos, programas). */
  active: boolean;
  /** Razón legible/programática del estado. */
  reason:
    | 'active'
    | 'trialing'
    | 'trial_expired'
    | 'past_due'
    | 'canceled'
    | 'no_subscription';
}

/**
 * Decide si un tenant tiene derecho (entitlement) a operar el back office.
 *
 * Reglas:
 *  - subscriptionStatus === 'active'                         -> activo
 *  - subscriptionStatus === 'trialing' y trialEndsAt futuro  -> activo (prueba vigente)
 *  - cualquier otro caso                                     -> bloqueado
 *
 * Compat: tenants viejos sin `subscriptionStatus` (creados antes de Stripe)
 * se tratan como 'no_subscription' -> bloqueados; el flujo de checkout los
 * regulariza. (No hay tenants legacy en prod aún; decisión segura.)
 */
export function entitlement(
  tenant: Pick<Tenant, 'subscriptionStatus' | 'trialEndsAt'> | null | undefined,
  now: Date = new Date()
): Entitlement {
  if (!tenant) return { active: false, reason: 'no_subscription' };

  const status = tenant.subscriptionStatus;

  if (status === 'active') return { active: true, reason: 'active' };

  if (status === 'trialing') {
    const ends = tenant.trialEndsAt ? Date.parse(tenant.trialEndsAt) : NaN;
    if (Number.isFinite(ends) && ends > now.getTime()) {
      return { active: true, reason: 'trialing' };
    }
    return { active: false, reason: 'trial_expired' };
  }

  if (status === 'past_due') return { active: false, reason: 'past_due' };
  if (status === 'canceled') return { active: false, reason: 'canceled' };

  return { active: false, reason: 'no_subscription' };
}
