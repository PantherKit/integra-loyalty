import { GetCommand, PutCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';
import { ddb, TABLE_NAME } from '../ddb';
import { tenantPk, cardSk, cardIdGsi2Pk, transactionSk } from '../keys';
import { Card, Transaction, LoyaltyProgram } from '../entities';

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

/**
 * Cuenta cards de un tenant con filtros opcionales (Sales Org KPIs).
 *
 * @param sinceIso filtra cards con createdAt >= sinceIso (ventana temporal)
 * @param activeOnly filtra status === 'active'
 *
 * Hace Query con Select=COUNT solo cuando no hay filtros (más barato).
 * Si hay filtros, query con FilterExpression y cuenta los resultados.
 */
export async function countCardsByTenant(
  tenantId: string,
  opts: { sinceIso?: string; activeOnly?: boolean } = {}
): Promise<number> {
  const exprValues: Record<string, unknown> = {
    ':pk': tenantPk(tenantId),
    ':sk': 'CARD#',
  };
  const filterParts: string[] = [];
  if (opts.sinceIso) {
    exprValues[':since'] = opts.sinceIso;
    filterParts.push('createdAt >= :since');
  }
  if (opts.activeOnly) {
    exprValues[':active'] = 'active';
    filterParts.push('#status = :active');
  }
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: exprValues,
      ExpressionAttributeNames: opts.activeOnly ? { '#status': 'status' } : undefined,
      FilterExpression: filterParts.length ? filterParts.join(' AND ') : undefined,
      Select: 'COUNT',
    })
  );
  return res.Count ?? 0;
}

/**
 * Lookup cards por phone dentro de un tenant. Usado por merchant para "dar sellos".
 */
export async function listCardsByPhoneInTenant(tenantId: string, phone: string): Promise<Card[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: 'customerPhone = :phone',
      ExpressionAttributeValues: {
        ':pk': tenantPk(tenantId),
        ':sk': 'CARD#',
        ':phone': phone,
      },
    })
  );
  return (res.Items ?? []) as Card[];
}

export interface StampCardParams {
  tenantId: string;
  cardId: string;
  amount: number;
  program: LoyaltyProgram;
  performedByUserId: string;
  note?: string;
}

/**
 * Agrega N sellos atómicamente + crea Transaction.
 * Conditional: status=active AND stamps = expected (protege race condition).
 */
export async function stampCard(p: StampCardParams): Promise<{ card: Card; transaction: Transaction }> {
  const card = await getCard(p.tenantId, p.cardId);
  if (!card) throw new Error('card_not_found');
  if (card.status !== 'active') throw new Error(`card_not_active:${card.status}`);

  const now = new Date().toISOString();
  const transactionId = randomUUID();
  const stampsBefore = card.stamps;
  const stampsAfter = stampsBefore + p.amount;

  const updated: Card = { ...card, stamps: stampsAfter, updatedAt: now };

  const transaction: Transaction = {
    type: 'TRANSACTION',
    tenantId: p.tenantId,
    transactionId,
    kind: 'stamp',
    cardId: p.cardId,
    customerId: card.customerId,
    customerPhone: card.customerPhone,
    programId: card.programId,
    programName: p.program.name,
    amount: p.amount,
    stampsBefore,
    stampsAfter,
    note: p.note,
    performedByUserId: p.performedByUserId,
    createdAt: now,
  };

  await ddb.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { PK: tenantPk(p.tenantId), SK: cardSk(p.cardId) },
            UpdateExpression: 'SET stamps = :after, updatedAt = :now',
            ConditionExpression: 'attribute_exists(PK) AND #status = :active AND stamps = :before',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':after': stampsAfter,
              ':before': stampsBefore,
              ':now': now,
              ':active': 'active',
            },
          },
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: { PK: tenantPk(p.tenantId), SK: transactionSk(now, transactionId), ...transaction },
          },
        },
      ],
    })
  );

  return { card: updated, transaction };
}

export interface RedeemCardParams {
  tenantId: string;
  cardId: string;
  program: LoyaltyProgram;
  performedByUserId: string;
  note?: string;
}

/**
 * Canjea premio (reset stamps a 0). Requiere stamps >= stampsRequired.
 * Conditional: protege contra double-redeem.
 */
export async function redeemCard(p: RedeemCardParams): Promise<{ card: Card; transaction: Transaction }> {
  const card = await getCard(p.tenantId, p.cardId);
  if (!card) throw new Error('card_not_found');
  if (card.status !== 'active') throw new Error(`card_not_active:${card.status}`);
  if (card.stamps < p.program.stampsRequired) {
    throw new Error(`insufficient_stamps:${card.stamps}/${p.program.stampsRequired}`);
  }

  const now = new Date().toISOString();
  const transactionId = randomUUID();
  const stampsBefore = card.stamps;

  const updated: Card = {
    ...card,
    stamps: 0,
    redemptionsCount: card.redemptionsCount + 1,
    updatedAt: now,
  };

  const transaction: Transaction = {
    type: 'TRANSACTION',
    tenantId: p.tenantId,
    transactionId,
    kind: 'redeem',
    cardId: p.cardId,
    customerId: card.customerId,
    customerPhone: card.customerPhone,
    programId: card.programId,
    programName: p.program.name,
    amount: 1,
    stampsBefore,
    stampsAfter: 0,
    note: p.note,
    performedByUserId: p.performedByUserId,
    createdAt: now,
  };

  await ddb.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { PK: tenantPk(p.tenantId), SK: cardSk(p.cardId) },
            UpdateExpression: 'SET stamps = :zero, redemptionsCount = :rc, updatedAt = :now',
            ConditionExpression: 'attribute_exists(PK) AND #status = :active AND stamps >= :required',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':zero': 0,
              ':rc': updated.redemptionsCount,
              ':now': now,
              ':active': 'active',
              ':required': p.program.stampsRequired,
            },
          },
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: { PK: tenantPk(p.tenantId), SK: transactionSk(now, transactionId), ...transaction },
          },
        },
      ],
    })
  );

  return { card: updated, transaction };
}
