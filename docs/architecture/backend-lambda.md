# Backend en AWS Lambda — Arquitectura

> Estado: refleja el código en la rama `feat/saas-demo` al 2026-05-18.
> Fuente de verdad de código: `api/src/**`, `infra/lib/integra-loyalty-stack.ts`, `infra/lib/config.ts`.
> Decisiones relacionadas: ADR-001 (stack serverless), ADR-002 (multi-tenancy), ADR-003 (envs), ADR-004 (costo).

Este documento describe **cómo es y cómo queda** el backend corriendo en Lambda: topología real, inventario de rutas, modelo de datos single-table, flujo de auth, perfil de cold start / bundling / costo, y qué falta para soportar Apple Wallet + Google Wallet.

---

## 1. Topología

El backend es una **única Lambda monolítica** (no hay una Lambda por ruta). API Gateway hace catch-all `ANY /{proxy+}` hacia esa función, y dentro de la función un **router único de Hono** despacha todas las rutas.

Evidencia:

- `infra/lib/integra-loyalty-stack.ts:111-135` — un solo `nodeLambda.NodejsFunction` (`ApiHandler`), `entry = api/src/index.ts`, `handler`.
- `infra/lib/integra-loyalty-stack.ts:162-166` — `httpApi.addRoutes({ path: '/{proxy+}', methods: [ANY], integration: HttpLambdaIntegration(apiFn) })`. Una sola integración, una sola Lambda.
- `api/src/index.ts:12-38` — una sola instancia `new Hono()`, monta todos los sub-routers con `app.route(...)` y exporta `export const handler = handle(app)` (`hono/aws-lambda`).

```
                            Internet (PWA Next.js / merchant dashboard / curl)
                                         │  HTTPS
                                         ▼
                  ┌─────────────────────────────────────────────┐
                  │  API Gateway HTTP API  (apigatewayv2)        │
                  │  integra-loyalty-<env>-api                   │
                  │  Ruta única:  ANY /{proxy+}                  │
                  │  CORS preflight: allowOrigins '*' (TODO prod)│
                  └───────────────────────┬─────────────────────┘
                                          │  HttpLambdaIntegration (proxy v2)
                                          ▼
                  ┌─────────────────────────────────────────────┐
                  │  AWS Lambda  (1 sola función, monolítica)    │
                  │  integra-loyalty-<env>-api                   │
                  │  Runtime: Node.js 20.x   Arch: ARM_64        │
                  │  mem 512 MB · timeout 10 s                   │
                  │                                              │
                  │  hono/aws-lambda handle(app)                 │
                  │  Router único Hono:                          │
                  │   /  /health  /auth  /merchants  /programs   │
                  │   /cards  /activity  /m/:slug …              │
                  │  middleware requireTenant (JWT guard)        │
                  └──────────┬───────────────────────┬──────────┘
                             │ AWS SDK v3            │ AWS SDK v3
                             ▼                       ▼
        ┌────────────────────────────┐   ┌──────────────────────────────┐
        │  DynamoDB (single-table)   │   │  Cognito User Pool            │
        │  integra-loyalty-<env>     │   │  integra-loyalty-<env>        │
        │  PK / SK + GSI1 + GSI2     │   │  custom:tenantId, custom:role │
        │  PAY_PER_REQUEST           │   │  ADMIN_USER_PASSWORD_AUTH     │
        └────────────────────────────┘   └──────────────────────────────┘

(Fuera de esta Lambda, en el mismo stack: S3 + CloudFront sirven el
 frontend estático Next.js; no participan en el path del API.)
```

Implicaciones de la Lambda monolítica:

- Un solo artefacto de deploy, un solo cold start path, un solo conjunto de permisos IAM (DynamoDB RW + 5 acciones admin de Cognito — `integra-loyalty-stack.ts:137-147`).
- El blast radius de un bug de routing es todo el API, pero la superficie es pequeña y el modelo es el recomendado para Hono en Lambda (ADR-001:30, "Hono es 10x más ligero").

---

## 2. Inventario real de rutas

Sacado de `api/src/index.ts` (montaje) y `api/src/routes/*`. "Auth" = pasa por `requireTenant` (`api/src/middleware/tenant.ts`). Rol: hoy **ningún endpoint enforcea rol**; `userRole` se carga del claim pero no se valida (ver §7).

