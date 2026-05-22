# Épica: Pulido de UI — Consola Sales Org

> Mejora visual y de UX de toda la consola Sales Org, manteniendo intacta la
> lógica de negocio (roles, endpoints, visibilidad).

## Objetivo

La consola Sales Org funciona pero es visualmente plana: Tailwind `zinc`
genérico, sin identidad Integra, tablas básicas, sin estados pulidos. Esta
épica le da identidad de marca, pulido visual, responsive y mejor navegación
— sin tocar el backend ni la lógica.

## División por superficie (no por tipo de mejora)

Las 4 mejoras pedidas (branding, pulido, responsive, navegación) son
*cross-cutting*. Para poder ejecutar los tickets en paralelo sin conflictos
de merge, se dividen por **superficie**: cada ticket aplica las 4 mejoras a
un conjunto de archivos disjunto.

| Ticket | Superficie | Archivos |
|---|---|---|
| [UI-01](./ticket-ui-01-consola-admin.yaml) | Consola del admin | `app/sales/admin/{layout,page}.tsx`, `app/sales/admin/reps/page.tsx` |
| [UI-02](./ticket-ui-02-flujos-alta.yaml) | Flujos de alta | `app/sales/admin/reps/new/page.tsx`, `app/sales/admin/admins/new/page.tsx`, `components/ShareAccess.tsx` |
| [UI-03](./ticket-ui-03-consola-vendedor.yaml) | Consola del vendedor | `app/sales/rep/**` |

Los conjuntos de archivos no se solapan → los 3 tickets corren en paralelo.

## Guía de branding (idéntica en los 3 tickets)

La consistencia visual entre los 3 tickets paralelos la garantiza esta guía
compartida — cada ticket la incluye textualmente.

- **Verde Integra:** primario `#4f7d2a`, hover/oscuro `#3d6520`. Úsalo solo en
  CTAs primarios, links/tabs activos e indicadores positivos. No saturar.
- **Neutros:** fondo `zinc-50`/blanco, texto `zinc-900`/`zinc-600`, bordes `zinc-200`.
- **Logo:** usar el componente existente `web/components/IntegraLogo.tsx` en los headers.
- **Tipografía:** la que ya usa la app — NO cambiar la familia tipográfica.
- **Badges de estado:** verde=activo/positivo, ámbar=warning/past_due, rojo=churn/error, zinc=neutro.
- **Responsive:** mobile-first. En móvil las tablas colapsan a tarjetas apiladas;
  targets táctiles ≥44px; nada de scroll horizontal.
- **Empty states:** ícono + título + descripción breve + CTA. Nunca una tabla vacía pelona.
- **Loading:** skeletons que imiten el layout final, no spinners sueltos.
- **No crear componentes compartidos nuevos en `components/`** (evita colisiones
  entre los tickets paralelos) — los componentes nuevos quedan locales a la
  página/zona del ticket.

## Fuera de alcance de toda la épica

- Backend: endpoints, roles, visibilidad, KPIs — nada cambia.
- `web/lib/api.ts` — no se toca (es la capa de datos, compartida).
- Cambiar la familia tipográfica o el framework de estilos.
- Features nuevas — solo se pule lo que ya existe.
