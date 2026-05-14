// Composición y parsing de PK / SK para DynamoDB single-table.
// Ver docs/architecture/data-model.md

export const tenantPk = (tenantId: string) => `TENANT#${tenantId}` as const;
export const tenantMetadataSk = () => 'METADATA' as const;
export const merchantSk = (merchantId = 'main') => `MERCHANT#${merchantId}` as const;
export const userSk = (userId: string) => `USER#${userId}` as const;
export const programSk = (programId: string) => `PROGRAM#${programId}` as const;
export const customerSk = (customerId: string) => `CUSTOMER#${customerId}` as const;
export const cardSk = (cardId: string) => `CARD#${cardId}` as const;
// TXN#<reverse-timestamp>#<short-id> — ordenable lexicográficamente descendente para activity feed
export const transactionSk = (createdAt: string, transactionId: string) =>
  `TXN#${reverseTimestamp(createdAt)}#${transactionId.slice(0, 8)}` as const;

function reverseTimestamp(iso: string): string {
  // Truco para ordenar DESC por timestamp con ScanIndexForward=true:
  // 9999-12-31T23:59:59.999Z menos el ISO actual.
  // Más simple: usar el ISO directo y query con ScanIndexForward=false.
  return iso;
}

// GSI1 — lookup user/customer por email/phone
export const emailGsi1Pk = (email: string) => `EMAIL#${email.toLowerCase().trim()}` as const;
export const userGsi1Sk = (userId: string) => `USER#${userId}` as const;

// GSI2 — lookup global por slug (merchant) o phone (customer) o cardId (card)
// (single GSI con discriminador en GSI2PK reduce número de índices)
export const merchantSlugGsi2Pk = (slug: string) => `SLUG#${slug.toLowerCase().trim()}` as const;
export const phoneGsi2Pk = (phone: string) => `PHONE#${phone}` as const;
export const cardIdGsi2Pk = (cardId: string) => `CARD#${cardId}` as const;

export function parseUserSk(sk: string): { userId: string } | null {
  const m = sk.match(/^USER#(.+)$/);
  return m ? { userId: m[1] } : null;
}

export function parseTenantPk(pk: string): { tenantId: string } | null {
  const m = pk.match(/^TENANT#(.+)$/);
  return m ? { tenantId: m[1] } : null;
}