| Método | Path | Auth | Rol enforced | Qué hace | DDB / índice |
|---|---|---|---|---|---|
| GET | `/` | No | — | Banner `{name, env}` | — (`index.ts:22`) |
| GET | `/health` | No | — | Healthcheck `{status, env, timestamp}` | — (`routes/health.ts:5`) |
| POST | `/auth/signup` | No | — | Crea Cognito user + Tenant+Merchant+User (txn) + auto-login | GSI1 (dup-check), `TransactWrite` 3 items (`routes/auth.ts:22`, `repositories/tenant.ts:62`) |
| POST | `/auth/login` | No | — | `ADMIN_USER_PASSWORD_AUTH`, verifica idToken, touch lastLogin | base table PK/SK (`touchLastLogin`) (`routes/auth.ts:68`) |
| GET | `/auth/me` | parcial¹ | — | Verifica Bearer y devuelve claims | — (`routes/auth.ts:88`) |
| GET | `/merchants/me` | Sí | — | Merchant del tenant | `GetItem` PK=`TENANT#`, SK=`MERCHANT#main` (`repositories/merchant.ts:9`) |
| PATCH | `/merchants/me` | Sí | — | Update parcial del merchant | `UpdateItem` PK/SK, cond `attribute_exists(PK)` (`merchant.ts:41`) |
| POST | `/programs` | Sí | — | Crea programa de lealtad | `PutItem` SK=`PROGRAM#<uuid>` (`repositories/program.ts:7`) |
| GET | `/programs/me` | Sí | — | Lista programas del tenant | `Query` PK + `begins_with(SK,'PROGRAM#')` (`program.ts:46`) |
| GET | `/programs/:id` | Sí | — | Un programa por id | `GetItem` PK/SK (`program.ts:36`) |
| GET | `/cards/lookup?phone=` | Sí | — | Cards de un teléfono dentro del tenant | `Query` PK + `begins_with(SK,'CARD#')` + Filter `customerPhone` (`repositories/card.ts:93`) |
| GET | `/cards/:id` | **No (público)** | — | Card por id opaco (vista PWA/Wallet). cardId UUID actúa como bearer | **GSI2** `GSI2PK=CARD#<id>` (`card.ts:51`) |
| POST | `/cards/:id/stamp` | Sí | — | +N sellos, crea Transaction (txn atómica + cond. anti-race) | `GetItem` + `TransactWrite` (Update card cond `status=active AND stamps=:before` + Put TXN) (`card.ts:122`) |
| POST | `/cards/:id/redeem` | Sí | — | Canjea premio, resetea stamps a 0, +1 redemption | `GetItem` + `TransactWrite` (Update cond `stamps>=:required` + Put TXN) (`card.ts:195`) |
| GET | `/activity?limit=` | Sí | — | Feed reciente de transacciones del tenant | `Query` PK + `begins_with(SK,'TXN#')`, `ScanIndexForward=false` (`repositories/transaction.ts:10`) |
| GET | `/m/:slug` | No (público) | — | Landing del comercio + programa activo | **GSI2** `GSI2PK=SLUG#<slug>` + `Query` programas (`routes/public.ts:13`) |
| POST | `/m/:slug/customers` | No (público) | — | Signup de cliente final; idempotente por phone; crea Card | GSI2 (merchant), `Query` programas, GSI2 (customer por phone), `PutItem` customer + card (`public.ts:44`) |
| * | cualquier otra | — | — | `404 {error:'not_found'}` | — (`index.ts:32`) |

¹ `/auth/me` no usa `requireTenant`; valida el Bearer manualmente con `verifyIdToken` (`routes/auth.ts:88-99`).

Notas de seguridad ya visibles en el inventario:

- `GET /cards/:id` es **público** y resuelve por GSI2 sin tenant (`card.ts:51-62`); el UUID del card es el único secreto.
- `listCardsByPhoneInTenant` y `listCardsByCustomerInTenant` usan `FilterExpression` (no índice) → lee todas las `CARD#` del tenant y filtra en memoria. OK a escala pyme, no a escala alta.

---

## 3. Modelo de datos single-table

Una sola tabla DynamoDB `integra-loyalty-<env>`, `PAY_PER_REQUEST`, PK/SK `STRING`, + dos GSIs con `projectionType: ALL` (`integra-loyalty-stack.ts:34-57`). Composición de claves en `api/src/lib/keys.ts`.

### Llave primaria

