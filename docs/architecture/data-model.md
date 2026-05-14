# Data Model — DynamoDB single-table

> Implementación de [ADR-002 — Multi-tenancy shared-DB con tenant_id](../adr/002-multi-tenancy-shared-db.md). Una sola tabla `integra-loyalty-<env>` con composite key `PK + SK`.

---

## Entities en Slice 1

| Entity | Descripción | Owner |
|---|---|---|
| `Tenant` | El comercio como inquilino del SaaS (1:1 con suscripción) | sí mismo |
| `Merchant` | Datos de negocio del comercio (info pública, industria, branding) | Tenant |
| `User` | Usuario humano que opera el panel (puede haber varios por tenant) | Tenant |

**Slices futuros (no en Slice 1):** `Customer` (end_customer), `LoyaltyProgram`, `Card` (instancia de programa por customer), `Transaction` (stamp/redeem).

---

## Schema

### Primary key

| Atributo | Tipo | Convención |
|---|---|---|
| `PK` | String | `<EntityType>#<id>` |
| `SK` | String | varía por entity (ver abajo) |

### Entity layouts

#### Tenant
```
PK: TENANT#<tenantId>
SK: METADATA
attributes:
  type:            "TENANT"
  tenantId:        string (uuid)
  plan:            "free" | "pro" | "enterprise"
  status:          "active" | "suspended" | "cancelled"
  createdAt:       ISO8601
  updatedAt:       ISO8601
```

#### Merchant
```
PK: TENANT#<tenantId>
SK: MERCHANT#main
attributes:
  type:            "MERCHANT"
  tenantId:        string
  name:            string (display name del comercio)
  industry:        "cafe" | "restaurant" | "salon" | "retail" | "other"
  address:         { street, city, state, zip, country }
  phone:           string (E.164)
  brandColor:      string (hex)
  createdAt:       ISO8601
  updatedAt:       ISO8601
```

#### User
```
PK: TENANT#<tenantId>
SK: USER#<userId>
attributes:
  type:            "USER"
  tenantId:        string
  userId:          string (Cognito sub)
  email:           string
  role:            "owner" | "admin" | "staff"
  cognitoSub:      string
  createdAt:       ISO8601
  lastLoginAt:     ISO8601 | null
```

---

## Global Secondary Indexes

### GSI1 — Lookup por email (para login)

| Atributo | Tipo |
|---|---|
| `GSI1PK` | `EMAIL#<email>` |
| `GSI1SK` | `USER#<userId>` |

Permite: dado un email, encontrar el `User` y su `tenantId` para el flow de magic-link login.

> **Slice 2+:** se agregan más GSIs para customers (`PHONE#<E164>`), cards (`CUSTOMER#<id>`), etc.

---

## Access patterns (Slice 1)

| ID | Operación | Implementación |
|---|---|---|
| AP-1 | Crear Tenant + Merchant + User en signup | `TransactWrite` con 3 PutItem en una transacción |
| AP-2 | Login: email → User + Tenant | `Query` GSI1 con `GSI1PK = EMAIL#<email>` → Get Tenant con `PK = TENANT#<tenantId>, SK = METADATA` |
| AP-3 | Get current user info (autenticado por JWT) | `Query` con `PK = TENANT#<tenantId>, SK begins_with USER#` filtered por userId |
| AP-4 | Get merchant info del tenant autenticado | `GetItem` con `PK = TENANT#<tenantId>, SK = MERCHANT#main` |
| AP-5 | Update merchant info | `UpdateItem` con `PK = TENANT#<tenantId>, SK = MERCHANT#main` |
| AP-6 | Verificar tenant activo (middleware) | `GetItem` con `PK = TENANT#<tenantId>, SK = METADATA` (cacheable en Lambda memory por <60s) |

---

## Slice 2+ access patterns (referencia, NO implementar todavía)

| ID | Operación |
|---|---|
| AP-7 | Crear LoyaltyProgram en un Merchant |
| AP-8 | Onboarding de Customer (phone → existing? → create + add Card) |
| AP-9 | Stamp / redeem en Card (conditional write para race condition) |
| AP-10 | List Customers de un Merchant (paginated) |
| AP-11 | List Transactions de una Card (paginated, ordered desc by timestamp) |
| AP-12 | Cards activas en geofence (cuando se construya) |

Estos definen los GSIs futuros — no agregar al schema hasta que Slice 2 los necesite.

---

## Conventions

- **`type` attribute siempre presente** — facilita filtering en queries y debugging.
- **Timestamps ISO8601** (no Unix epoch). DynamoDB no tiene tipo Date nativo; los strings ISO se ordenan léxico-cronológicamente.
- **No deletes hard.** Para soft-delete usar `deletedAt` attribute (ver BR `wallet-onboarding` Q-6 — política 90 días).
- **Encryption at rest:** activado por default en DDB (KMS aws/dynamodb).
- **Streams:** OFF en Slice 1. Activar cuando se necesite event-driven (notifs, replicación a search).

---

## Implementación en `api/src/lib/`

```
api/src/lib/
├── ddb.ts              ← DynamoDBDocumentClient singleton + helpers
├── entities.ts         ← Tipos TS de las 3 entities + Zod schemas
├── keys.ts             ← Funciones para componer/parsear PK + SK
└── repositories/
    ├── tenant.ts       ← Operaciones AP-1, AP-6
    ├── merchant.ts     ← Operaciones AP-4, AP-5
    └── user.ts         ← Operaciones AP-2, AP-3
```

Cada repository expone funciones tipadas (no exporta el cliente DDB directo). Los handlers Hono importan `import { getMerchantByTenant } from '@/lib/repositories/merchant'`.
