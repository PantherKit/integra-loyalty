import { PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from '../ddb';
import {
  tenantPk,
  passRegSk,
  passRegSkPrefix,
  deviceGsi2Pk,
  passRegGsi2Sk,
} from '../keys';

/**
 * Registro device<->pass del PassKit Web Service de Apple.
 *
 * Single-table:
 *  - PK    = TENANT#<tenantId>
 *  - SK    = PASSREG#<cardId>#<deviceLibraryIdentifier>
 *  - GSI2PK = DEVICE#<deviceLibraryIdentifier>
 *  - GSI2SK = PASSREG#<cardId>
 */
export interface PassRegistration {
  type: 'PASSREG';
  tenantId: string;
  cardId: string;
  deviceLibraryIdentifier: string;
  pushToken: string;
  updatedAt: string;
}

export interface RegisterDeviceParams {
  tenantId: string;
  cardId: string;
  deviceLibraryIdentifier: string;
  pushToken: string;
}

/** Put idempotente: registrar (o re-registrar con nuevo pushToken) un device. */
export async function registerDevice(p: RegisterDeviceParams): Promise<PassRegistration> {
  const now = new Date().toISOString();
  const reg: PassRegistration = {
    type: 'PASSREG',
    tenantId: p.tenantId,
    cardId: p.cardId,
    deviceLibraryIdentifier: p.deviceLibraryIdentifier,
    pushToken: p.pushToken,
    updatedAt: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: tenantPk(p.tenantId),
        SK: passRegSk(p.cardId, p.deviceLibraryIdentifier),
        GSI2PK: deviceGsi2Pk(p.deviceLibraryIdentifier),
        GSI2SK: passRegGsi2Sk(p.cardId),
        ...reg,
      },
    })
  );

  return reg;
}

/** Elimina el registro de un device para una card. */
export async function unregisterDevice(
  tenantId: string,
  cardId: string,
  deviceLibraryIdentifier: string
): Promise<void> {
  await ddb.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: tenantPk(tenantId),
        SK: passRegSk(cardId, deviceLibraryIdentifier),
      },
    })
  );
}

/** Todos los devices registrados para una card (usado por el push APNs). */
export async function listRegistrationsByCard(
  tenantId: string,
  cardId: string
): Promise<PassRegistration[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': tenantPk(tenantId),
        ':sk': passRegSkPrefix(cardId),
      },
    })
  );
  return (res.Items ?? []) as PassRegistration[];
}

/** Todos los registros de un device (usado por GET .../registrations/:passTypeId). */
export async function listRegistrationsByDevice(
  deviceLibraryIdentifier: string
): Promise<PassRegistration[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: {
        ':pk': deviceGsi2Pk(deviceLibraryIdentifier),
      },
    })
  );
  return (res.Items ?? []) as PassRegistration[];
}
