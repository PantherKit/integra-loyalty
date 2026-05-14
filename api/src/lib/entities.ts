import { z } from 'zod';

// =============================================================================
// Tenant
// =============================================================================

export const TenantSchema = z.object({
  type: z.literal('TENANT'),
  tenantId: z.string().uuid(),
  plan: z.enum(['free', 'pro', 'enterprise']).default('free'),
  status: z.enum(['active', 'suspended', 'cancelled']).default('active'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Tenant = z.infer<typeof TenantSchema>;

// =============================================================================
// Merchant
// =============================================================================

export const Industry = z.enum(['cafe', 'restaurant', 'salon', 'retail', 'other']);
export type Industry = z.infer<typeof Industry>;

export const AddressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().default('MX'),
});

export const MerchantSchema = z.object({
  type: z.literal('MERCHANT'),
  tenantId: z.string().uuid(),
  name: z.string().min(2).max(120),
  industry: Industry,
  address: AddressSchema.optional(),
  phone: z.string().regex(/^\+\d{10,15}$/).optional(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Merchant = z.infer<typeof MerchantSchema>;

// =============================================================================
// User
// =============================================================================

export const UserSchema = z.object({
  type: z.literal('USER'),
  tenantId: z.string().uuid(),
  userId: z.string(), // Cognito sub
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'staff']).default('owner'),
  cognitoSub: z.string(),
  createdAt: z.string().datetime(),
  lastLoginAt: z.string().datetime().nullable().default(null),
});
export type User = z.infer<typeof UserSchema>;

// =============================================================================
// Inputs (para endpoints)
// =============================================================================

export const CreateTenantInput = z.object({
  email: z.string().email(),
  merchantName: z.string().min(2).max(120),
  industry: Industry,
});
export type CreateTenantInput = z.infer<typeof CreateTenantInput>;

export const UpdateMerchantInput = MerchantSchema.pick({
  name: true,
  industry: true,
  address: true,
  phone: true,
  brandColor: true,
}).partial();
export type UpdateMerchantInput = z.infer<typeof UpdateMerchantInput>;
