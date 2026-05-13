# CLAUDE.md — Integra · Lealtad Digital

Knowledge base del producto **Integra Lealtad**. Fuente de verdad para cualquier sesión Claude que toque este repo.

## Qué es este producto

**Plataforma SaaS multi-tenant de tarjetas de lealtad digital** que Integra Group AI opera y vende por suscripción a comercios pequeños y medianos (México, mercado primario).

Las tarjetas viven en **Apple Wallet y Google Wallet** — no requiere app móvil. Es el diferenciador clave del producto frente a competencia genérica.

Modelo: **B2B**.
- Integra Lealtad → vende suscripciones a → comercios → emiten tarjetas a → consumidores finales.

## Diferenciadores hard-coded

Estos dictan decisiones técnicas y de UX:

- Comercios target con baja sofisticación técnica → editor drag-and-drop, onboarding por WhatsApp
- Conexiones a internet inestables → PWA con cache offline + sync diferido
- Smartphones Android gama media-baja → mobile-first, cero dependencia de iOS-only features
- **Tarjetas en Apple Wallet (PassKit) y Google Wallet API** — agrega con un tap, push nativo, geofence
- Mercado en español sin alternativa local → producto monolingüe, branding mexicano

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 App Router + Tailwind + shadcn-style (PWA fallback) |
| Backend API | Lambda (Node 20) + Hono + Zod |
| Auth | AWS Cognito User Pools (multi-tenant) |
| DB | DynamoDB single-table |
| Storage | S3 + CloudFront |
| Pagos | Stripe (suscripciones recurrentes) |
| Email | AWS SES |
| WhatsApp | Meta Cloud API (sin intermediario) |
| **Apple Wallet** | **Apple PassKit + APNs (updates push, geofence)** |
| **Google Wallet** | **Google Wallet API (Loyalty Class + Loyalty Object)** |
| IaC | AWS CDK (TypeScript) |
| CI/CD | GitHub Actions |
| Observabilidad | CloudWatch + X-Ray |

**Razón del stack:** 100% serverless, scale-to-zero, costo $0 sin tráfico. Costo AWS estimado <$60 USD/mes con 100 comercios pagando. Apple Developer Program $99 USD/año bajo cuenta de Integra. Google Wallet API gratis al volumen inicial.

## Multi-tenancy

- **Modelo:** shared-db con `tenant_id` como partition key
- **Aislamiento:** lógico (no isolated-account-per-tenant)
- **Auth:** Cognito User Pools con grupos por rol (`merchant`, `end_customer`, `integra_admin`)

## Roles del sistema

1. **merchant** — el comercio que paga la suscripción. Crea programas, edita tarjetas, ve dashboard.
2. **end_customer** — el consumidor final del comercio. Recibe tarjeta digital en Apple Wallet o Google Wallet (o PWA fallback). Acumula puntos, canjea premios.
3. **integra_admin** — equipo de Integra. Panel global, MRR, soporte, override.

## Wallet integration architecture

**Apple Wallet (PassKit):**
- Pass `.pkpass` firmado con certificado del Apple Developer Program de Integra
- Generación dinámica por cliente final con datos del comercio + puntos actuales
- PassKit Web Service endpoints en Lambda para registro/des-registro de devices
- Updates push vía APNs cuando cambian puntos
- Geofence en pass dispara notificación lock-screen al pasar cerca del comercio

**Google Wallet API:**
- Loyalty Class única por comercio
- Loyalty Object por cliente final (referencia a la Class del comercio + puntos)
- Link "Add to Google Wallet" generado vía JWT signing
- Updates a través de Google Wallet API REST cuando cambian puntos

**PWA fallback:**
- Para clientes que no quieran/puedan usar Wallet
- Login magic-link, mismo backend
- Service worker para uso offline básico

## Estructura del repo

```
integra-lealtad/
├── CLAUDE.md           ← este archivo
├── poc/                ← POC Next.js navegable (3 vistas: editor / customer / merchant)
│   └── live: https://lealtad-poc.integra-group.ai/
├── docs/               ← decisiones de producto, arquitectura
└── .github/workflows/  ← CI lint (Next.js)
```

## POC

POC navegable validado y aprobado: **https://lealtad-poc.integra-group.ai/**

Stack del POC:
- Next.js 14 static export
- Tailwind + lucide-react
- 3 vistas mock con datos hardcoded: editor (admin), customer (consumidor), merchant (dashboard del comercio)

El POC es lo que demuestra el producto a comercios prospecto. Los datos son mock; la versión productiva (en construcción) usa DynamoDB + Wallet APIs reales.

## KPIs objetivo (mes 12 post-lanzamiento productivo)

- 250 comercios pagando
- $250k MXN MRR
- 50,000 clientes finales
- **>65% de tarjetas en Apple Wallet o Google Wallet**
- Time-to-first-card <10 min
- Churn mensual <10%

## Riesgos principales

1. **Adopción baja por baja sofisticación técnica** → mitigación: onboarding por WhatsApp + workshop + 1 mes soporte
2. **Conexión inestable** → mitigación: PWA con cache offline
3. **Costos AWS escalan más rápido que ingresos** → mitigación: stack 100% serverless + alertas billing
4. **Cumplimiento LFPDPPP** → mitigación: aviso de privacidad + encriptación + retención configurable
5. **Apple Developer cert demora más de 1 día** → cuenta Organization de Integra (con DUNS, ~24h-1 semana aprobación)
6. **Apple rechaza certificado** → mitigación: validar nombre y branding antes de generar el cert

## Documentos

- `docs/onboarding-history/` (si existe) — material histórico, no fuente de verdad
- Fuente de verdad: este CLAUDE.md + las decisiones que vivan en `docs/`