| Entidad | PK | SK | Escrito en |
|---|---|---|---|
| Tenant | `TENANT#<tenantId>` | `METADATA` | `tenant.ts:68` |
| Merchant | `TENANT#<tenantId>` | `MERCHANT#main` | `tenant.ts:73` |
| User | `TENANT#<tenantId>` | `USER#<cognitoSub>` | `tenant.ts:87` |
| LoyaltyProgram | `TENANT#<tenantId>` | `PROGRAM#<uuid>` | `program.ts:28` |
| Customer | `TENANT#<tenantId>` | `CUSTOMER#<uuid>` | `customer.ts:31` |
| Card | `TENANT#<tenantId>` | `CARD#<uuid>` | `card.ts:36` |
| Transaction | `TENANT#<tenantId>` | `TXN#<isoCreatedAt>#<idShort8>` | `card.ts:173`, `keys.ts:12` |

Todo cuelga de `TENANT#<id>` → una sola `Query` por PK trae todo lo del tenant; aislamiento lógico por partición (ADR-002).

> Nota sobre `TXN#`: `keys.ts:12-20` documenta un truco de "reverse timestamp" pero `reverseTimestamp()` hoy **devuelve el ISO tal cual**. El orden DESC del feed se obtiene en query con `ScanIndexForward=false` (`transaction.ts:23`), no en la clave. Funciona; el comentario es engañoso.

### GSIs realmente usados

**GSI1** (`GSI1PK` / `GSI1SK`) — lookup de User por email:

| GSI1PK | GSI1SK | Escrito | Leído |
|---|---|---|---|
| `EMAIL#<email lower>` | `USER#<userId>` | User (`tenant.ts:91`) | `findUserByEmail` (`user.ts:9`) |

**GSI2** (`GSI2PK` / `GSI2SK`) — índice global multipropósito con discriminador en el prefijo del PK:

| GSI2PK | GSI2SK | Entidad | Escrito | Leído |
|---|---|---|---|---|
| `SLUG#<slug>` | `MERCHANT#main` | Merchant | `tenant.ts:78` | `getMerchantBySlug` (`merchant.ts:22`) |
| `PHONE#<phone>` | `TENANT#<tenantId>` | Customer | `customer.ts:32` | `findCustomerByPhoneInTenant` (`customer.ts:47`) |
| `CARD#<cardId>` | `CARD#<cardId>` | Card | `card.ts:38` | `getCardById` (`card.ts:51`) |

Un único GSI2 atiende tres lookups distintos colapsando el discriminador en el prefijo de `GSI2PK` (decisión explícita en `keys.ts:26-30`, "single GSI con discriminador … reduce número de índices" — menos índices = menos costo de write, alineado con ADR-004).

### Patrones de acceso

| # | Patrón | Cómo | Operación |
|---|---|---|---|
| AP-1 | Crear tenant completo | PK/SK ×3 atómico | `TransactWrite` (`tenant.ts:62`) |
| AP-2 | User por email (login dup-check) | GSI1 `EMAIL#` | `Query` (`user.ts:9`) |
| AP-3 | User por tenant+id | PK/SK | `Query` (`user.ts:25`) |
| AP-4 | Merchant del tenant | PK/SK `MERCHANT#main` | `GetItem` (`merchant.ts:9`) |
| AP-5 | Update merchant | PK/SK | `UpdateItem` (`merchant.ts:41`) |
| AP-6 | Tenant activo | PK/SK `METADATA` | `GetItem` (`tenant.ts:108`) |
| — | Merchant por slug (público) | GSI2 `SLUG#` | `Query` (`merchant.ts:22`) |
| — | Programas del tenant | PK + `begins_with(SK,'PROGRAM#')` | `Query` (`program.ts:46`) |
| — | Customer por phone en tenant | GSI2 `PHONE#` + SK `TENANT#` | `Query` (`customer.ts:47`) |
| — | Card por id (público / Wallet) | GSI2 `CARD#` | `Query` (`card.ts:51`) |
| — | Cards por phone en tenant | PK + `begins_with(SK,'CARD#')` + Filter | `Query`+Filter (`card.ts:93`) |
| — | Stamp / Redeem atómico | PK/SK cond + Put TXN | `TransactWrite` (`card.ts:152`,`card.ts:232`) |
| — | Feed de actividad DESC | PK + `begins_with(SK,'TXN#')` reverse | `Query` (`transaction.ts:10`) |

---

## 4. Auth — flujo Cognito

Cognito User Pool con dos atributos custom inmutable/mutable (`integra-loyalty-stack.ts:77-80`):

- `custom:tenantId` (`StringAttribute` minLen 1, maxLen 64, **mutable: false**)
- `custom:role` (minLen 1, maxLen 16, mutable: true)

