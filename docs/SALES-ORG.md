# Sales Org — consola interna de la fuerza de ventas

Guía para cualquier dev que vaya a entender, mantener o mejorar la feature
**Sales Org** de Integra Loyalty.

## Qué es

Sales Org es la consola interna con la que **Integra gestiona su fuerza de
ventas**: la gente que vende suscripciones de Integra Loyalty a los comercios.
Es una capa *encima* del SaaS — no la usan ni los comercios ni los clientes
finales, solo el equipo de Integra.

## Modelo de roles (3 niveles)

```
Super Admin  (integra_admin)  → crea Admins y Vendedores · ve TODO
  └── Admin  (sales_admin)    → crea solo Vendedores · ve su equipo
        └── Vendedor (sales_rep) → vende a comercios · ve su cartera
              └── merchant       → el comercio cliente que paga
```

| Etiqueta UI | `custom:role` en Cognito | Puede crear | Visibilidad |
|---|---|---|---|
| Super Admin | `integra_admin` | Admins + Vendedores | Toda la operación |
| Admin | `sales_admin` | Solo Vendedores | Sus vendedores y los comercios de ellos |
| Vendedor | `sales_rep` | — | Solo su cartera de comercios |

**Seguridad:** solo `integra_admin` puede crear admins (`POST /admin/sales/admins`
responde `403` a cualquier otro rol). Esto evita escalada de privilegios.

### Identidad de los usuarios Integra-side

- Viven en Cognito con `custom:role` ∈ {`integra_admin`, `sales_admin`, `sales_rep`}
  y `custom:tenantId = "INTEGRA"` (tenant reservado; constante `INTEGRA_TENANT_ID`).
- En DynamoDB: `PK = TENANT#INTEGRA`, `SK = USER#<sub>`.
- `User.salesAdminId` (solo en `sales_rep`) apunta al `sales_admin` que lo reclutó.
- `Merchant.salesRepId` (nullable) apunta al `sales_rep` que vendió esa cuenta.

> Nota: el Super Admin raíz (`jorgeivanjimenez27`) fue creado a mano y conserva
> un `tenantId` de un comercio viejo (Cognito no deja mutar `custom:tenantId`).
> No afecta — la consola solo usa `role` y `userId`.

## Backend

Stack: Lambda (Node 20) + Hono + Zod + DynamoDB single-table. Todo bajo
`api/src/`.

| Archivo | Rol |
|---|---|
| `routes/sales.ts` | Los 11+ endpoints, montados en `/admin/sales/*` |
| `lib/entities.ts` | `UserSchema`, `MerchantSchema`, `INTEGRA_TENANT_ID` |
| `middleware/tenant.ts` | `requireTenant`, `requireRole`, `INTEGRA_ROLES` |
| `lib/sales-kpi.ts` | Cómputo determinista de KPIs |
| `lib/sales-ai/` | Lead scoring: `rules.ts` (determinista) + `llm.ts` (wording) + `index.ts` (orquestador con cache) |
| `lib/repositories/` | Acceso a DynamoDB (`user.ts`, `merchant.ts`, `card.ts`, …) |

### Endpoints (`/admin/sales/*`)

Todos exigen `requireTenant` + `requireRole(...INTEGRA_ROLES)`. La visibilidad
fuera de jerarquía devuelve `404` (no `403`) para no filtrar existencia.

```
POST /reps                      Alta de vendedor
GET  /reps                      Vendedores visibles según rol
GET  /reps/:repId               Detalle de un vendedor
POST /admins                    Alta de admin (solo integra_admin)
GET  /admins                    Lista de admins (solo integra_admin)
GET  /merchants                 Comercios visibles según rol
POST /merchants                 Alta de comercio asignado a un vendedor
POST /merchants/:id/assign      Reasignar el vendedor de un comercio
GET  /kpis/reps                 KPI por vendedor (?window=7d|30d|90d|all)
GET  /kpis/admins               KPI por admin (solo integra_admin)
GET  /kpis/me                   KPI del caller
GET  /kpis/merchants/:repId     Desglose por comercio de un vendedor
GET  /ai/priorities/me          Priorización IA del caller
GET  /ai/priorities/reps/:repId Priorización IA de un vendedor
```

