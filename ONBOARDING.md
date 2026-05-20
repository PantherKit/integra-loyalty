# Integra Lealtad — Guía para colaborar SOLO en la Landing

Bienvenido. Tu trabajo aquí es **únicamente la landing page de venta** (la página
pública que vende el SaaS a los comercios). No toques el backend, la infra ni el
producto. Lee esto completo antes de empezar.

## Qué es el proyecto (contexto mínimo)

SaaS de tarjetas de lealtad digital para pymes de México (tarjeta en Apple/Google
Wallet, sin app). Tú solo te encargas de que la **landing** se vea increíble y
venda. Lo demás ya funciona y está fuera de tu alcance.

**Landing en vivo (referencia de cómo se ve hoy):**
https://dewt2ht9lbl07.cloudfront.net

## Tu alcance — SOLO esto

Puedes editar:
- `web/app/page.tsx` — **la landing** (hero, secciones, precios, FAQ, CTA).
- `web/app/globals.css` — estilos globales (con cuidado).
- `web/components/` — **solo** si creas un componente nuevo para la landing
  (ej. `web/components/landing/...`). Reutiliza `IntegraLogo` y `LoyaltyPass`.
- `web/tailwind.config.ts` — solo si necesitas un color/utilidad para la landing.

## NO toques (fuera de alcance — un PR que toque esto se rechaza)

- `api/`, `infra/`, `demo-pass/` — backend, infraestructura, Apple Wallet.
- `web/app/dashboard/`, `web/app/onboarding/`, `web/app/wallet/`, `web/app/c/`,
  `web/app/login/`, `web/app/signup/` — el producto en sí.
- `web/lib/api.ts` — capa de API.
- Nada de credenciales, AWS, Stripe ni despliegues.

## Setup local (5 min, NO necesitas AWS)

```bash
git clone https://github.com/PantherKit/integra-loyalty.git
cd integra-loyalty
git checkout landing            # rama dedicada — trabaja SIEMPRE sobre ésta
cd web
npm install
NEXT_PUBLIC_API_URL="https://tcsbnd5m3l.execute-api.us-east-1.amazonaws.com" npm run dev
# abre http://localhost:3001
```

Para validar antes de subir tu cambio (obligatorio, deben pasar en verde):
```bash
cd web
npm run lint
npm run build
```

## Flujo de trabajo

1. Crea tu rama desde `landing`: `git checkout -b landing/<tu-cambio>`.
2. Haz tus cambios **solo en los archivos permitidos**.
3. `npm run lint && npm run build` en verde.
4. Push y abre un **Pull Request hacia la rama `landing`** (no a `dev` ni `main`).
5. En el PR describe qué cambiaste y adjunta captura de la landing.

## Lineamientos de la landing

- Mobile-first (el comercio la abre desde el celular).
- Español de México, tono claro y vendedor, sin tecnicismos.
- Marca: oscuro `#191919`, acento `brand` (#4f46e5). Mantén coherencia.
- Precios actuales (no inventar): Básico $349 · Pro $649 · Multi-sucursal $1,190
  MXN/mes. Prueba 14 días, sin contrato.
- Todos los CTA llevan a `/onboarding/` (registro) o `/login/`.
- Si dudas del mensaje, mira `docs/pricing.md` (anclas de venta) y la landing en
  vivo de referencia.

Cualquier duda de alcance: pregunta antes de tocar. Gracias 🙌
