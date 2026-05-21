import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests del filtrado en aplicación de listSalesRepsByAdmin. El mock devuelve
 * un set mezclado de users Integra-side y verificamos que solo retornen los
 * reps cuyo salesAdminId coincide.
 */

const sendMock = vi.fn();
vi.mock('../ddb', () => ({
  ddb: { send: (...args: unknown[]) => sendMock(...args) },
  TABLE_NAME: 'mock-table',
}));

beforeEach(() => {
  sendMock.mockReset();
});

describe('listSalesRepsByAdmin', () => {
  it('retorna solo sales_rep cuyo salesAdminId coincide', async () => {
    const { listSalesRepsByAdmin } = await import('./user');

    sendMock.mockResolvedValueOnce({
      Items: [
        { type: 'USER', role: 'sales_admin', userId: 'admin-A' },
        { type: 'USER', role: 'sales_rep', userId: 'rep-1', salesAdminId: 'admin-A' },
        { type: 'USER', role: 'sales_rep', userId: 'rep-2', salesAdminId: 'admin-B' },
        { type: 'USER', role: 'sales_rep', userId: 'rep-3', salesAdminId: 'admin-A' },
        { type: 'USER', role: 'integra_admin', userId: 'jorge' },
      ],
    });

    const reps = await listSalesRepsByAdmin('admin-A');
    expect(reps.map((r) => r.userId)).toEqual(['rep-1', 'rep-3']);
  });

  it('retorna array vacío cuando no hay reps del admin', async () => {
    const { listSalesRepsByAdmin } = await import('./user');

    sendMock.mockResolvedValueOnce({
      Items: [{ type: 'USER', role: 'sales_admin', userId: 'admin-X' }],
    });

    const reps = await listSalesRepsByAdmin('admin-X');
    expect(reps).toEqual([]);
  });
});
