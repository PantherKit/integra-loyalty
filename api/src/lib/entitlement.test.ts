import { describe, it, expect } from 'vitest';
import { entitlement } from './entitlement';

const future = () => new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();
const past = () => new Date(Date.now() - 24 * 3600 * 1000).toISOString();

describe('entitlement', () => {
  it('trial vigente -> activo', () => {
    const r = entitlement({ subscriptionStatus: 'trialing', trialEndsAt: future() });
    expect(r.active).toBe(true);
    expect(r.reason).toBe('trialing');
  });

  it('trial vencido -> bloqueado', () => {
    const r = entitlement({ subscriptionStatus: 'trialing', trialEndsAt: past() });
    expect(r.active).toBe(false);
    expect(r.reason).toBe('trial_expired');
  });

  it('suscripción active -> activo (sin importar trialEndsAt)', () => {
    const r = entitlement({ subscriptionStatus: 'active', trialEndsAt: past() });
    expect(r.active).toBe(true);
    expect(r.reason).toBe('active');
  });

  it('past_due -> bloqueado', () => {
    const r = entitlement({ subscriptionStatus: 'past_due' });
    expect(r.active).toBe(false);
    expect(r.reason).toBe('past_due');
  });

  it('canceled -> bloqueado', () => {
    const r = entitlement({ subscriptionStatus: 'canceled' });
    expect(r.active).toBe(false);
    expect(r.reason).toBe('canceled');
  });

  it('tenant sin suscripción / null -> bloqueado', () => {
    expect(entitlement(null).active).toBe(false);
    expect(entitlement(undefined).reason).toBe('no_subscription');
    expect(entitlement({}).reason).toBe('no_subscription');
  });

  it('trialing sin trialEndsAt -> bloqueado (no se asume prueba infinita)', () => {
    const r = entitlement({ subscriptionStatus: 'trialing' });
    expect(r.active).toBe(false);
    expect(r.reason).toBe('trial_expired');
  });
});
