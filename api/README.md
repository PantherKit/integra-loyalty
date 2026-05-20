# api — Lambda + Hono

Backend de Integra Loyalty. Corre dentro de Lambda (Node 20 ARM), router con Hono, validación con Zod, persistencia DDB.

Ver:
- [Architecture overview](../docs/architecture/dev-environment.md)
- [ADR-001 — Stack](../docs/adr/001-stack-serverless-typescript.md)
- [ADR-002 — Multi-tenancy](../docs/adr/002-multi-tenancy-shared-db.md)

## Rutas

| Método | Path | Auth | Notas |
|---|---|---|---|
| GET | `/` | — | metadata del servicio |
| GET | `/health/` | — | health check (siempre 200 si Lambda jala) |
| GET | `/merchants/` | tenant | (mock) lista merchants del tenant |
| POST | `/merchants/` | tenant | (mock) crea merchant |

## Auth (estado actual)

Middleware `requireTenant` acepta header `x-tenant-id` en dev/stage para testing. **En prod se reemplaza con verifyJwt de Cognito User Pool**. Ver `src/middleware/tenant.ts`.

## Estructura

```
api/
├── src/
│   ├── index.ts            ← Hono app + handler Lambda
│   ├── routes/
│   │   ├── health.ts
│   │   └── merchants.ts
│   ├── middleware/
│   │   └── tenant.ts       ← guard de tenant_id
│   └── lib/                ← DDB clients, utils
├── package.json
└── tsconfig.json
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run lint` | `tsc --noEmit` (typecheck completo) |

Build a Lambda lo hace CDK (`NodejsFunction` con esbuild) — no se ejecuta `npm run build` manual.

## Testing local

(Pendiente — agregar vitest cuando se necesite test unitario)

Para smoke test rápido en local antes de deploy, usar `hono/serve-node` o `wrangler dev`. Documentar después.
