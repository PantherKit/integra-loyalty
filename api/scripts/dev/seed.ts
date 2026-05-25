/**
 * Seed de users base para dev local. Idempotente: si los users ya existen,
 * no hace nada (PutCommand sobreescribe pero los datos son los mismos).
 *
 * Crea 2 users en el tenant INTEGRA:
 *   - super_admin@integra.local  · role=integra_admin
 *   - sales_admin@integra.local  · role=sales_admin
 *
 * Para entrar a la UI: localhost:3001/dev → elegir rol → redirige.
 * El header x-tenant-id + x-user-id viajan en cada request (bypass de
 * Cognito habilitado con ENV=dev + ALLOW_HEADER_AUTH=true).
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const TABLE = process.env.TABLE_NAME ?? "integra-loyalty-dev";
const ENDPOINT = process.env.DDB_ENDPOINT ?? "http://localhost:8000";
const INTEGRA = "INTEGRA";

const raw = new DynamoDBClient({
  endpoint: ENDPOINT,
  region: "us-east-1",
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});
const ddb = DynamoDBDocumentClient.from(raw);

const now = new Date().toISOString();

type SeedUser = {
  userId: string;
  email: string;
  role: "integra_admin" | "sales_admin";
};

const USERS: SeedUser[] = [
  {
    userId: "00000000-0000-0000-0000-superadmin01",
    email: "super_admin@integra.local",
    role: "integra_admin",
  },
  {
    userId: "00000000-0000-0000-0000-salesadmin1",
    email: "sales_admin@integra.local",
    role: "sales_admin",
  },
];

async function putUser(u: SeedUser) {
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `TENANT#${INTEGRA}`,
        SK: `USER#${u.userId}`,
        GSI1PK: `EMAIL#${u.email}`,
        GSI1SK: `USER#${u.userId}`,
        type: "USER",
        tenantId: INTEGRA,
        userId: u.userId,
        email: u.email,
        role: u.role,
        cognitoSub: u.userId,
        createdAt: now,
        lastLoginAt: null,
      },
    })
  );
  console.log(`  ✓ ${u.role.padEnd(15)} ${u.email}  userId=${u.userId}`);
}

async function seed() {
  console.log(`seed contra ${ENDPOINT} (tabla ${TABLE}):`);
  for (const u of USERS) await putUser(u);
  console.log();
  console.log("listo. credenciales locales:");
  for (const u of USERS) {
    console.log(
      `  · ${u.role.padEnd(15)} email=${u.email.padEnd(28)} userId=${u.userId}`
    );
  }
  console.log();
  console.log("para entrar a la UI:");
  console.log("  http://localhost:3001/dev  → click el rol que quieras");
}

seed().catch((e) => {
  console.error("falló seed:", e);
  process.exit(1);
});
