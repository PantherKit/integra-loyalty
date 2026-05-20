import { describe, it, expect, vi } from 'vitest';
import { requireRole, MERCHANT_ROLES } from './tenant';

/**
 * Tests de los guards de seguridad C2 (requireRole).
 * Cubren el hallazgo: un token sin rol de comercio no debe operar el back office.
 */

function fakeCtx(role: string | undefined) {
  const json = vi.fn((body: unknown, status?: number) => ({ body, status }));
  return {
    ctx: { get: (k: string) => (k === 'userRole' ? role : undefined), json } as never,
    json,
  };
}

describe('requireRole (C2)', () => {
  it('rechaza con 403 un rol no permitido (p.ej. end_customer)', async () => {
    const { ctx, json } = fakeCtx('end_customer');
    const next = vi.fn();
    await requireRole(...MERCHANT_ROLES)(ctx, next);
    expect(next).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'forbidden' }),
      403
    );
  });

  it('rechaza con 403 cuando NO hay rol en el token', async () => {
    const { ctx, json } = fakeCtx(undefined);
    const next = vi.fn();
    await requireRole(...MERCHANT_ROLES)(ctx, next);
    expect(next).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(expect.anything(), 403);
  });

  it('deja pasar al rol owner (merchant creado por signup)', async () => {
    const { ctx } = fakeCtx('owner');
    const next = vi.fn();
    await requireRole(...MERCHANT_ROLES)(ctx, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('MERCHANT_ROLES incluye owner y excluye end_customer', () => {
    expect(MERCHANT_ROLES).toContain('owner');
    expect(MERCHANT_ROLES).not.toContain('end_customer');
  });
});
