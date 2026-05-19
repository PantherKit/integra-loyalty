import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * POST /programs debe responder 402 subscription_required cuando el tenant
 * NO tiene entitlement (prueba vencida / sin suscripción), ANTES de tocar
 * la creación del programa.
 *
 * Mocks simples:
 *  - middleware/tenant: requireTenant inyecta tenantId+rol owner (sin JWT real)
 *  - repositories/tenant: getTenant devuelve el tenant simulado
 *  - repositories/program: createProgram no debe llamarse si hay 402
 */

const getTenantMock = vi.fn();
const createProgramMock = vi.fn();

// tenantId distinto por test: el paywall cachea por tenantId 30s, así
// evitamos que el segundo test reuse el tenant cacheado del primero.
const ctxTenant = { id: 'tenant-1' };

vi.mock('../middleware/tenant', async () => {
  const actual = await vi.importActual<typeof import('../middleware/tenant')>(
    '../middleware/tenant'
  );
  return {
    ...actual,
    requireTenant: async (c: any, next: any) => {
      c.set('tenantId', ctxTenant.id);
      c.set('userId', 'user-1');
      c.set('userEmail', 'a@b.com');
      c.set('userRole', 'owner');
      await next();
    },
  };
});

vi.mock('../lib/repositories/tenant', () => ({
  getTenant: (...args: unknown[]) => getTenantMock(...args),
}));

vi.mock('../lib/repositories/program', () => ({
  createProgram: (...args: unknown[]) => createProgramMock(...args),
  listProgramsByTenant: vi.fn(),
  getProgram: vi.fn(),
}));

const validBody = JSON.stringify({
  name: 'Café gratis',
  stampsRequired: 7,
  rewardType: 'free_item',
  rewardDetail: 'Café americano gratis',
});

describe('POST /programs — paywall', () => {
  beforeEach(() => {
    getTenantMock.mockReset();
    createProgramMock.mockReset();
  });

  it('devuelve 402 subscription_required con prueba vencida y NO crea programa', async () => {
    ctxTenant.id = 'tenant-expired';
    getTenantMock.mockResolvedValue({
      tenantId: 'tenant-expired',
      subscriptionStatus: 'trialing',
      trialEndsAt: new Date(Date.now() - 86400000).toISOString(),
    });
    const { programs } = await import('./programs');
    const res = await programs.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: validBody,
    });
    expect(res.status).toBe(402);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe('subscription_required');
    expect(createProgramMock).not.toHaveBeenCalled();
  });

  it('deja crear el programa con prueba vigente', async () => {
    ctxTenant.id = 'tenant-active';
    getTenantMock.mockResolvedValue({
      tenantId: 'tenant-active',
      subscriptionStatus: 'trialing',
      trialEndsAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    });
    createProgramMock.mockResolvedValue({ programId: 'p-1', name: 'Café gratis' });
    const { programs } = await import('./programs');
    const res = await programs.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: validBody,
    });
    expect(res.status).toBe(201);
    expect(createProgramMock).toHaveBeenCalledOnce();
  });
});
