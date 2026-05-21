import { describe, it, expect } from 'vitest';
import { classify, MerchantContext } from './rules';

function ctx(over: Partial<MerchantContext>): MerchantContext {
  return {
    merchant: {
      type: 'MERCHANT',
      tenantId: 't-1',
      slug: 'm',
      name: 'Demo',
      industry: 'cafe',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      ...over.merchant,
    } as any,
    tenant: over.tenant ?? null,
    cardsCount: over.cardsCount ?? 0,
    cardsLast30d: over.cardsLast30d ?? 0,
  };
}

describe('classify', () => {
  it('past_due → churn_risk score 95', () => {
    const cls = classify(ctx({ tenant: { subscriptionStatus: 'past_due' } as any }));
    expect(cls.signal).toBe('churn_risk');
    expect(cls.score).toBe(95);
  });

  it('canceled → churn_risk score 85', () => {
    const cls = classify(ctx({ tenant: { subscriptionStatus: 'canceled' } as any }));
    expect(cls.signal).toBe('churn_risk');
    expect(cls.score).toBe(85);
  });

  it('stale 30 días sin cards → dormant', () => {
    const cls = classify(
      ctx({
        merchant: {
          updatedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        } as any,
        tenant: { subscriptionStatus: 'active' } as any,
        cardsLast30d: 0,
      })
    );
    expect(cls.signal).toBe('dormant');
    expect(cls.score).toBeGreaterThanOrEqual(60);
  });

  it('trial reciente sin cards → new_lead_followup', () => {
    const cls = classify(
      ctx({
        merchant: {
          updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        } as any,
        tenant: { subscriptionStatus: 'trialing' } as any,
        cardsCount: 0,
      })
    );
    expect(cls.signal).toBe('new_lead_followup');
  });

  it('basico con 50 cards/mes → upsell_opportunity', () => {
    const cls = classify(
      ctx({
        tenant: { subscriptionStatus: 'active', billingPlan: 'basico' } as any,
        cardsLast30d: 50,
      })
    );
    expect(cls.signal).toBe('upsell_opportunity');
  });

  it('comercio sano sin patrón → signal null', () => {
    const cls = classify(
      ctx({
        tenant: { subscriptionStatus: 'active', billingPlan: 'pro' } as any,
        cardsLast30d: 5,
      })
    );
    expect(cls.signal).toBeNull();
    expect(cls.score).toBe(0);
  });
});
