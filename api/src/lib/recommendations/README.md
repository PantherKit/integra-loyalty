# Recommendations module

Genera el panel "Acciones recomendadas hoy" del dashboard del merchant.

Flujo: detectores (puros) → 1 llamada Claude → cap a 3 cards → cache 1h.

## Archivos

- `types.ts` — `Recommendation`, `Signal`, `KpiExplanation`. Compartidos con
  la route y reusados (duplicados a mano) en el web.
- `detectors.ts` — `churnAtRisk`, `slowDay`, `staleRedemption`. Funciones
  puras: reciben transactions/programs/customers y devuelven `Signal[]`.
  Nunca lanzan ni tocan I/O.
- `llm.ts` — wrapper Claude vía fetch directo a `api.anthropic.com`.
  Lee `ANTHROPIC_API_KEY` perezosamente de Secrets Manager
  (`integra-loyalty/anthropic`). Cache module-level. Parser fail-closed con
  fallback canned por `signal_type`. Sin secreto → modo deshabilitado
  (devuelve copy genérico, NO lanza).
- `index.ts` — orquestador. Lee transactions (últimas 20) + programs, hash
  para validar cache, corre detectores, llama LLM (1 vez si hay signals),
  guarda cache TTL 1h.

## CTA kinds — shell vs. real

| `cta_kind` | Estado | Detalle |
|---|---|---|
| `navigate` → `/dashboard/give-stamp/` | **real** | ruta existente del back office |
| `navigate` → `/dashboard/share/` | **real** | ruta existente del back office |
| `navigate` → `/dashboard/programs/` | **real** | ruta existente del back office |
| `whatsapp` → `wa.me/<phone>?text=<msg>` | **shell** | abre WhatsApp Web/app con mensaje precargado; el envío real lo dispara el usuario manualmente. NO hay sender automatizado (out-of-scope, v1 explícito). |
| `dismiss` | **real** (client-side) | oculta el card en la sesión; no persiste en backend. |

## Configuración

Crear el secreto en AWS Secrets Manager (`us-east-1`):

```
aws secretsmanager create-secret \
  --name integra-loyalty/anthropic \
  --secret-string '{"ANTHROPIC_API_KEY":"sk-ant-..."}'
```

Sin este secreto el endpoint devuelve `{ recommendations: [], kpi_explanations: [] }`
(modo "recomendaciones no configuradas") — el dashboard simplemente esconde
la sección, sin texto canned que parezca real.

Con secreto pero llamada fallida (HTTP error, JSON inválido del modelo), sí
hay fallback: las cards se renderizan con copy genérico por `signal_type`
para no romper la UI.

## Cache

`Map<merchantId, { expiresAt, payload, txHash }>`, TTL 1h, in-memory por
Lambda execution context. Recálculo si:
- TTL expiró, o
- cambió el hash de las últimas 20 transactions (id + stampsAfter).

Sin Redis, sin DynamoDB — un cold start tira el cache y se recomputa.
