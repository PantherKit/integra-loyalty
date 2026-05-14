import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';
import { ddb, TABLE_NAME } from '../ddb';
import { tenantPk, cardSk, cardIdGsi2Pk } from '../keys';
import { Card } from '../entities';

export interface CreateCardParams {
  tenantId: string;
  programId: string;
  customerId: string;
  customerPhone: string;
}

export async function createCard(p: CreateCardParams): Promise<Card> {
  const now = new Date().toISOString();
  const cardId = randomUUID();

  const card: Card = {
    type: 'CARD',
    tenantId: p.tenantId,
    cardId,
    programId: p.programId,
    customerId: p.customerId,
    customerPhone: p.customerPhone,
    stamps: 0,
    redemptionsCount: 0,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: tenantPk(p.tenantId),
        SK: cardSk(cardId),
        GSI2PK: cardIdGsi2Pk(cardId), // permite GET /cards/:id sin saber tenantId
        GSI2SK: cardSk(cardId),
        ...card,
      },
    })
  );

  return card;
}

/**
 * Get card by cardId (sin necesitar tenantId) — usado para PWA público / Wallet generation.
 */
export async function getCardById(cardId: string): Promise<Card | null> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: { ':pk': cardIdGsi2Pk(cardId) },
      Limit: 1,
    })
  );
  return (res.Items?.[0] as Card) ?? null;
}

export async function getCard(tenantId: string, cardId: string): Promise<Card | null> {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: tenantPk(tenantId), SK: cardSk(cardId) },
    })
  );
  return (res.Item as Card) ?? null;
}

export async function listCardsByCustomerInTenant(tenantId: string, customerId: string): Promise<Card[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: 'customerId = :cid',
      ExpressionAttributeValues: {
        ':pk': tenantPk(tenantId),
        ':sk': 'CARD#',
        ':cid': customerId,
      },
    })
  );
  return (res.Items ?? []) as Card[];
}
