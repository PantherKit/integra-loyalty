import { GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';
import { ddb, TABLE_NAME } from '../ddb';
import { tenantPk, tenantMetadataSk, merchantSk, userSk, emailGsi1Pk, userGsi1Sk } from '../keys';
import { Tenant, Merchant, User } from '../entities';

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
export async function createTenant(params: CreateTenantParams): Promise<CreateTenantResult> {
  const now = new Date().toISOString();
  const tenantId = params.tenantId ?? randomUUID();
  const userId = params.cognitoSub;

  const tenant: Tenant = {
    type: 'TENANT',
    tenantId,
    plan: 'free',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  const merchant: Merchant = {
    type: 'MERCHANT',
    tenantId,
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
            Item: { PK: tenantPk(tenantId), SK: merchantSk(), ...merchant },
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
 */
export async function getTenantStatus(tenantId: string): Promise<Tenant | null> {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: tenantPk(tenantId), SK: tenantMetadataSk() },
      ProjectionExpression: '#type, tenantId, plan, #status, createdAt, updatedAt',
      ExpressionAttributeNames: { '#type': 'type', '#status': 'status' },
    })
  );
  return (res.Item as Tenant) ?? null;
}
