import { describe, it, expect, vi, beforeEach } from 'vitest';

const cardRepo = { countCardsByTenant: vi.fn() };
const merchantRepo = { listMerchantsByRep: vi.fn() };
const tenantRepo = { getTenant: vi.fn() };

vi.mock('../repositories/card', () => cardRepo);
vi.mock('../repositories/merchant', () => merchantRepo);
vi.mock('../repositories/tenant', () => tenantRepo);

beforeEach(async () => {
  cardRepo.countCardsByTenant.mockReset();
  merchantRepo.listMerchantsByRep.mockReset();
  tenantRepo.getTenant.mockReset();
  const { clearPrioritiesCache } = await import('./index');
  clearPrioritiesCache();
});

describe('computePriorities', () => {
  it('omite merchants sanos y ordena el resto por score descendente', async () => {
    merchantRepo.listMerchantsByRep.mockResolvedValueOnce([
      // m1: past_due → churn 95
      {
        tenantId: 'm1',
        name: 'Coyote',
        industry: 'retail',
        updatedAt: new Date().toISOString(),
      },
      // m2: sano (skip)
      {
        tenantId: 'm2',
        name: 'Healthy',
        industry: 'cafe',
        updatedAt: new Date().toISOString(),
      },
      // m3: basico con muchas cards → upsell 75
      {
        tenantId: 'm3',
        name: 'BigVol',
        industry: 'restaurant',
        updatedAt: new Date().toISOString(),
      },
    ]);
    tenantRepo.getTenant
      .mockResolvedValueOnce({ subscriptionStatus: 'past_due' })
      .mockResolvedValueOnce({ subscriptionStatus: 'active', billingPlan: 'pro' })
      .mockResolvedValueOnce({ subscriptionStatus: 'active', billingPlan: 'basico' });
    cardRepo.countCardsByTenant
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(3) // m1: count + last30d
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(5) // m2
      .mockResolvedValueOnce(60)
      .mockResolvedValueOnce(50); // m3

    const { computePriorities } = await import('./index');
    const p = await computePriorities('rep-1');
    expect(p.map((pp) => pp.merchantId)).toEqual(['m1', 'm3']);
    expect(p[0].score).toBeGreaterThan(p[1].score);
  });

  it('cache hit no vuelve a llamar a los repos', async () => {
    merchantRepo.listMerchantsByRep.mockResolvedValueOnce([]);

    const { computePriorities } = await import('./index');
    await computePriorities('rep-X');
    expect(merchantRepo.listMerchantsByRep).toHaveBeenCalledTimes(1);

    await computePriorities('rep-X');
    expect(merchantRepo.listMerchantsByRep).toHaveBeenCalledTimes(1); // cache hit
  });

  it('fresh=true salta cache', async () => {
    merchantRepo.listMerchantsByRep.mockResolvedValue([]);

    const { computePriorities } = await import('./index');
    await computePriorities('rep-Y');
    await computePriorities('rep-Y', { fresh: true });
    expect(merchantRepo.listMerchantsByRep).toHaveBeenCalledTimes(2);
  });
});
