// Composición y parsing de PK / SK para DynamoDB single-table.
// Ver docs/architecture/data-model.md

export const tenantPk = (tenantId: string) => `TENANT#${tenantId}` as const;
export const tenantMetadataSk = () => 'METADATA' as const;
export const merchantSk = (merchantId = 'main') => `MERCHANT#${merchantId}` as const;
export const userSk = (userId: string) => `USER#${userId}` as const;

export const emailGsi1Pk = (email: string) => `EMAIL#${email.toLowerCase().trim()}` as const;
export const userGsi1Sk = (userId: string) => `USER#${userId}` as const;

export function parseUserSk(sk: string): { userId: string } | null {
  const m = sk.match(/^USER#(.+)$/);
  return m ? { userId: m[1] } : null;
}

export function parseTenantPk(pk: string): { tenantId: string } | null {
  const m = pk.match(/^TENANT#(.+)$/);
  return m ? { tenantId: m[1] } : null;
}
