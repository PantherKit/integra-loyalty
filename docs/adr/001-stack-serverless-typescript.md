# ADR-001: Stack serverless TypeScript

**Date:** 2026-05-13
**Status:** accepted

## Context

Integra Loyalty necesita un stack para construir el producto SaaS multi-tenant. Las restricciones son:
- Costo bajo idle (<$10 USD/mes en dev, <$60 USD/mes en prod con 100 tenants)
- Scale-to-zero
- TypeScript end-to-end (consistencia con el equipo y el POC)
- Listo para deploy a AWS

## Decision

**Backend:** Lambda (Node 20 ARM Graviton) + Hono + Zod
**DB:** DynamoDB single-table on-demand
**Auth:** Cognito User Pools (multi-tenant via grupos)
**Frontend:** Next.js 14 App Router (futuro `web/`)
**IaC:** AWS CDK v2 (TypeScript)

## Alternatives considered

| Alternativa | Por qué se descartó |
|---|---|
| Express + EC2/ECS | Idle cost ($30+/mes), no scale-to-zero |
| Fastify + Fargate | Mismo problema de idle |
| Aurora Serverless v2 | Idle cost $30+/mes; DynamoDB cubre nuestro caso multi-tenant single-table |
| Vercel + Supabase | Bloqueo de vendor; queremos infra propia para auditoría LFPDPPP |
| Nest.js | Más boilerplate; Hono es 10x más ligero y suficiente para Lambda |

## Consequences

**Positivas:**
- Scale-to-zero confirmado, dev cost <$5/mes
- Hono compila a <50KB → Lambda cold start <300ms
- Zod schemas compartidos entre cliente y servidor
- Mismo lenguaje en todo el stack (TS)

**Negativas:**
- Lambda time limit 15min (no aplica para nuestro caso, todos los endpoints son <1s)
- DynamoDB requires data modeling discipline (single-table design)
- CDK tiene curva de aprendizaje vs Terraform

## References

- Hono: https://hono.dev/
- DynamoDB single-table design: https://www.alexdebrie.com/posts/dynamodb-single-table/
- AWS Lambda ARM pricing: https://aws.amazon.com/lambda/pricing/
