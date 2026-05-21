import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests de la atribución de venta sobre Merchant:
 *  - listMerchantsByRep: Scan con FilterExpression — verifica que se arme
 *    el filtro correcto y que devuelva los Items recibidos.
 *  - assignRepToMerchant: Update con condición attribute_exists; null = desasignar.
 */

const sendMock = vi.fn();
vi.mock('../ddb', () => ({
  ddb: { send: (...args: unknown[]) => sendMock(...args) },
  TABLE_NAME: 'mock-table',
}));

beforeEach(() => {
  sendMock.mockReset();
});

describe('listMerchantsByRep', () => {
  it('arma Scan con type=MERCHANT y salesRepId=rep dado, devuelve Items', async () => {
    const { listMerchantsByRep } = await import('./merchant');

    sendMock.mockResolvedValueOnce({
      Items: [
        { type: 'MERCHANT', tenantId: 't-1', salesRepId: 'rep-1', name: 'A' },
        { type: 'MERCHANT', tenantId: 't-2', salesRepId: 'rep-1', name: 'B' },
      ],
    });

    const out = await listMerchantsByRep('rep-1');
    expect(out).toHaveLength(2);

    const call = sendMock.mock.calls[0][0];
    expect(call.input.FilterExpression).toContain('salesRepId = :rep');
    expect(call.input.ExpressionAttributeValues).toMatchObject({
      ':type': 'MERCHANT',
      ':rep': 'rep-1',
    });
  });
});

describe('assignRepToMerchant', () => {
  it('persiste salesRepId del rep dado y actualiza updatedAt', async () => {
    const { assignRepToMerchant } = await import('./merchant');

    sendMock.mockResolvedValueOnce({
      Attributes: {
        type: 'MERCHANT',
        tenantId: 't-1',
        salesRepId: 'rep-2',
        slug: 's',
        name: 'M',
        industry: 'cafe',
        createdAt: '2026-05-20T00:00:00.000Z',
        updatedAt: '2026-05-20T01:00:00.000Z',
      },
    });

    const out = await assignRepToMerchant('t-1', 'rep-2');
    expect(out.salesRepId).toBe('rep-2');

    const call = sendMock.mock.calls[0][0];
    expect(call.input.UpdateExpression).toContain('salesRepId = :rep');
    expect(call.input.ExpressionAttributeValues[':rep']).toBe('rep-2');
    expect(call.input.ConditionExpression).toContain('attribute_exists');
  });

  it('acepta null para desasignar', async () => {
    const { assignRepToMerchant } = await import('./merchant');

    sendMock.mockResolvedValueOnce({
      Attributes: {
        type: 'MERCHANT',
        tenantId: 't-1',
        salesRepId: null,
        slug: 's',
        name: 'M',
        industry: 'cafe',
        createdAt: '2026-05-20T00:00:00.000Z',
        updatedAt: '2026-05-20T01:00:00.000Z',
      },
    });

    const out = await assignRepToMerchant('t-1', null);
    expect(out.salesRepId).toBeNull();

    const call = sendMock.mock.calls[0][0];
    expect(call.input.ExpressionAttributeValues[':rep']).toBeNull();
  });
});
