import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';
import { ddb, TABLE_NAME } from '../ddb';
import { tenantPk, programSk } from '../keys';
import { LoyaltyProgram, CreateProgramInput } from '../entities';

export async function createProgram(tenantId: string, input: CreateProgramInput): Promise<LoyaltyProgram> {
  const now = new Date().toISOString();
  const programId = randomUUID();

  const program: LoyaltyProgram = {
    type: 'PROGRAM',
    tenantId,
    programId,
    name: input.name,
    description: input.description,
    stampsRequired: input.stampsRequired,
    rewardType: input.rewardType,
    rewardDetail: input.rewardDetail,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { PK: tenantPk(tenantId), SK: programSk(programId), ...program },
      ConditionExpression: 'attribute_not_exists(PK)',
    })
  );

  return program;
}

export async function getProgram(tenantId: string, programId: string): Promise<LoyaltyProgram | null> {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: tenantPk(tenantId), SK: programSk(programId) },
    })
  );
  return (res.Item as LoyaltyProgram) ?? null;
}

export async function listProgramsByTenant(tenantId: string): Promise<LoyaltyProgram[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': tenantPk(tenantId),
        ':sk': 'PROGRAM#',
      },
    })
  );
  return (res.Items ?? []) as LoyaltyProgram[];
}
