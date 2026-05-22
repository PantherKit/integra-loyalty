import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests del router /admin/sales — modelo de 2 roles (integra_admin / sales_rep)
 * con visibilidad por subárbol (createdBy).
 *
 * Árbol de prueba (listIntegraUsers mock):
 *   raiz   (integra_admin, createdBy null)
 *     ├── adminB (integra_admin, createdBy raiz)
 *     ├── rep1   (sales_rep,    createdBy raiz)
 *     └── rep2   (sales_rep,    createdBy raiz)
 *   adminB no creó a nadie → su subárbol está vacío.
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
      c.set('userId', ctx.userId || 'raiz');
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
  listIntegraUsers: vi.fn(),
  putUser: vi.fn(),
};
vi.mock('../lib/repositories/user', () => userRepo);

const merchantRepo = {
  assignRepToMerchant: vi.fn(),
  getMerchantByTenant: vi.fn(),
  listMerchantsByRep: vi.fn(),
};
vi.mock('../lib/repositories/merchant', () => merchantRepo);

vi.mock('../lib/repositories/tenant', () => ({
  createTenant: vi.fn(),
}));

const TREE = [
  { type: 'USER', userId: 'adminB', email: 'b@i', role: 'integra_admin', createdBy: 'raiz' },
  { type: 'USER', userId: 'rep1', email: 'r1@i', role: 'sales_rep', createdBy: 'raiz' },
  { type: 'USER', userId: 'rep2', email: 'r2@i', role: 'sales_rep', createdBy: 'raiz' },
];

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
  it('integra_admin crea vendedor con createdBy = caller', async () => {
    ctx.role = 'integra_admin';
    ctx.userId = 'raiz';
    createCognitoMock.mockResolvedValueOnce({ cognitoSub: 'rep-new' });
    userRepo.putUser.mockResolvedValueOnce({
      userId: 'rep-new',
      email: 'd@i.local',
      createdBy: 'raiz',
      createdAt: 'x',
      lastLoginAt: null,
    });

    const app = await loadApp();
    const res = await app.request('/reps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'd@i.local' }),
    });
    expect(res.status).toBe(201);
    expect(userRepo.putUser).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'sales_rep', createdBy: 'raiz' })
    );
  });

  it('sales_rep recibe 403', async () => {
    ctx.role = 'sales_rep';
    ctx.userId = 'rep1';
    const app = await loadApp();
    const res = await app.request('/reps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'd@i.local' }),
    });
    expect(res.status).toBe(403);
  });
});

describe('POST /admin/sales/admins', () => {
  it('integra_admin crea otro admin con createdBy = caller', async () => {
    ctx.role = 'integra_admin';
    ctx.userId = 'raiz';
    createCognitoMock.mockResolvedValueOnce({ cognitoSub: 'admin-new' });
    userRepo.putUser.mockResolvedValueOnce({
      userId: 'admin-new',
      email: 'max@i.local',
      createdBy: 'raiz',
      createdAt: 'x',
      lastLoginAt: null,
    });

    const app = await loadApp();
    const res = await app.request('/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'max@i.local' }),
    });
    expect(res.status).toBe(201);
    expect(userRepo.putUser).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'integra_admin', createdBy: 'raiz' })
    );
  });

  it('sales_rep recibe 403', async () => {
    ctx.role = 'sales_rep';
    ctx.userId = 'rep1';
    const app = await loadApp();
    const res = await app.request('/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'x@i.local' }),
    });
    expect(res.status).toBe(403);
  });
});

describe('GET /admin/sales/reps — visibilidad por subárbol', () => {
  it('raiz ve los vendedores de su subárbol', async () => {
    ctx.role = 'integra_admin';
    ctx.userId = 'raiz';
    userRepo.listIntegraUsers.mockResolvedValueOnce(TREE);

    const app = await loadApp();
    const res = await app.request('/reps');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.reps.map((r: any) => r.userId).sort()).toEqual(['rep1', 'rep2']);
  });

  it('adminB sin subárbol no ve ningún vendedor', async () => {
    ctx.role = 'integra_admin';
    ctx.userId = 'adminB';
    userRepo.listIntegraUsers.mockResolvedValueOnce(TREE);

    const app = await loadApp();
    const res = await app.request('/reps');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.reps).toEqual([]);
  });

  it('sales_rep recibe 403', async () => {
    ctx.role = 'sales_rep';
    ctx.userId = 'rep1';
    const app = await loadApp();
    const res = await app.request('/reps');
    expect(res.status).toBe(403);
  });
});

describe('GET /admin/sales/admins — visibilidad por subárbol', () => {
  it('raiz ve los admins de su subárbol', async () => {
    ctx.role = 'integra_admin';
    ctx.userId = 'raiz';
    userRepo.listIntegraUsers.mockResolvedValueOnce(TREE);

    const app = await loadApp();
    const res = await app.request('/admins');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.admins.map((a: any) => a.userId)).toEqual(['adminB']);
  });
});

describe('POST /admin/sales/merchants/:merchantId/assign', () => {
  it('rechaza asignar a un vendedor fuera del subárbol', async () => {
    ctx.role = 'integra_admin';
    ctx.userId = 'raiz';
    userRepo.listIntegraUsers.mockResolvedValueOnce(TREE);

    const app = await loadApp();
    const res = await app.request('/merchants/tenant-1/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ salesRepId: 'rep-foreign' }),
    });
    expect(res.status).toBe(403);
  });

  it('asigna a un vendedor del subárbol', async () => {
    ctx.role = 'integra_admin';
    ctx.userId = 'raiz';
    userRepo.listIntegraUsers.mockResolvedValueOnce(TREE);
    merchantRepo.getMerchantByTenant.mockResolvedValueOnce({ tenantId: 'tenant-1' });
    merchantRepo.assignRepToMerchant.mockResolvedValueOnce({
      tenantId: 'tenant-1',
      salesRepId: 'rep1',
    });

    const app = await loadApp();
    const res = await app.request('/merchants/tenant-1/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ salesRepId: 'rep1' }),
    });
    expect(res.status).toBe(200);
  });

  it('sales_rep recibe 403', async () => {
    ctx.role = 'sales_rep';
    ctx.userId = 'rep1';
    const app = await loadApp();
    const res = await app.request('/merchants/tenant-1/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ salesRepId: 'rep1' }),
    });
    expect(res.status).toBe(403);
  });
});

describe('GET /admin/sales/kpis/me', () => {
  it('integra_admin sin subárbol recibe totales en cero', async () => {
    ctx.role = 'integra_admin';
    ctx.userId = 'adminB';
    userRepo.listIntegraUsers.mockResolvedValueOnce(TREE);

    const app = await loadApp();
    const res = await app.request('/kpis/me');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.repsCount).toBe(0);
    expect(body.mrrMxn).toBe(0);
  });
});
