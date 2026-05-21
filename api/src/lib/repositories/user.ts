import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from '../ddb';
import { tenantPk, userSk, emailGsi1Pk } from '../keys';
import { User, INTEGRA_TENANT_ID } from '../entities';

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

/**
 * Lista todos los users Integra-side bajo el tenant reservado INTEGRA_TENANT_ID.
 * Estos son sales_admin, sales_rep y integra_admin. Query por PK + begins_with
 * sobre SK='USER#' — eficiente porque el set es pequeño (decenas).
 */
export async function listIntegraUsers(): Promise<User[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': tenantPk(INTEGRA_TENANT_ID),
        ':sk': 'USER#',
      },
    })
  );
  return (res.Items as User[]) ?? [];
}

/**
 * Lista los sales_rep asignados a un sales_admin dado. Filtra en aplicación
 * porque el conjunto de users Integra-side cabe holgado en memoria.
 */
export async function listSalesRepsByAdmin(salesAdminId: string): Promise<User[]> {
  const all = await listIntegraUsers();
  return all.filter((u) => u.role === 'sales_rep' && u.salesAdminId === salesAdminId);
}
