# Épica: Sales Org Integra

> CRM interno: estructura de fuerza de ventas de Integra (administradores → vendedores → comercios) sobre el SaaS existente, con visibilidad jerárquica y una capa de IA para priorización.

## Objetivo de negocio

Integra Group AI tiene una fuerza de ventas que vende suscripciones de Integra Loyalty a comercios PYME en México. Hoy esa estructura **no existe en producto**: el sistema solo conoce a los comercios (`merchant`, `staff`, `owner`), a sus clientes finales (`end_customer` futuro), y al equipo Integra global (`integra_admin`). Esta épica introduce **dos roles intermedios** —`sales_admin` y `sales_rep`— para que Integra pueda gestionar y medir su fuerza de ventas dentro del mismo producto.

**Resultado esperado:**
- Un administrador de ventas (ej. Maximiliano) recluta y gestiona sus vendedores; ve KPIs solo de su sub-fuerza.
- Un vendedor (ej. Daniela, bajo Maximiliano) ve únicamente la cartera de comercios que él vendió; tiene flujo rápido para registrar un comercio nuevo.
- `integra_admin` (Jorge / equipo Integra) ve toda la jerarquía y todos los KPIs.
- La IA sugiere a cada vendedor qué comercio priorizar hoy (lead scoring + next-best-action).

## Modelo de roles (después de esta épica)

```
integra_admin (existe hoy)
  └── sales_admin (NUEVO) ──┐
        ├── sales_rep (NUEVO) ──┐
        │     └── merchant (existe hoy) — comercios que el rep vendió
        │           └── owner / merchant / staff (existen hoy)
        │                 └── end_customer (existe hoy, vía Wallet)
```

**Visibilidad:**

| Rol | Ve sales_admins | Ve sales_reps | Ve merchants |
|---|---|---|---|
| `integra_admin` | todos | todos | todos |
| `sales_admin` | solo a sí mismo | solo los suyos | los vendidos por sus reps |
| `sales_rep` | n/a | solo a sí mismo | solo los suyos |
| `owner` / `merchant` / `staff` | n/a | n/a | solo el propio (status quo) |

## Decisiones de diseño que aplican a toda la épica

1. **Roles en Cognito:** se agregan `sales_admin` y `sales_rep` al claim `custom:role`. La lógica de `requireRole(...)` ya existente sigue siendo el único gate.
2. **Tenant para usuarios Integra-side:** los `sales_admin` y `sales_rep` no son de un comercio. Reservamos `tenantId = "INTEGRA"` (string fijo) como tenant interno; los repos lo tratan como un tenant válido pero el front rutea estos usuarios fuera de `/dashboard` (que es el back office del comercio).
3. **Jerarquía sin nueva entidad agregadora:** en lugar de crear `SalesTeam` como entidad, agregamos dos campos a tablas existentes:
   - `User` de tipo `sales_rep` lleva `salesAdminId` (apunta al sales_admin que lo reclutó).
   - `Merchant` lleva `salesRepId` opcional (apunta al rep que lo vendió). Merchants legacy sin rep tienen `null`.
4. **Routes:** todos los endpoints nuevos viven bajo `/admin/sales/*` en `api/src/routes/sales.ts`. Se monta en `index.ts` después de `requireTenant` con `requireRole('sales_admin', 'sales_rep', 'integra_admin')`.
5. **Vistas:** se crean dos secciones nuevas en el front, separadas del `/dashboard` actual:
   - `/sales/admin/*` para `sales_admin`
   - `/sales/rep/*` para `sales_rep`
   - `/admin/*` (si no existe ya) o ampliar el panel `integra_admin` con jerarquía.

## Grafo de dependencias

```
ticket-01 (roles + jerarquía)
   │
   ├──→ ticket-02 (API gestión de la fuerza)
   │       │
   │       ├──→ ticket-04 (vista sales_admin)
   │       └──→ ticket-05 (vista sales_rep)
   │
   ├──→ ticket-03 (API KPIs agregados)
   │       │
   │       ├──→ ticket-04 (vista sales_admin)
   │       └──→ ticket-05 (vista sales_rep)
   │
   └──→ ticket-06 (IA lead scoring) — depende de 02 y 03
```

**Orden de ejecución recomendado:** 01 → (02, 03 en paralelo) → (04, 05 en paralelo) → 06.

## Tickets

| # | Archivo | Capa | Depende de |
|---|---|---|---|
| 01 | [ticket-01-roles-jerarquia.yaml](./ticket-01-roles-jerarquia.yaml) | Backend / Auth / Datos | — |
| 02 | [ticket-02-api-gestion-fuerza.yaml](./ticket-02-api-gestion-fuerza.yaml) | Backend / API | 01 |
| 03 | [ticket-03-api-kpis.yaml](./ticket-03-api-kpis.yaml) | Backend / API | 01 |
| 04 | [ticket-04-vista-sales-admin.yaml](./ticket-04-vista-sales-admin.yaml) | Frontend | 02, 03 |
| 05 | [ticket-05-vista-sales-rep.yaml](./ticket-05-vista-sales-rep.yaml) | Frontend | 02, 03 |
| 06 | [ticket-06-ia-lead-scoring.yaml](./ticket-06-ia-lead-scoring.yaml) | IA / Backend | 02, 03 |

## Fuera del alcance de toda la épica

- Comisiones, payroll de vendedores, cálculos financieros. Solo conteo y atribución; ningún cálculo monetario para el vendedor.
- Multi-tenancy de fuerza de ventas (un sales_admin no pertenece a un partner / distribuidor externo). Toda la jerarquía es interna a Integra.
- Flujo de invitación por email/SMS a vendedores nuevos. El alta es manual por ahora (vía API + Cognito).
- Auditoría histórica de cambios de asignación (ej. "este merchant antes era de Daniela, ahora es de Roberto"). Estado actual únicamente.
- Refactor del rol `integra_admin` existente. Se mantiene como está; solo se le otorga visibilidad de la nueva jerarquía.
