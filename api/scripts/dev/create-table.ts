/**
 * Crea la tabla DynamoDB local con el mismo schema que el stack de CDK
 * (PK/SK + GSI1 + GSI2). Idempotente: si ya existe, no hace nada.
 *
 * Apunta a localhost:8000 (DynamoDB Local). Las creds son dummy porque
 * DDB Local las ignora.
 */
import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceInUseException,
} from "@aws-sdk/client-dynamodb";

const TABLE = process.env.TABLE_NAME ?? "integra-loyalty-dev";
const ENDPOINT = process.env.DDB_ENDPOINT ?? "http://localhost:8000";

const client = new DynamoDBClient({
  endpoint: ENDPOINT,
  region: "us-east-1",
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});

async function ensureTable() {
  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE }));
    console.log(`✓ tabla ${TABLE} ya existe en ${ENDPOINT}`);
    return;
  } catch (e: unknown) {
    if (
      !(e instanceof Error) ||
      !("name" in e) ||
      (e as { name: string }).name !== "ResourceNotFoundException"
    ) {
      // Otro error — propagar
      throw e;
    }
  }

  try {
    await client.send(
      new CreateTableCommand({
        TableName: TABLE,
        BillingMode: "PAY_PER_REQUEST",
        AttributeDefinitions: [
          { AttributeName: "PK", AttributeType: "S" },
          { AttributeName: "SK", AttributeType: "S" },
          { AttributeName: "GSI1PK", AttributeType: "S" },
          { AttributeName: "GSI1SK", AttributeType: "S" },
          { AttributeName: "GSI2PK", AttributeType: "S" },
          { AttributeName: "GSI2SK", AttributeType: "S" },
        ],
        KeySchema: [
          { AttributeName: "PK", KeyType: "HASH" },
          { AttributeName: "SK", KeyType: "RANGE" },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: "GSI1",
            KeySchema: [
              { AttributeName: "GSI1PK", KeyType: "HASH" },
              { AttributeName: "GSI1SK", KeyType: "RANGE" },
            ],
            Projection: { ProjectionType: "ALL" },
          },
          {
            IndexName: "GSI2",
            KeySchema: [
              { AttributeName: "GSI2PK", KeyType: "HASH" },
              { AttributeName: "GSI2SK", KeyType: "RANGE" },
            ],
            Projection: { ProjectionType: "ALL" },
          },
        ],
      })
    );
    console.log(`✓ tabla ${TABLE} creada en ${ENDPOINT}`);
  } catch (e) {
    if (e instanceof ResourceInUseException) {
      console.log(`✓ tabla ${TABLE} ya existía (race)`);
      return;
    }
    throw e;
  }
}

ensureTable().catch((e) => {
  console.error("falló create-table:", e);
  process.exit(1);
});
