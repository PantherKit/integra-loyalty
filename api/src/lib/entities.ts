import { z } from 'zod';

// =============================================================================
// Tenant
// =============================================================================

// Planes de suscripción de pago (Stripe). Distinto del legacy `plan`
// (free/pro/enterprise) que se conserva por compatibilidad de tenants viejos.
export const BillingPlanSchema = z.enum(['basico', 'pro', 'multi']);
export type BillingPlan = z.infer<typeof BillingPlanSchema>;

export const SubscriptionStatusSchema = z.enum([
  'trialing',
  'active',
  'past_due',
  'canceled',
  'none',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const TenantSchema = z.object({
  type: z.literal('TENANT'),
  tenantId: z.string().uuid(),
  plan: z.enum(['free', 'pro', 'enterprise']).default('free'),
  status: z.enum(['active', 'suspended', 'cancelled']).default('active'),
  // --- Suscripción Stripe (todos opcionales: tenants viejos no los tienen) ---
  subscriptionStatus: SubscriptionStatusSchema.optional(),
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
  // Plan de pago elegido (basico|pro|multi). Independiente de `plan` legacy.
  billingPlan: BillingPlanSchema.optional(),
  trialEndsAt: z.string().datetime().optional(),
  currentPeriodEnd: z.string().datetime().optional(),
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
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(40),
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

// =============================================================================
// LoyaltyProgram (Slice 2A)
// =============================================================================

export const RewardTypeSchema = z.enum(['free_item', 'discount_percent', 'discount_amount', 'custom']);

export const LoyaltyProgramSchema = z.object({
  type: z.literal('PROGRAM'),
  tenantId: z.string().uuid(),
  programId: z.string().uuid(),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  stampsRequired: z.number().int().min(1).max(50).default(7),
  rewardType: RewardTypeSchema,
  rewardDetail: z.string().max(200), // ej. "Café gratis", "20% de descuento", "Postre de la casa"
  status: z.enum(['active', 'paused', 'archived']).default('active'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type LoyaltyProgram = z.infer<typeof LoyaltyProgramSchema>;

export const CreateProgramInput = LoyaltyProgramSchema.pick({
  name: true,
  description: true,
  stampsRequired: true,
  rewardType: true,
  rewardDetail: true,
}).extend({ stampsRequired: z.number().int().min(1).max(50).default(7) });
export type CreateProgramInput = z.infer<typeof CreateProgramInput>;

// =============================================================================
// Customer (end_customer)
// =============================================================================

export const CustomerSchema = z.object({
  type: z.literal('CUSTOMER'),
  tenantId: z.string().uuid(), // qué tenant lo "descubrió" primero
  customerId: z.string().uuid(),
  phone: z.string().regex(/^\+\d{10,15}$/), // E.164, master id (BR Q-7)
  firstName: z.string().min(1).max(60).optional(),
  email: z.string().email().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Customer = z.infer<typeof CustomerSchema>;

export const SignupCustomerInput = z.object({
  phone: z.string().regex(/^\+\d{10,15}$/),
  firstName: z.string().min(1).max(60).optional(),
  email: z.string().email().optional(),
});
export type SignupCustomerInput = z.infer<typeof SignupCustomerInput>;

// =============================================================================
// Card (instancia de programa para 1 customer)
// =============================================================================

export const CardSchema = z.object({
  type: z.literal('CARD'),
  tenantId: z.string().uuid(),
  cardId: z.string().uuid(),
  programId: z.string().uuid(),
  customerId: z.string().uuid(),
  customerPhone: z.string().regex(/^\+\d{10,15}$/), // denormalizado para queries simples
  stamps: z.number().int().min(0).default(0),
  redemptionsCount: z.number().int().min(0).default(0),
  status: z.enum(['active', 'completed', 'expired', 'cancelled']).default('active'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Card = z.infer<typeof CardSchema>;

// =============================================================================
// Transaction (stamp / redeem) — Slice 3
// =============================================================================

export const TransactionKindSchema = z.enum(['stamp', 'redeem']);
export type TransactionKind = z.infer<typeof TransactionKindSchema>;

export const TransactionSchema = z.object({
  type: z.literal('TRANSACTION'),
  tenantId: z.string().uuid(),
  transactionId: z.string().uuid(),
  kind: TransactionKindSchema,
  cardId: z.string().uuid(),
  customerId: z.string().uuid(),
  customerPhone: z.string().regex(/^\+\d{10,15}$/),
  programId: z.string().uuid(),
  programName: z.string(), // denormalizado para activity feed
  amount: z.number().int().min(1).default(1), // sellos (stamp) o canjes (redeem siempre 1)
  stampsBefore: z.number().int().min(0),
  stampsAfter: z.number().int().min(0),
  note: z.string().max(200).optional(),
  performedByUserId: z.string(), // qué user del merchant ejecutó
  createdAt: z.string().datetime(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

export const StampInput = z.object({
  amount: z.number().int().min(1).max(10).default(1), // típicamente 1, ocasionalmente +2-3 por promoción
  note: z.string().max(200).optional(),
});
export type StampInput = z.infer<typeof StampInput>;

export const RedeemInput = z.object({
  note: z.string().max(200).optional(),
});
export type RedeemInput = z.infer<typeof RedeemInput>;
