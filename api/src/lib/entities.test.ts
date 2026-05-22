import { describe, it, expect } from 'vitest';
import { UserSchema, MerchantSchema, INTEGRA_TENANT_ID } from './entities';

const baseUser = {
  type: 'USER' as const,
  userId: 'sub-123',
  email: 'a@b.com',
  cognitoSub: 'sub-123',
  createdAt: '2026-05-20T00:00:00.000Z',
};

describe('UserSchema — Sales Org roles (modelo de 2 roles)', () => {
  it('acepta integra_admin raíz (tenantId INTEGRA, sin createdBy)', () => {
    const parsed = UserSchema.parse({
      ...baseUser,
      tenantId: INTEGRA_TENANT_ID,
      role: 'integra_admin',
    });
    expect(parsed.role).toBe('integra_admin');
    expect(parsed.createdBy).toBeUndefined();
  });

  it('acepta sales_rep con createdBy (quién lo creó)', () => {
    const parsed = UserSchema.parse({
      ...baseUser,
      tenantId: INTEGRA_TENANT_ID,
      role: 'sales_rep',
      createdBy: 'admin-sub-456',
    });
    expect(parsed.role).toBe('sales_rep');
    expect(parsed.createdBy).toBe('admin-sub-456');
  });

  it('acepta integra_admin con createdBy (admin creado por otro admin)', () => {
    const parsed = UserSchema.parse({
      ...baseUser,
      tenantId: INTEGRA_TENANT_ID,
      role: 'integra_admin',
      createdBy: 'admin-raiz',
    });
    expect(parsed.createdBy).toBe('admin-raiz');
  });

  it('rechaza el rol sales_admin eliminado', () => {
    const res = UserSchema.safeParse({
      ...baseUser,
      tenantId: INTEGRA_TENANT_ID,
      role: 'sales_admin',
    });
    expect(res.success).toBe(false);
  });

  it('acepta merchant-side users con tenantId UUID', () => {
    const parsed = UserSchema.parse({
      ...baseUser,
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'owner',
    });
    expect(parsed.role).toBe('owner');
  });

  it('rechaza tenantId que no es UUID ni INTEGRA', () => {
    const res = UserSchema.safeParse({
      ...baseUser,
      tenantId: 'not-uuid-not-integra',
      role: 'owner',
    });
    expect(res.success).toBe(false);
  });
});

describe('MerchantSchema — salesRepId', () => {
  const baseMerchant = {
    type: 'MERCHANT' as const,
    tenantId: '550e8400-e29b-41d4-a716-446655440000',
    slug: 'marquesitas-omo',
    name: 'Marquesitas OMO',
    industry: 'cafe' as const,
    createdAt: '2026-05-20T00:00:00.000Z',
    updatedAt: '2026-05-20T00:00:00.000Z',
  };

  it('acepta merchant sin salesRepId (legacy)', () => {
    const parsed = MerchantSchema.parse(baseMerchant);
    expect(parsed.salesRepId).toBeUndefined();
  });

  it('acepta merchant con salesRepId string', () => {
    const parsed = MerchantSchema.parse({
      ...baseMerchant,
      salesRepId: 'rep-sub-789',
    });
    expect(parsed.salesRepId).toBe('rep-sub-789');
  });

  it('acepta merchant con salesRepId = null (desasignación explícita)', () => {
    const parsed = MerchantSchema.parse({
      ...baseMerchant,
      salesRepId: null,
    });
    expect(parsed.salesRepId).toBeNull();
  });
});
