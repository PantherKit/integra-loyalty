# ADR-002: Multi-tenancy con shared-DB y tenant_id

**Date:** 2026-05-13
**Status:** accepted

## Context

Integra Loyalty es SaaS multi-tenant. Cada comercio (`merchant`) tiene sus end_customers, programas, configuración. Necesitamos modelo de tenancy que sea barato, seguro, y escalable a 100+ tenants en prod.

## Decision

**Shared-database, shared-schema con `tenant_id` como partition key prefix.**

- DynamoDB single-table
- Primary key: `PK = tenant_id#<entity_type>#<id>` / `SK = <attribute>`
- JWT custom claim `tenant_id` validado en Lambda
- Todas las queries incluyen `tenant_id` en KeyConditionExpression
- IAM policies no separan por tenant (decisión lógica vs física)

## Alternatives considered

| Alternativa | Por qué se descartó |
|---|---|
| Database-per-tenant | $25+/mes por DDB table; insostenible a 100 tenants |
| Account-per-tenant | Complejidad operativa enorme, costo Control Tower |
| Schema-per-tenant en Aurora | Aurora descartada (ADR-001); igual no aplica |
| Pool por tier (premium tenants en table dedicada) | Premature optimization; revisar a 100+ tenants |

## Consequences

**Positivas:**
- Una sola tabla → costo mínimo
- Onboarding nuevo tenant = 0 infraestructura nueva
- Backup / restore unificado
- Métricas agregadas fáciles

**Negativas:**
- **Riesgo de data leak cross-tenant si Lambda falla en filtrar.** Mitigación: middleware Hono que valida `tenant_id` del JWT contra cualquier query; tests E2E que intentan acceder a tenants ajenos.
- Hot partition risk si un tenant crece desproporcionado. Mitigación: monitoring CloudWatch + plan de extracción de tenants grandes a table dedicada.
- LFPDPPP: el cliente quizás pida aislamiento físico para compliance. Mitigación: oferta enterprise futura con `database-per-tenant` como upgrade.

## Implementación

```typescript
// api/middleware/tenant.ts
export const requireTenant = createMiddleware(async (c, next) => {
  const token = c.req.header('Authorization')?.split(' ')[1];
  const claims = verifyJwt(token); // Cognito
  if (!claims.tenant_id) return c.json({ error: 'no tenant' }, 401);
  c.set('tenantId', claims.tenant_id);
  await next();
});

// uso
app.get('/customers', requireTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const res = await ddb.query({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': `${tenantId}#customer#` },
  });
  return c.json(res.Items);
});
```

## References

- AWS SaaS Lens: https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/
- DynamoDB single-table for SaaS: https://aws.amazon.com/blogs/database/single-table-vs-multi-table-design-in-amazon-dynamodb/