App client con `adminUserPassword: true` + `userPassword` + `userSrp`; idToken/accessToken validez 1 h, refresh 30 días (`integra-loyalty-stack.ts:83-94`).

### Signup (`POST /auth/signup`, `routes/auth.ts:22`)

1. Valida body (Zod: email, password 8–128, merchantName, industry).
2. `findUserByEmail` (GSI1) para idempotencia básica → 409 si existe.
3. `randomUUID()` genera `tenantId`.
4. `createCognitoUser` (`lib/cognito.ts:39`): `AdminCreateUser` con `MessageAction: SUPPRESS` (sin email de verificación — auto-confirma para Slice 1), atributos `email_verified=true`, `custom:tenantId`, `custom:role=owner`; luego `AdminSetUserPassword` permanente.
5. `createTenant` (`repositories/tenant.ts:25`): `TransactWrite` de Tenant + Merchant + User con el **mismo** `tenantId` (alineado con el claim de Cognito — `auth.ts:46`).
6. `authenticateUser` → auto-login, devuelve tokens. Responde 201.

### Login (`POST /auth/login`, `routes/auth.ts:68`)

`authenticateUser` (`cognito.ts:76`) → `AdminInitiateAuth` con `AuthFlow: ADMIN_USER_PASSWORD_AUTH` → `{idToken, accessToken, refreshToken, expiresIn}`. Luego `verifyIdToken` y `touchLastLogin` best-effort. 401 si falla.

### Verificación de token (`verifyIdToken`, `lib/cognito.ts:106`)

`CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: 'id' })` (lib `aws-jwt-verify`, descarga y cachea el JWKS del pool). Devuelve `{ sub, email, tenantId: payload['custom:tenantId'], role: payload['custom:role'] ?? 'owner' }`.

### Middleware `requireTenant` (`api/src/middleware/tenant.ts:18`)

1. Si hay `Authorization: Bearer <jwt>` → `verifyIdToken`. Si el claim `tenantId` está vacío → 401 `jwt_missing_tenant`. Si OK, setea en el contexto Hono `tenantId`, `userId` (=sub), `userEmail`, `userRole`, y continúa.
2. **Fallback dev**: solo si `process.env.ENV === 'dev'` y no hubo Bearer, acepta `x-tenant-id` (+ `x-user-id`/`x-user-email`) y fija `userRole='owner'`. Pensado para curl/test; **no debe existir en prod** (en prod `ENV !== 'dev'`).
3. Sin nada → 401 `unauthorized`.

El aislamiento por tenant depende 100% de que cada repositorio anteponga `TENANT#<tenantId>` a la PK usando el `tenantId` del claim. No hay enforcement adicional en capa de datos (ver §7).

---

## 5. Cold start, bundling, tamaño y costo

### Configuración de la Lambda (de `integra-loyalty-stack.ts:111-135`)

| Parámetro | Valor | Línea |
|---|---|---|
| Runtime | `NODEJS_20_X` | `:113` |
| Arquitectura | `ARM_64` (Graviton, ~20% más barato) | `:114` |
| Memoria | **512 MB** | `:119` |
| Timeout | **10 s** | `:120` |
| Provisioned concurrency | 0 (sin warm pool — ADR-004:51) | — |
| Bundler | CDK `NodejsFunction` → esbuild | `:111`,`:129-134` |
| Formato | ESM (`OutputFormat.ESM`), target `node20`, `minify: true`, `sourceMap: true` | `:130-133` |
| Log retention | 7/30/90 días por env (`config.ts`) | `:99-109` |

### Tamaño real del bundle

`NodejsFunction` aquí **no define `externalModules`**, por lo que esbuild **incluye el AWS SDK v3 en el bundle** (no usa el SDK provisto por el runtime Node 20). Medición reproduciendo el comando de build sobre `api/src/index.ts`:

- Bundle minificado tal como lo construye el stack (AWS SDK incluido): **≈ 890 KB** (`/tmp` build: 909 583 bytes, "888.3kb" esbuild).
- Si se externalizara `@aws-sdk/*` al runtime: **≈ 119 KB** (121 742 bytes).

ADR-001:38 afirma "Hono compila a <50KB → cold start <300ms". El **código de aplicación** (Hono + rutas + Zod, sin SDK) sí está en ese orden de magnitud, pero el **artefacto desplegado real es ~890 KB** por no externalizar el SDK. Acción recomendada (no aplicada aún): añadir `externalModules: ['@aws-sdk/*']` al bloque `bundling` para bajar el artefacto a ~119 KB y recortar cold start; el runtime Node 20 ya trae AWS SDK v3.

