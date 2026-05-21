import { describe, it, expect, vi, beforeEach } from 'vitest';

const cardRepo = { countCardsByTenant: vi.fn() };
const merchantRepo = { listMerchantsByRep: vi.fn() };
const userRepo = { listSalesRepsByAdmin: vi.fn(), listIntegraUsers: vi.fn() };
const tenantRepo = { getTenant: vi.fn() };

vi.mock('./repositories/card', () => cardRepo);
vi.mock('./repositories/merchant', () => merchantRepo);
vi.mock('./repositories/user', () => userRepo);
vi.mock('./repositories/tenant', () => tenantRepo);

beforeEach(() => {
  cardRepo.countCardsByTenant.mockReset();
  merchantRepo.listMerchantsByRep.mockReset();
  userRepo.listSalesRepsByAdmin.mockReset();
  userRepo.listIntegraUsers.mockReset();
  tenantRepo.getTenant.mockReset();
});

describe('windowToSinceIso', () => {
  it('all → undefined; 7d/30d/90d → ISO en el pasado', async () => {
    const { windowToSinceIso } = await import('./sales-kpi');
    expect(windowToSinceIso('all')).toBeUndefined();
    expect(new Date(windowToSinceIso('7d')!).getTime()).toBeLessThan(Date.now());
    expect(new Date(windowToSinceIso('90d')!).getTime()).toBeLessThan(
      new Date(windowToSinceIso('30d')!).getTime()
    );
  });
});

describe('computeRepKpi', () => {
  it('agrega counts y MRR de los merchants del rep', async () => {
    merchantRepo.listMerchantsByRep.mockResolvedValueOnce([
      { tenantId: 't-1', updatedAt: new Date().toISOString() },
      { tenantId: 't-2', updatedAt: new Date().toISOString() },
    ]);
    // Por merchant: countCardsByTenant llamado 2× (issued + active)
    cardRepo.countCardsByTenant
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(4);
    tenantRepo.getTenant
      .mockResolvedValueOnce({
        subscriptionStatus: 'active',
        billingPlan: 'pro',
        updatedAt: new Date().toISOString(),
      })
      .mockResolvedValueOnce({
        subscriptionStatus: 'active',
        billingPlan: 'basico',
        updatedAt: new Date().toISOString(),
      });

    const { computeRepKpi } = await import('./sales-kpi');
    const kpi = await computeRepKpi({ userId: 'rep-1', email: 'r@i.local' }, '30d');
    expect(kpi.merchantsCount).toBe(2);
    expect(kpi.cardsIssuedCount).toBe(15); // 10 + 5
    expect(kpi.cardsActiveCount).toBe(12); // 8 + 4
    expect(kpi.mrrMxn).toBe(649 + 349); // pro + basico
    expect(kpi.churnRiskCount).toBe(0);
  });

  it('marca churn cuando subscriptionStatus es past_due', async () => {
    merchantRepo.listMerchantsByRep.mockResolvedValueOnce([
      { tenantId: 't-1', updatedAt: new Date().toISOString() },
    ]);
    cardRepo.countCardsByTenant.mockResolvedValue(0);
    tenantRepo.getTenant.mockResolvedValue({
      subscriptionStatus: 'past_due',
      billingPlan: 'pro',
      updatedAt: new Date().toISOString(),
    });

    const { computeRepKpi } = await import('./sales-kpi');
    const kpi = await computeRepKpi({ userId: 'rep-1', email: 'r@i.local' }, 'all');
    expect(kpi.churnRiskCount).toBe(1);
    expect(kpi.mrrMxn).toBe(0); // past_due no cuenta como active MRR
  });
});

describe('computeAdminKpi', () => {
  it('suma KPIs de todos los reps del admin', async () => {
    userRepo.listSalesRepsByAdmin.mockResolvedValueOnce([
      { userId: 'r1', email: 'a@b', role: 'sales_rep', salesAdminId: 'admin-A' },
      { userId: 'r2', email: 'c@d', role: 'sales_rep', salesAdminId: 'admin-A' },
    ]);
    merchantRepo.listMerchantsByRep
      .mockResolvedValueOnce([{ tenantId: 't-1', updatedAt: new Date().toISOString() }])
      .mockResolvedValueOnce([{ tenantId: 't-2', updatedAt: new Date().toISOString() }]);
    cardRepo.countCardsByTenant.mockResolvedValue(3);
    tenantRepo.getTenant.mockResolvedValue({
      subscriptionStatus: 'active',
      billingPlan: 'basico',
      updatedAt: new Date().toISOString(),
    });

    const { computeAdminKpi } = await import('./sales-kpi');
    const kpi = await computeAdminKpi({ userId: 'admin-A', email: 'a@i.local' });
    expect(kpi.repsCount).toBe(2);
    expect(kpi.merchantsCount).toBe(2);
    expect(kpi.mrrMxn).toBe(349 + 349);
  });
});
