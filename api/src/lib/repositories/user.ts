import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from '../ddb';
import { tenantPk, userSk, emailGsi1Pk } from '../keys';
import { User } from '../entities';

/**
 * AP-2 — Lookup User por email (para magic-link login). Usa GSI1.
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': emailGsi1Pk(email) },
      Limit: 1,
    })
  );
  return (res.Items?.[0] as User) ?? null;
}

/**
 * AP-3 — Get user del tenant + userId.
 */
export async function getUser(tenantId: string, userId: string): Promise<User | null> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': tenantPk(tenantId),
        ':sk': userSk(userId),
      },
      Limit: 1,
    })
  );
  return (res.Items?.[0] as User) ?? null;
}

/**
 * Update lastLoginAt timestamp del User (post-login).
 */
export async function touchLastLogin(tenantId: string, userId: string): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: tenantPk(tenantId), SK: userSk(userId) },
      UpdateExpression: 'SET lastLoginAt = :now',
      ExpressionAttributeValues: { ':now': new Date().toISOString() },
      ConditionExpression: 'attribute_exists(PK)',
    })
  );
}
