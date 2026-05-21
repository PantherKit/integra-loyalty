import { describe, it, expect } from 'vitest';
import { UserSchema, MerchantSchema, INTEGRA_TENANT_ID } from './entities';

const baseUser = {
  type: 'USER' as const,
  userId: 'sub-123',
  email: 'a@b.com',
  cognitoSub: 'sub-123',
  createdAt: '2026-05-20T00:00:00.000Z',
};

describe('UserSchema — Sales Org roles', () => {
  it('acepta sales_admin con tenantId = INTEGRA y sin salesAdminId', () => {
    const parsed = UserSchema.parse({
      ...baseUser,
      tenantId: INTEGRA_TENANT_ID,
      role: 'sales_admin',
    });
    expect(parsed.role).toBe('sales_admin');
    expect(parsed.salesAdminId).toBeUndefined();
  });

  it('rechaza sales_rep cuando falta salesAdminId', () => {
    const res = UserSchema.safeParse({
      ...baseUser,
      tenantId: INTEGRA_TENANT_ID,
      role: 'sales_rep',
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].path).toContain('salesAdminId');
    }
  });

  it('acepta sales_rep con salesAdminId presente', () => {
    const parsed = UserSchema.parse({
      ...baseUser,
      tenantId: INTEGRA_TENANT_ID,
      role: 'sales_rep',
      salesAdminId: 'admin-sub-456',
    });
    expect(parsed.role).toBe('sales_rep');
    expect(parsed.salesAdminId).toBe('admin-sub-456');
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
