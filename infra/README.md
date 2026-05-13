# infra — AWS CDK

Define los stacks de Integra Loyalty para dev / stage / prod.

Ver:
- [Architecture overview](../docs/architecture/dev-environment.md)
- [ADR-001 — Stack serverless TypeScript](../docs/adr/001-stack-serverless-typescript.md)
- [ADR-003 — Environment separation](../docs/adr/003-environment-separation.md)
- [ADR-004 — Cost guardrails](../docs/adr/004-cost-guardrails.md)
- [ADR-005 — GitOps flow](../docs/adr/005-gitops-cdk-oidc.md)

## Setup local (1 vez)

```bash
cd infra
npm install
```

Para el primer deploy a AWS, prerequisitos:

1. AWS CLI con perfil `integra-loyalty-dev` configurado (admin temporal)
2. CDK bootstrap (1 vez por account/region):
   ```bash
   npx cdk bootstrap aws://041876399045/us-east-1
   ```
3. OIDC role para GitHub Actions (1 vez):
   - Crear OIDC provider en IAM apuntando a `token.actions.githubusercontent.com`
   - Crear role `GitHubActions-CDK-Deploy` con trust policy a `repo:PantherKit/integra-loyalty:*`
   - Permission policy: AdministratorAccess en dev/stage; least-privilege en prod

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run synth` | Genera CloudFormation templates sin deploy (validación) |
| `npm run diff:dev` | Muestra diff entre el estado actual y lo que se deployaría |
| `npm run deploy:dev` | Deploy a env dev |
| `npm run destroy:dev` | Destruye stack dev (cuidado) |

## Estructura

```
infra/
├── bin/app.ts                       ← entry point (instancia stacks por env)
├── lib/
│   ├── config.ts                    ← configs por env (table name, domain, budget)
│   └── integra-loyalty-stack.ts     ← stack base reutilizable
├── cdk.json                         ← CDK config + context (accounts, region)
└── package.json
```

## Costo estimado

Ver [ADR-004 — Cost guardrails](../docs/adr/004-cost-guardrails.md).

- dev: ~$2-4 USD/mes sin tráfico
- prod (~100 tenants): <$60 USD/mes
