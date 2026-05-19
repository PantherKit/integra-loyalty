import { GetCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';
import { ddb, TABLE_NAME } from '../ddb';
import { tenantPk, tenantMetadataSk, merchantSk, userSk, emailGsi1Pk, userGsi1Sk, merchantSlugGsi2Pk } from '../keys';
import { Tenant, Merchant, User } from '../entities';
import { generateSlug } from '../slug';

interface CreateTenantParams {
  email: string;
  merchantName: string;
  industry: Merchant['industry'];
  cognitoSub: string;
  tenantId?: string; // si no se pasa, se genera. El caller (signup) debe pasarlo para alinear con Cognito custom:tenantId.
}

export interface CreateTenantResult {
  tenant: Tenant;
  merchant: Merchant;
  user: User;
}

/**
 * AP-1 — Crea Tenant + Merchant + User en una transacción atómica.
 */
/** Días de prueba gratis al registrarse (modelo "14 días, luego pagar"). */
export const TRIAL_DAYS = 14;

export async function createTenant(params: CreateTenantParams): Promise<CreateTenantResult> {
  const now = new Date().toISOString();
  const tenantId = params.tenantId ?? randomUUID();
  const userId = params.cognitoSub;

  const trialEndsAt = new Date(
    Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const tenant: Tenant = {
    type: 'TENANT',
    tenantId,
    plan: 'free',
    status: 'active',
    subscriptionStatus: 'trialing',
    trialEndsAt,
    createdAt: now,
    updatedAt: now,
  };

  const slug = generateSlug(params.merchantName);

  const merchant: Merchant = {
    type: 'MERCHANT',
    tenantId,
    slug,
    name: params.merchantName,
    industry: params.industry,
    createdAt: now,
    updatedAt: now,
  };

  const user: User = {
    type: 'USER',
    tenantId,
    userId,
    email: params.email.toLowerCase().trim(),
    role: 'owner',
    cognitoSub: params.cognitoSub,
    createdAt: now,
    lastLoginAt: null,
  };

  await ddb.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: { PK: tenantPk(tenantId), SK: tenantMetadataSk(), ...tenant },
            ConditionExpression: 'attribute_not_exists(PK)',
          },
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: tenantPk(tenantId),
              SK: merchantSk(),
              GSI2PK: merchantSlugGsi2Pk(slug),
              GSI2SK: merchantSk(),
              ...merchant,
            },
            ConditionExpression: 'attribute_not_exists(PK)',
          },
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: tenantPk(tenantId),
              SK: userSk(userId),
              GSI1PK: emailGsi1Pk(user.email),
              GSI1SK: userGsi1Sk(userId),
              ...user,
            },
            ConditionExpression: 'attribute_not_exists(PK)',
          },
        },
      ],
    })
  );

  return { tenant, merchant, user };
}

/**
 * AP-6 — Verifica que un tenant existe y está activo.
 * Incluye los campos de suscripción Stripe (necesarios para el paywall).
 */
export async function getTenantStatus(tenantId: string): Promise<Tenant | null> {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: tenantPk(tenantId), SK: tenantMetadataSk() },
      ProjectionExpression:
        '#type, tenantId, #plan, #status, subscriptionStatus, stripeCustomerId, stripeSubscriptionId, billingPlan, trialEndsAt, currentPeriodEnd, createdAt, updatedAt',
      ExpressionAttributeNames: { '#type': 'type', '#status': 'status', '#plan': 'plan' },
    })
  );
  return (res.Item as Tenant) ?? null;
}

/** Alias semántico: lectura completa del tenant para billing/paywall. */
export async function getTenant(tenantId: string): Promise<Tenant | null> {
  return getTenantStatus(tenantId);
}

/** Campos de suscripción que el flujo de billing puede actualizar. */
export interface TenantBillingPatch {
  subscriptionStatus?: Tenant['subscriptionStatus'];
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  billingPlan?: Tenant['billingPlan'];
  trialEndsAt?: string;
  currentPeriodEnd?: string;
}

/**
 * Actualiza (parcial) los campos de suscripción del tenant.
 * Usado por createCheckoutSession (guardar customerId) y el webhook de Stripe.
 */
export async function updateTenantBilling(
  tenantId: string,
  patch: TenantBillingPatch
): Promise<Tenant | null> {
  const now = new Date().toISOString();
  const updates: string[] = ['updatedAt = :now'];
  const exprNames: Record<string, string> = {};
  const exprValues: Record<string, unknown> = { ':now': now };

  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    exprNames[`#${k}`] = k;
    exprValues[`:${k}`] = v;
    updates.push(`#${k} = :${k}`);
  }

  const res = await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: tenantPk(tenantId), SK: tenantMetadataSk() },
      UpdateExpression: `SET ${updates.join(', ')}`,
      ExpressionAttributeNames:
        Object.keys(exprNames).length > 0 ? exprNames : undefined,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: 'attribute_exists(PK)',
      ReturnValues: 'ALL_NEW',
    })
  );
  return (res.Attributes as Tenant) ?? null;
}
