# ADR-004: Cost guardrails y budget alerts

**Date:** 2026-05-13
**Status:** accepted

## Context

Integra Loyalty es SaaS para SMB mexicanos. El CAC por tenant es bajo; si el costo AWS por tenant crece más rápido que MRR, el negocio se rompe. Necesitamos guardrails desde el día 1.

## Decision

**Cost targets por environment** (alertas si se exceden):

| Env | Target/mes | Alerta a 80% | Alerta a 100% | Hard cap |
|---|---|---|---|---|
| dev | $10 USD | $8 | $10 | $20 (auto-disable) |
| stage | $25 USD | $20 | $25 | $50 |
| prod (mes 1-3, ~10 tenants) | $30 USD | $25 | $30 | $60 |
| prod (mes 6+, ~100 tenants) | $60 USD | $50 | $60 | $120 |

**Métrica de unit economics:** `costo AWS / (tenants pagantes × MRR per tenant)`. Target: <10%.

## Implementación

### 1. AWS Budgets con alerts

CDK Budget construct en cada stack:

```typescript
new Budget(this, 'EnvBudget', {
  amount: TARGETS[env].budget,
  thresholds: [80, 100, 120],
  notificationEmail: 'jorgejimenez@integra-group.ai',
});
```

### 2. Cost allocation tags

Todos los recursos tagged:
```typescript
Tags.of(stack).add('Project', 'integra-loyalty');
Tags.of(stack).add('Environment', env);
Tags.of(stack).add('CostCenter', 'integra-loyalty');
```

Permite filtrar en Cost Explorer por proyecto + env.

### 3. Hard guardrails

- **DynamoDB on-demand**, NO provisioned (sin sorpresas de capacity reservada)
- **Lambda reserved concurrency** = sin límite global (Lambda escala scale-to-zero, no hay idle); pero `provisionedConcurrency = 0` (no warm pool en dev/stage)
- **CloudWatch Logs retention** = 7 días en dev, 30 en stage, 90 en prod (no infinito)
- **S3 lifecycle**: borrar logs >30 días, transición a IA después de 30 días en prod
- **CloudFront price class** = `PriceClass_100` (NA + Europe, sin Asia) → 30% más barato

### 4. Cost report semanal

GitHub Actions worker corre `aws ce get-cost-and-usage` cada lunes, postea resumen a Slack/email:

```
Integra Loyalty — Semana de 2026-05-13
  dev:   $0.42 (target $10)  ✅
  stage: $0.00 (target $25)  ✅
  prod:  N/A (no deployed)
```

## Alternatives considered

| Alternativa | Por qué se descartó |
|---|---|
| Sin budget, solo monitoring manual | Riesgo de descubrir cost overrun a fin de mes |
| Hard cap con auto-shutdown | Disruptivo para producción; mejor alerta + acción manual |
| Cost-aware autoscaling | Sobre-ingeniería para nuestro volumen |

## Consequences

**Positivas:**
- Cero sorpresas de billing
- Detecta tenants "abusivos" antes de impacto material
- Unit economics auditables semana a semana

**Negativas:**
- CloudFront PriceClass_100 = latencia más alta en Asia. No aplica (mercado MX).
- Logs retention bajo en dev = perdemos historial >7 días. Aceptable.