## Frontend

Stack: Next.js 14 App Router + Tailwind, build `output: export` (estático).
Todo bajo `web/app/sales/`.

| Ruta | Para | Archivos |
|---|---|---|
| `/sales/admin` | Super Admin / Admin | `admin/layout.tsx`, `admin/page.tsx` |
| `/sales/admin/reps?id=` | — | `admin/reps/page.tsx` (detalle vendedor) |
| `/sales/admin/reps/new` | — | alta de vendedor |
| `/sales/admin/admins/new` | — | alta de admin (solo Super Admin) |
| `/sales/rep` | Vendedor | `rep/layout.tsx`, `rep/page.tsx` |
| `/sales/rep/nuevo-comercio` | — | alta de comercio |
| `/sales/rep/comercios?id=` | — | detalle de comercio |

- **Capa de datos:** `web/lib/api.ts` — todos los helpers de fetch + tipos.
  `decodeJwtClaims()` lee el rol del JWT (cliente); `homeForRole()` enruta por rol.
- **Routing por rol:** tras login, `homeForRole` manda a cada quien a su consola.
  Los `layout.tsx` de cada consola son guards: rebotan a quien no corresponde.
- **Rutas dinámicas:** no se usan `[param]` — el build estático no las soporta.
  El detalle va por query string (`?id=`).

## Correr local

```bash
# Backend (typecheck + tests)
cd api && npm run lint && npx vitest run

# Frontend
cd web && npm run dev          # dev server
cd web && npm run lint && npm run build   # validación

# Infra (validar sin desplegar)
cd infra && npm run synth
```

Build del web apuntando al API desplegado:

```bash
cd web && NEXT_PUBLIC_API_URL=<api-url> npm run build
```

## Desplegar

```bash
cd web && NEXT_PUBLIC_API_URL=<api-url> npm run build   # genera web/out
cd infra && npm run deploy:dev                          # sube API + web
```

El stack `IntegraLoyalty-dev` despliega la Lambda del API y sincroniza
`web/out/` a S3+CloudFront.

## Cómo agregar un usuario manualmente (bootstrap)

El primer Super Admin se crea a mano (no hay UI para crear `integra_admin`):

1. Cognito → User Pool → crear usuario con `custom:role = integra_admin`.
2. DynamoDB → item `PK=TENANT#INTEGRA`, `SK=USER#<sub>`, `role=integra_admin`.
3. A partir de ahí, ese Super Admin crea Admins y Vendedores desde la consola web.

## Qué falta / por dónde mejorar

- **UI:** la consola funciona pero es visualmente plana — ver la épica
  `docs/epics/sales-ui/` (branding, pulido, responsive, navegación).
- **IA:** `sales-ai/llm.ts` tiene la integración con Bedrock *cableada pero
  desactivada* (`SALES_AI_LLM_ENABLED=false`); hoy usa frases canned. Activarla
  requiere el permiso IAM `bedrock:InvokeModel` en el rol de la Lambda.
- **Cache IA:** hoy es en memoria (se pierde en cold-starts). Migrar a DynamoDB
  con TTL 24h.
- **Performance:** `listMerchantsByRep` hace `Scan` con filtro — aceptable con
  pocos comercios; conviene un GSI cuando el catálogo crezca.
- **Alta de usuarios:** la contraseña temporal se muestra en pantalla; estaría
  mejor enviarla por email/WhatsApp.

## Historial

La feature se construyó por tickets (`docs/epics/sales-org/`) y pasó por un
ciclo de modelo: 3 roles → 2 roles → 3 roles (el modelo de 2 roles abría una
escalada de privilegios y se revirtió). El modelo de 3 roles documentado aquí
es el definitivo.
