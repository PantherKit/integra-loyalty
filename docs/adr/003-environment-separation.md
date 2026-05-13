# ADR-003: Environment separation (dev / stage / prod)

**Date:** 2026-05-13
**Status:** accepted

## Context

Necesitamos separación clara entre desarrollo, staging y producción para evitar romper a clientes reales con cambios en progreso.

## Decision

**3 environments**, mismo código, diferentes CDK stacks y configuraciones:

| Env | AWS Account | Trigger de deploy | Aprobación | Dominio | Datos |
|---|---|---|---|---|---|
| **dev** | `041876399045` (compartido) | push a `main` | automático | `dev.integra-loyalty.integra-group.ai` | mock/test |
| **stage** | `041876399045` (compartido) | tag `v*-rc*` | automático | `stage.integra-loyalty.integra-group.ai` | snapshot anonimizado de prod |
| **prod** | TBD (account dedicado recomendado) | tag `v*` | manual (1 aprobación) | `app.integra-loyalty.integra-group.ai` | real |

## CDK structure

```
infra/
├── bin/
│   └── app.ts              ← entry point, instancia 3 stacks
├── lib/
│   ├── integra-loyalty-stack.ts  ← stack base reutilizable
│   ├── config.ts           ← env-specific config (table name, domain, secrets prefix)
│   └── constants.ts
└── cdk.json
```

`bin/app.ts` itera los 3 envs:

```typescript
['dev', 'stage', 'prod'].forEach(env => {
  new IntegraLoyaltyStack(app, `IntegraLoyalty-${env}`, {
    env: { account: ACCOUNTS[env], region: 'us-east-1' },
    config: loadConfig(env),
  });
});
```

## Alternatives considered

| Alternativa | Por qué se descartó |
|---|---|
| Solo prod + feature flags | Riesgoso para LFPDPPP (datos reales en tests) |
| Branch-per-env | Mantenimiento de merges entre dev/stage/prod insostenible |
| Account-per-env desde día 1 | Costo Control Tower no justifica hasta tener producción |

## Consequences

**Positivas:**
- Datos reales nunca tocan dev
- Tests E2E corren en stage con datos snapshot
- Bugfix flow claro: dev → stage → prod

**Negativas:**
- Costo: 3 stacks vs 1 = ~3x DynamoDB tables, Lambda functions, etc. Mitigado por scale-to-zero (dev/stage idle ~$0).
- Complejidad CI/CD: 3 pipelines de deploy. Aceptable con CDK.

## Plan de evolución a multi-account

Cuando producción genere ingresos, **migrar prod a AWS Account dedicado**:
- Control Tower / AWS Organizations
- Separación contable (factura por account)
- Aislamiento de blast radius
- Permite SCPs (Service Control Policies) específicas para prod
- ~1 día de trabajo + migración de domain/cert

Mientras tanto: misma account, diferentes stack names, IAM roles separados (`IntegraLoyalty-Dev-LambdaRole` vs `IntegraLoyalty-Prod-LambdaRole`).
