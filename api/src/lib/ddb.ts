import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// DDB_ENDPOINT permite apuntar a DynamoDB Local en dev (localhost:8000).
// En producción no se setea, así el SDK usa el endpoint regional de AWS.
const endpoint = process.env.DDB_ENDPOINT;
const client = new DynamoDBClient(endpoint ? { endpoint } : {});

export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});

export const TABLE_NAME = process.env.TABLE_NAME ?? 'integra-loyalty-dev';
