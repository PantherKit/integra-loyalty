import { GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from '../ddb';
import { tenantPk, merchantSk, merchantSlugGsi2Pk } from '../keys';
import { Merchant, UpdateMerchantInput } from '../entities';

/**
 * AP-4 — Get merchant del tenant autenticado.
 */
export async function getMerchantByTenant(tenantId: string): Promise<Merchant | null> {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: tenantPk(tenantId), SK: merchantSk() },
    })
  );
  return (res.Item as Merchant) ?? null;
}

/**
 * Public lookup — merchant por slug. Usado por landing pública /c/:slug.
 */
export async function getMerchantBySlug(slug: string): Promise<Merchant | null> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK = :sk',
      ExpressionAttributeValues: {
        ':pk': merchantSlugGsi2Pk(slug),
        ':sk': merchantSk(),
      },
      Limit: 1,
    })
  );
  return (res.Items?.[0] as Merchant) ?? null;
}

/**
 * AP-5 — Update merchant.
 */
export async function updateMerchant(tenantId: string, input: UpdateMerchantInput): Promise<Merchant> {
  const now = new Date().toISOString();

  const updates: string[] = ['updatedAt = :now'];
  const exprNames: Record<string, string> = {};
  const exprValues: Record<string, unknown> = { ':now': now };

  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    const placeholder = `#${k}`;
    const valueRef = `:${k}`;
    exprNames[placeholder] = k;
    exprValues[valueRef] = v;
    updates.push(`${placeholder} = ${valueRef}`);
  }

  const res = await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: tenantPk(tenantId), SK: merchantSk() },
      UpdateExpression: `SET ${updates.join(', ')}`,
      ExpressionAttributeNames: Object.keys(exprNames).length > 0 ? exprNames : undefined,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: 'attribute_exists(PK)',
      ReturnValues: 'ALL_NEW',
    })
  );

  return res.Attributes as Merchant;
}
