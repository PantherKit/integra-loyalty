# Architecture — Dev environment

> Diseño del entorno **dev** de Integra Loyalty. Optimizado para costo bajo en AWS (target: <$10 USD/mes sin tráfico real), scale-to-zero, y portable a `stage` / `prod` cambiando solo configuración.

---

## 1. Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                      Browser / Wallet device                    │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ▼
            ┌────────────────────────────────────┐
            │ CloudFront                         │   ← cache estático + edge
            │ (dev.integra-loyalty.integra-...)  │
            └────────┬─────────────────┬─────────┘
                     │                 │
                     ▼                 ▼
            ┌──────────────┐    ┌──────────────────────┐
            │ S3 static    │    │ API Gateway HTTP API │
            │ (Next.js     │    │ /api/*               │
            │  /web build) │    └──────────┬───────────┘
            └──────────────┘               │
                                           ▼
                              ┌──────────────────────────────┐
                              │ Lambda (Node 20)             │
                              │ - Hono router                │
                              │ - Zod schemas                │
                              │ - JWT verify (Cognito)       │
                              └────────┬──────────┬──────────┘
                                       │          │
                                       ▼          ▼
                          ┌──────────────┐   ┌──────────────────┐
                          │ DynamoDB     │   │ Cognito User Pool│
                          │ single-table │   │ (multi-tenant)   │
                          └──────────────┘   └──────────────────┘
```

### Servicios AWS (con justificación)

| Servicio | Uso | Por qué |
|---|---|---|
| **Lambda** (Node 20) | API stateless + workers async | Scale-to-zero, free tier 1M req/mes, ARM Graviton barato |
| **API Gateway HTTP API** | Entrada HTTPS al backend | HTTP API (no REST API) = 70% más barato, JWT auth nativo |
| **DynamoDB** | Persistencia single-table | On-demand scaling, free tier 25 GB + 200M ops/mes, sin Aurora idle cost |
| **Cognito User Pools** | Auth multi-tenant | Free tier 50k MAU, hosted UI, JWT, grupos por rol |
| **S3 + CloudFront** | Frontend estático + CDN | <$1/mes en dev, edge cache global, 1 TB free transfer primer año |
| **Secrets Manager** | API keys (Stripe, APNs) | Rotación automática, IAM granular ($0.40/secret/mes) |
| **CloudWatch Logs** | Observabilidad | Estándar Lambda, retention 7 días en dev |
| **Route 53** | DNS | `*.integra-group.ai` wildcard ya configurado |

### Servicios que NO usamos en dev

- ❌ **Aurora/RDS**: costo mínimo $30/mes idle, sobra para single-table DynamoDB
- ❌ **EC2 / ECS / Fargate**: scale-to-zero no aplica, costo idle
- ❌ **ElastiCache**: cache se hace en Lambda memory + DDB DAX si necesario después
- ❌ **NAT Gateway**: $45/mes/AZ fixed → Lambda fuera de VPC, sin VPC en dev
- ❌ **WAF**: lo agregamos en prod, no en dev

---

## 2. Estimación de costos — dev environment (sin tráfico real)

| Servicio | Costo estimado/mes | Notas |
|---|---|---|
| Lambda | $0.00 | <1M invocations free tier; ~10k req en dev |
| DynamoDB on-demand | $0.00-$0.50 | <1M ops, <1 GB storage |
| API Gateway HTTP | $0.00 | <1M req free tier primer año |
| Cognito | $0.00 | <50k MAU |
| S3 + CloudFront | $0.50-$1.00 | <5 GB storage, <10 GB transfer |
| Secrets Manager | $1.20 | 3 secrets (Stripe test, APNs sandbox, Google Wallet API) |
| CloudWatch Logs | $0.10-$0.50 | retention 7 días, baja ingesta |
| Route 53 | $0.50 | 1 hosted zone (compartido con producción) |
| **Total dev/mes** | **~$2-4 USD** | Sin tráfico real |

### Cuando crezca a prod (100 tenants, ~5k MAU)

Estimación CLAUDE.md confirmada: **<$60 USD/mes con 100 comercios pagando**.

---

## 3. Multi-tenancy

- **Modelo:** shared-DB con `tenant_id` (= `merchant_id`) como partition key prefix en DDB
- **Aislamiento:** lógico (no isolated-account-per-tenant)
- **Auth:** Cognito User Pools con grupos `merchant`, `end_customer`, `integra_admin`
- **JWT claims:** `tenant_id` se inyecta en custom claim; Lambda verifica + filtra todas las queries

---

## 4. Environment separation

Tres environments (CDK contexts):

| Env | Account AWS | Dominio | Auto-deploy |
|---|---|---|---|
| **dev** | `041876399045` (gnet, compartido) | `dev.integra-loyalty.integra-group.ai` | sí (cada PR merge a main) |
| **stage** | `041876399045` | `stage.integra-loyalty.integra-group.ai` | sí (tag `v*-rc*`) |
| **prod** | TBD (account dedicado recomendado) | `app.integra-loyalty.integra-group.ai` | manual approval (tag `v*`) |

Cada env tiene stack CDK separado: `IntegraLoyaltyDevStack`, `IntegraLoyaltyStageStack`, `IntegraLoyaltyProdStack`. Mismo código, diferentes parámetros (table name, secrets, domain).

---

## 5. GitOps flow

```
PR opened
   ↓
GitHub Actions: lint + typecheck + cdk synth
   ↓
PR merge to main
   ↓
GitHub Actions: cdk deploy IntegraLoyaltyDevStack
   ↓
dev.integra-loyalty.integra-group.ai actualizado
```

Auth GitHub Actions → AWS: **OIDC federation** (no API keys hardcoded). Configurado en `.github/workflows/cdk.yml` + role IAM `GitHubActions-CDK-Deploy` con trust policy a `repo:PantherKit/integra-loyalty:*`.

---

## 6. Decisiones técnicas registradas como ADRs

- [ADR-001 — Stack serverless TypeScript](../adr/001-stack-serverless-typescript.md)
- [ADR-002 — Multi-tenancy shared-DB con tenant_id](../adr/002-multi-tenancy-shared-db.md)
- [ADR-003 — Environment separation (dev/stage/prod)](../adr/003-environment-separation.md)
- [ADR-004 — Cost guardrails y budget alerts](../adr/004-cost-guardrails.md)
- [ADR-005 — GitOps flow con CDK + OIDC](../adr/005-gitops-cdk-oidc.md)

---

## 7. Próximos pasos antes de deploy real

1. ✅ Diseño documentado (este archivo)
2. ⬜ Scaffold CDK (`infra/`) — listo en este PR
3. ⬜ Lambda "hello world" (`api/`) — listo en este PR
4. ⬜ AWS Account ID confirmado y permisos verificados
5. ⬜ Setup OIDC federation entre GitHub Actions y AWS
6. ⬜ `cdk bootstrap` en account/region
7. ⬜ Primer `cdk deploy` manual → smoke test
8. ⬜ Activar auto-deploy en `.github/workflows/cdk.yml`

Pasos 4-7 requieren confirmación + credenciales AWS de Jorge. Hasta ese momento, el scaffold solo vive en repo.