### Cold start estimado

ARM Node 20, 512 MB, bundle ~890 KB ESM minificado: cold start típico **~400–700 ms** (init + parse del SDK incluido + primer `verifyIdToken` que además descarga el JWKS de Cognito en la primera invocación fría que toca auth). Warm: pocos ms + latencia DynamoDB. Externalizar el SDK lo acercaría a los <300 ms del ADR.

### Costo estimado a escala pyme (≈100 comercios) — target ADR-004 `<$60/mes`

Supuestos conservadores: 100 comercios activos, ~50 clientes/comercio, ~10 sellos+canjes/cliente/mes ⇒ ~50 000 mutaciones/mes + lecturas de dashboard/landing/PWA. Estimación ~**0.5–1.5 M requests/mes** al API.

| Servicio | Cálculo | Costo aprox./mes |
|---|---|---|
| Lambda (ARM, 512 MB, ~100–200 ms/req) | 1.5 M req · ~0.15 GB-s c/u; primeros 400 k GB-s gratis | **$0 – $1** |
| API Gateway HTTP API | 1.5 M req · $1.00/M (vs REST $3.50 → ADR-001:151) | **~$1.5** |
| DynamoDB on-demand | ~50 k writes (varios por txn) + ~1 M reads; +2 GSI con `ALL` ⇒ writes ×3 | **~$2 – $6** |
| Cognito | 100 MAU (merchants); clientes finales NO son usuarios Cognito (usan phone) | **$0** (bajo 50 k MAU free tier típico) |
| CloudWatch Logs | retención 90 d prod, volumen bajo | **~$1 – $3** |
| S3 + CloudFront (frontend, PriceClass_100) | tráfico estático pyme | **~$1 – $5** |
| **Total backend a escala pyme** | | **≈ $6 – $20 / mes** |

Consistente y holgado frente al target prod `<$60/mes` de ADR-004 (línea `prod (mes 6+, ~100 tenants): $60`). El driver de costo dominante a futuro es DynamoDB (writes ×3 por los dos GSI con proyección `ALL`); a volumen alto convendría revisar `projectionType` a `KEYS_ONLY`/`INCLUDE`.

---

## 6. Qué falta para soportar Wallet (Apple PassKit + Google Wallet)

Hoy **no existe ningún endpoint ni dependencia de Wallet** en `api/`. `GET /cards/:id` (`routes/cards.ts:26`) ya devuelve el estado de la card por id opaco y es el cimiento natural de la vista PWA y de la generación de pases. Lo que falta, y dónde encaja como rutas Hono nuevas **en la misma Lambda monolítica** (montadas con `app.route(...)` en `api/src/index.ts`):

### Apple Wallet (PassKit)

1. **Generación del `.pkpass`** — endpoint `GET /wallet/apple/:cardId/pkpass`: arma el `pass.json` (datos del comercio + sellos + reward), firma con el certificado del Apple Developer Program de Integra, empaqueta el `.pkpass` (zip firmado). Requiere:
   - Certificado Pass Type ID + clave privada + WWDR cert → guardar en **AWS Secrets Manager / SSM** y dar IAM read a la Lambda (hoy la Lambda solo tiene DynamoDB RW + Cognito; falta el grant).
   - Librería de firma de pases (p.ej. `passkit-generator`) → añadir a `api/package.json`; revisar impacto en bundle (§5) y cold start.
2. **PassKit Web Service** (registro/actualización de devices) — sub-router Hono `app.route('/wallet/apple', applePassWebService)` con los endpoints del protocolo Apple:
   - `POST   /v1/devices/:deviceId/registrations/:passTypeId/:serial`
   - `DELETE /v1/devices/:deviceId/registrations/:passTypeId/:serial`
   - `GET    /v1/devices/:deviceId/registrations/:passTypeId?passesUpdatedSince=`
   - `GET    /v1/passes/:passTypeId/:serial`
   - `POST   /v1/log`
   - Auth propia del protocolo: header `Authorization: ApplePass <authToken>` (no es el JWT Cognito → no usar `requireTenant`; nuevo middleware que valide el `authenticationToken` del pass).
   - Persistencia de registros device↔pass: nuevo patrón single-table, p.ej. `PK=CARD#<cardId>`, `SK=APPLEREG#<deviceId>` (o como ítem bajo `TENANT#`), reutilizando la tabla existente.
