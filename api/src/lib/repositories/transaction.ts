import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from '../ddb';
import { tenantPk } from '../keys';
import { Transaction } from '../entities';

/**
 * Lista las transacciones más recientes de un tenant (DESC por timestamp).
 * Usa Query con ScanIndexForward=false sobre PK=TENANT#<id>, SK begins_with TXN#.
 */
export async function listRecentTransactions(
  tenantId: string,
  limit = 50
): Promise<Transaction[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': tenantPk(tenantId),
        ':sk': 'TXN#',
      },
      ScanIndexForward: false, // DESC: más recientes primero
      Limit: limit,
    })
  );
  return (res.Items ?? []) as Transaction[];
}

/**
 * Lista transacciones de una card específica (todas).
 */
export async function listTransactionsByCard(
  tenantId: string,
  cardId: string,
  limit = 50
): Promise<Transaction[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: 'cardId = :cid',
      ExpressionAttributeValues: {
        ':pk': tenantPk(tenantId),
        ':sk': 'TXN#',
        ':cid': cardId,
      },
      ScanIndexForward: false,
      Limit: limit,
    })
  );
  return (res.Items ?? []) as Transaction[];
}
