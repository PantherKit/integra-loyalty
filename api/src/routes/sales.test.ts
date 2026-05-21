import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests del router /admin/sales. Inyectamos un middleware fake en lugar de
 * requireTenant para evitar JWT real; el rol del caller se pasa via header
 * x-fake-role para los tests.
 */

const ctx = { role: '', userId: '' };

vi.mock('../middleware/tenant', async () => {
  const actual = await vi.importActual<typeof import('../middleware/tenant')>(
    '../middleware/tenant'
  );
  return {
    ...actual,
    requireTenant: async (c: any, next: any) => {
      c.set('tenantId', 'INTEGRA');
      c.set('userId', ctx.userId || 'caller-1');
      c.set('userEmail', 'caller@integra.local');
      c.set('userRole', ctx.role);
      await next();
    },
  };
});

const createCognitoMock = vi.fn();
vi.mock('../lib/cognito', () => ({
  createCognitoUser: (...a: unknown[]) => createCognitoMock(...a),
}));

const userRepo = {
  getUser: vi.fn(),
  listIntegraUsers: vi.fn(),
  listSalesRepsByAdmin: vi.fn(),
  putUser: vi.fn(),
};
vi.mock('../lib/repositories/user', () => userRepo);

const merchantRepo = {
  assignRepToMerchant: vi.fn(),
  getMerchantByTenant: vi.fn(),
  listMerchantsByRep: vi.fn(),
};
vi.mock('../lib/repositories/merchant', () => merchantRepo);

beforeEach(() => {
  createCognitoMock.mockReset();
  Object.values(userRepo).forEach((m) => m.mockReset());
  Object.values(merchantRepo).forEach((m) => m.mockReset());
  ctx.role = '';
  ctx.userId = '';
});

async function loadApp() {
  const mod = await import('./sales');
  return mod.sales;
}

describe('POST /admin/sales/reps', () => {
  it('sales_admin crea rep auto-vinculado a sí mismo', async () => {
    ctx.role = 'sales_admin';
    ctx.userId = 'admin-A';
    createCognitoMock.mockResolvedValueOnce({ cognitoSub: 'rep-sub-1' });
    userRepo.putUser.mockResolvedValueOnce({
      userId: 'rep-sub-1',
      email: 'd@i.local',
      salesAdminId: 'admin-A',
    });

    const app = await loadApp();
    const res = await app.request('/reps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'd@i.local' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.rep.salesAdminId).toBe('admin-A');
    expect(body.tempPassword).toBeTruthy();
    // putUser fue llamado con salesAdminId = admin-A (no del body)
    expect(userRepo.putUser).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'sales_rep', salesAdminId: 'admin-A' })
    );
  });

  it('sales_rep recibe 403 al intentar crear rep', async () => {
    ctx.role = 'sales_rep';
    ctx.userId = 'rep-X';

    const app = await loadApp();
    const res = await app.request('/reps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'd@i.local' }),
    });
    expect(res.status).toBe(403);
  });

  it('integra_admin debe pasar salesAdminId explícito', async () => {
    ctx.role = 'integra_admin';
    ctx.userId = 'jorge';

    const app = await loadApp();
    const res = await app.request('/reps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'd@i.local' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /admin/sales/reps', () => {
  it('sales_admin recibe solo sus reps', async () => {
    ctx.role = 'sales_admin';
    ctx.userId = 'admin-A';
    userRepo.listSalesRepsByAdmin.mockResolvedValueOnce([
      { userId: 'r1', email: 'a@b', role: 'sales_rep', salesAdminId: 'admin-A' },
      { userId: 'r2', email: 'c@d', role: 'sales_rep', salesAdminId: 'admin-A' },
    ]);

    const app = await loadApp();
    const res = await app.request('/reps');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.reps).toHaveLength(2);
    expect(userRepo.listSalesRepsByAdmin).toHaveBeenCalledWith('admin-A');
  });

  it('sales_rep recibe 403', async () => {
    ctx.role = 'sales_rep';
    ctx.userId = 'r1';

    const app = await loadApp();
    const res = await app.request('/reps');
    expect(res.status).toBe(403);
  });

  it('integra_admin sin filtro lista todos los reps', async () => {
    ctx.role = 'integra_admin';
    ctx.userId = 'jorge';
    userRepo.listIntegraUsers.mockResolvedValueOnce([
      { userId: 'r1', role: 'sales_rep', salesAdminId: 'admin-A' },
      { userId: 'r2', role: 'sales_rep', salesAdminId: 'admin-B' },
      { userId: 'admin-A', role: 'sales_admin' },
    ]);

    const app = await loadApp();
    const res = await app.request('/reps');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.reps.map((r: any) => r.userId).sort()).toEqual(['r1', 'r2']);
  });
});

describe('GET /admin/sales/reps/:repId — visibility', () => {
  it('sales_admin pidiendo rep ajeno recibe 404 (no 403, para no filtrar existencia)', async () => {
    ctx.role = 'sales_admin';
    ctx.userId = 'admin-A';
    userRepo.getUser.mockResolvedValueOnce({
      userId: 'r-other',
      role: 'sales_rep',
      salesAdminId: 'admin-B',
    });

    const app = await loadApp();
    const res = await app.request('/reps/r-other');
    expect(res.status).toBe(404);
  });
});

describe('POST /admin/sales/merchants/:merchantId/assign', () => {
  it('sales_admin no puede asignar a rep ajeno', async () => {
    ctx.role = 'sales_admin';
    ctx.userId = 'admin-A';
    userRepo.listSalesRepsByAdmin.mockResolvedValueOnce([
      { userId: 'r-own', role: 'sales_rep', salesAdminId: 'admin-A' },
    ]);

    const app = await loadApp();
    const res = await app.request('/merchants/tenant-1/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ salesRepId: 'r-foreign' }),
    });
    expect(res.status).toBe(403);
  });

  it('integra_admin asigna a cualquier rep', async () => {
    ctx.role = 'integra_admin';
    ctx.userId = 'jorge';
    merchantRepo.getMerchantByTenant.mockResolvedValueOnce({ tenantId: 'tenant-1' });
    merchantRepo.assignRepToMerchant.mockResolvedValueOnce({
      tenantId: 'tenant-1',
      salesRepId: 'r-any',
    });

    const app = await loadApp();
    const res = await app.request('/merchants/tenant-1/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ salesRepId: 'r-any' }),
    });
    expect(res.status).toBe(200);
  });
});