3. **Push vía APNs** cuando cambian sellos: en `stampCard`/`redeemCard` (`repositories/card.ts:152`/`:232`), tras la txn, disparar push APNs (token-based, .p8) a los devices registrados. Idealmente desacoplado (DynamoDB Streams → Lambda worker, o EventBridge) para no acoplar el push al request del merchant ni alargar su latencia.

### Google Wallet

4. **Loyalty Class por comercio**: al crear/activar un programa (`routes/programs.ts:8`), upsert de la Google Wallet `LoyaltyClass` vía Google Wallet REST API (service account JSON en Secrets Manager + grant IAM).
5. **Loyalty Object + link "Add to Google Wallet"** — endpoint `GET /wallet/google/:cardId/jwt`: genera el `LoyaltyObject` (referencia a la Class del comercio + sellos) y firma un **JWT con la clave de la service account** para el botón "Add to Google Wallet".
6. **Updates Google**: igual que APNs — tras stamp/redeem, `PATCH` del `LoyaltyObject` vía Google Wallet API (mismo punto de extensión o worker desacoplado).

### Resumen de gaps de backend para Wallet

| Falta | Dónde encaja |
|---|---|
| Secrets (Apple cert/key, Google SA) + IAM grant | Secrets Manager/SSM + nuevo `grant` en `integra-loyalty-stack.ts` |
| Libs de firma `.pkpass` / JWT Google | `api/package.json` (vigilar tamaño bundle, §5) |
| Sub-router `/wallet/apple/*` (PassKit Web Service) | nuevo `api/src/routes/wallet-apple.ts` + `app.route()` en `index.ts` |
| Sub-router `/wallet/google/*` (class/object/jwt) | nuevo `api/src/routes/wallet-google.ts` + `app.route()` en `index.ts` |
| Middleware auth `ApplePass` (≠ Cognito) | nuevo en `api/src/middleware/` |
| Registros device↔pass | nuevo prefijo de SK en la tabla single-table existente |
| Push APNs / update Google al cambiar sellos | hook tras txn en `repositories/card.ts`, preferible desacoplado (DDB Streams/EventBridge) |

Todo encaja en la **misma** Lambda + **misma** tabla; el push asíncrono es lo único que conviene sacar a un worker aparte.

---

## 7. Gaps y riesgos conocidos (referencia breve)

1. **Aislamiento multi-tenant solo lógico y dependiente del claim.** El scoping por tenant existe únicamente porque cada repositorio antepone `TENANT#<tenantId>` con el `tenantId` del JWT (`middleware/tenant.ts:27`). No hay defensa en profundidad (ni IAM leading-key conditions, ni validación cruzada). Si un claim se corrompe o un endpoint olvida `requireTenant`, hay fuga cross-tenant. Coherente con ADR-002 (aislamiento lógico aceptado), pero es el riesgo #1.
2. **Roles no enforced.** `custom:role` se lee y se expone en `userRole` (`middleware/tenant.ts:30`) pero **ningún endpoint lo valida**: cualquier usuario autenticado del tenant puede crear programas, sellar, canjear, editar el merchant. Falta capa de autorización por rol (`owner`/`admin`/`staff`).
3. **`GET /cards/:id` público sin rate limit.** El cardId UUID es el único secreto; sin throttling, expone enumeración/abuso. API Gateway HTTP API no tiene WAF/rate-limit configurado.
4. **Fallback `x-tenant-id` en dev.** Seguro solo mientras `ENV !== 'prod/stage'`; cualquier despliegue accidental con `ENV=dev` permitiría suplantar tenant sin JWT (`middleware/tenant.ts:40-50`).
5. **CORS `origin: '*'`** tanto en Hono (`index.ts:15`) como en API Gateway (`integra-loyalty-stack.ts:158`), con TODO explícito de restringir en prod.
6. **`FilterExpression` en listados de cards** (`card.ts:93`,`:74`): lee todas las `CARD#` del tenant y filtra en memoria. Aceptable a escala pyme, no a escala alta.
7. **Bundle no externaliza AWS SDK** (§5): artefacto ~890 KB vs ~119 KB posibles; afecta cold start y se desvía del supuesto del ADR-001.
8. **Sin tests** (`api/package.json` → `"test": "echo no tests yet"`); las invariantes anti-race de stamp/redeem (condiciones DynamoDB en `card.ts`) no tienen cobertura automatizada.
