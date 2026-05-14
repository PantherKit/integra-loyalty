import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';
import { ddb, TABLE_NAME } from '../ddb';
import { tenantPk, customerSk, phoneGsi2Pk } from '../keys';
import { Customer, SignupCustomerInput } from '../entities';

export interface CreateCustomerParams extends SignupCustomerInput {
  tenantId: string;
}

export async function createCustomer(p: CreateCustomerParams): Promise<Customer> {
  const now = new Date().toISOString();
  const customerId = randomUUID();

  const customer: Customer = {
    type: 'CUSTOMER',
    tenantId: p.tenantId,
    customerId,
    phone: p.phone,
    firstName: p.firstName,
    email: p.email,
    createdAt: now,
    updatedAt: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: tenantPk(p.tenantId),
        SK: customerSk(customerId),
        GSI2PK: phoneGsi2Pk(p.phone),
        GSI2SK: tenantPk(p.tenantId), // permite encontrar todos los tenants donde un phone existe
        ...customer,
      },
      ConditionExpression: 'attribute_not_exists(PK)',
    })
  );

  return customer;
}

/**
 * Encuentra si ya existe customer con este phone en este tenant.
 * Útil para idempotency en customer signup público.
 */
export async function findCustomerByPhoneInTenant(tenantId: string, phone: string): Promise<Customer | null> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK = :sk',
      ExpressionAttributeValues: {
        ':pk': phoneGsi2Pk(phone),
        ':sk': tenantPk(tenantId),
      },
      Limit: 1,
    })
  );
  return (res.Items?.[0] as Customer) ?? null;
}
