# BR: Wallet Onboarding

**Status:** in-review
**Owner:** Jorge Jimenez
**Project:** integra-lealtad
**Created:** 2026-05-13
**Last updated:** 2026-05-13 (interview round 1 — Q-3 a Q-7 resueltas)

> Documento de Business Requirements canónico de Integra. Nada se construye sin que este doc esté en status `finalized` con sign-off humano.

---

## 1. Contexto

El **diferenciador clave** de Integra Lealtad es que las tarjetas de lealtad viven en Apple Wallet / Google Wallet, sin requerir app móvil. Este BR cubre el journey de onboarding del **end_customer** (consumidor final del comercio): desde que escanea el QR del comercio hasta que tiene la tarjeta activa en su Wallet con saldo de puntos visible.

**Situación actual sin Integra Lealtad:**
- Comercios pequeños/medianos en México usan tarjetas físicas de sellos (papel, plástico) que el cliente pierde o se ensucian
- Comercios "tech-forward" usan apps dedicadas, pero >70% de clientes nunca descargan la app → programa de lealtad muere
- Soluciones SaaS extranjeras (Loyverse, Square Loyalty) no están localizadas a México y tienen UX mobile-first iOS-centric, lo cual rompe en el mercado real (Android gama baja predominante)

**Qué se rompe hoy:**
- Conversión post-instalación de programas: <15% (clientes que efectivamente acumulan)
- Retención: <30% al mes 3
- Comercios cancelan suscripción de plataformas existentes en <6 meses por ROI nulo

**Por qué ahora:**
- Apple Wallet y Google Wallet API ya son mainstream en LatAm (2024+ ambos soportados en >85% de devices)
- Costo de implementación bajó a ~$100 USD/año (Apple Dev) + $0 (Google)
- Mercado mexicano sin alternativa local; ventana antes de que entren players USA

---

## 2. Actores

| Actor | Rol | Necesidad principal | Frecuencia | Sofisticación |
|---|---|---|---|---|
| end_customer | Consumidor final del comercio | Agregar tarjeta a su Wallet en <30s sin instalar app | Esporádica (1x setup, después pasiva) | Baja-media (Android gama baja) |
| merchant | Comercio que paga la suscripción | Que su cliente quede onboardeado sin que tenga que explicar nada | Setup inicial + monitoreo | Media (smartphone activo) |
| integra_admin | Equipo de Integra | Ver métricas de adopción Wallet y diagnosticar fallas | Diario | Alta |
| Apple PassKit + APNs | Sistema externo | Recibir/validar pkpass, entregar push updates | Tiempo real | N/A (API) |
| Google Wallet API | Sistema externo | Crear Loyalty Class/Object, recibir JWT signing | Tiempo real | N/A (API) |

---

## 3. Job stories

- **JS-1** *(merchant)*: When un cliente nuevo está pagando en el mostrador, I want que escanee un QR y quede registrado con tarjeta en su Wallet, so no pierdo el momento de capturar al cliente.
- **JS-2** *(end_customer)*: When veo un QR de lealtad en un comercio donde compro frecuente, I want agregar la tarjeta a mi Wallet con un tap, so no tengo que recordar dónde la guardé.
- **JS-3** *(end_customer)*: When acabo de comprar y el merchant me dio puntos, I want que el balance se actualice automático en mi Wallet, so abro mi celular y veo el saldo real sin abrir nada más.
- **JS-4** *(end_customer)*: When paso cerca del comercio donde tengo tarjeta activa, I want recibir notificación lockscreen, so me acuerdo de pasar a usarla.
- **JS-5** *(integra_admin)*: When la adopción de Wallet en un comercio baja del baseline, I want ver el funnel de drop-off (escaneo → landing → add → activación), so puedo identificar dónde se está rompiendo.

---

## 4. Acceptance criteria

- [ ] **AC-1** *(JS-1, JS-2)*: Given un end_customer escanea un QR válido de comercio activo, when llega a la landing del comercio, then ve dos CTAs ("Add to Apple Wallet" / "Add to Google Wallet") detectados por user-agent (iOS Safari → Apple primero; Android Chrome → Google primero) en <1s del page load.

- [ ] **AC-2** *(JS-2)*: Given un end_customer con iOS 14+ tappa "Add to Apple Wallet", when el backend firma el .pkpass con cert válido y lo entrega, then Safari abre el pass en Wallet nativo en <3s y el end_customer puede confirmar "Add" sin más fricción. p95 latencia generación pass < 2s.

- [ ] **AC-3** *(JS-2)*: Given un end_customer con Android tappa "Add to Google Wallet", when el backend genera el JWT signing con Loyalty Object válido, then Chrome abre Google Wallet y el end_customer puede confirmar "Add" en <3s. p95 latencia generación JWT < 1s.

- [ ] **AC-4** *(JS-3)*: Given un merchant otorga puntos a un end_customer con tarjeta activa, when el evento se persiste en DDB, then el sistema **intenta** push update vía APNs/Google Wallet API en <60s p95 medido desde DDB commit hasta API call success (controlable por Integra). El **delivery time** al device queda fuera del SLA contractual — es best-effort dependiente de APNs/Google. Push notification opcional configurable por tenant.

- [ ] **AC-5** *(JS-4)*: Given un end_customer con tarjeta activa habilitó notificaciones, when entra al geofence configurado del comercio (radio configurable 100-500m), then el lockscreen muestra notificación con el saldo actual y CTA al comercio. Tasa de delivery >90% (APNs/Google).

- [ ] **AC-6** *(fallback PWA)*: Given un end_customer en un device sin Apple Wallet ni Google Wallet (Android antiguo, navegador no soportado, Wallet deshabilitado), when llega a la landing del comercio, then se le ofrece "PWA fallback" con login magic-link y vista similar a Wallet. PWA debe abrir sin internet (service worker cache).

- [ ] **AC-7** *(JS-5)*: Given un integra_admin abre el dashboard de adopción, when filtra por comercio y rango de fechas, then ve funnel con 4 etapas: scanned (QR escaneado) → landed (llegó a landing) → tapped (tappeó "Add to Wallet") → activated (pass se materializó). Drop-off por etapa visible con %.

- [ ] **AC-8** *(observabilidad)*: Given cualquier failure en el flow (cert expirado, APNs error, JWT invalid), when ocurre, then se loguea en CloudWatch con trace ID, end_customer no ve error técnico (mensaje friendly + fallback PWA ofrecido), y integra_admin recibe alerta si >5 failures/min en 5 min consecutivos.

---

## 5. Out of scope

- **No se incluye Samsung Wallet** — razón: <3% market share en México, ROI no justifica complejidad. Reevaluar en mes 12.
- **No se incluye Apple Wallet en macOS / iPadOS Wallet sync** — razón: scope mobile-first; revisar después.
- **No se incluye transferencia de tarjeta entre devices** — razón: Apple/Google manejan sync nativo vía iCloud/Google account; no construimos nuestra capa.
- **No se incluye multi-tarjeta del mismo comercio para un mismo end_customer** — razón: 1 cliente ↔ 1 comercio ↔ 1 tarjeta. Si quiere segunda, debe ser otro programa.
- **No se incluye auth con biométricos** — razón: el pass vive en Wallet nativo, ya tiene la seguridad del OS. Para PWA fallback, magic-link es suficiente.
- **No se incluye soporte de Apple Wallet sin Apple ID** — razón: edge case <0.1%, redirigir a PWA fallback es aceptable.
- **No se incluye en Phase 1 deep-linking entre apps de comercio (ej. abrir su menú desde el pass)** — razón: scope creep, validar primero adopción simple.

---

## 6. KPIs / Success metrics

| Métrica | Baseline (hoy) | Target | Cómo medir | Cuándo evaluar |
|---|---|---|---|---|
| **Adopción Wallet** (% de end_customers que activan vía Wallet vs PWA) | TBD (Q-1 — research) | >65% al mes 6 | Funnel CloudWatch + DDB | mensual |
| **Time-to-first-card** (median seg. desde escaneo QR a pass en Wallet) | TBD (Q-1 — research) | <120s p50, <300s p95 | Trace ID en logs | semanal post-launch |
| **Tasa éxito "Add to Wallet" tap** (% tappers que completan add) | TBD (Q-1 — research) | >95% | Frontend tracking + APNs/Google API success | diario |
| **p95 latencia generación pass** | N/A | <2s Apple, <1s Google | CloudWatch metric Lambda | diario |
| **Push update success rate** (% de puntos actualizados que llegan al device <60s) | N/A | >95% APNs, >98% Google | APNs/Google API response logs | semanal |
| **Drop-off escaneo→activación** | TBD (Q-1) | <20% combinado | Funnel dashboard | semanal |

---

## 7. Constraints

- **Regulatorio (LFPDPPP):** datos personales del end_customer (teléfono E.164 master + email opcional) deben encriptarse en reposo (DDB encryption) y en tránsito (TLS 1.2+). Aviso de privacidad explícito en la landing antes del "Add to Wallet". **Política de retención post-borrado (Q-6):** soft-delete 90 días con `deleted_at` en DDB → hard-delete por TTL al día 91. Historial agregado (sin PII) se mantiene indefinido para analytics.
- **Identidad end_customer (Q-7):** phone E.164 como master ID; Cognito sub generado en primer Add to Wallet; email opcional. Cambio de teléfono requiere flow de "claim" con SMS al teléfono viejo. PWA fallback identifica vía SMS magic-link al mismo phone (proveedor SMS se decide en system-design).
- **Apple Pass Type ID (Q-5):** uno compartido `pass.ai.integra-group.lealtad`, visuals (logo, color, nombre comercio) en el pass payload. Plan de migración a Pass Type ID por tier si Apple cuestiona después de >100 tenants.
- **Técnico — devices mínimos:**
  - iOS 13+ (Apple Wallet con PassKit 2)
  - Android 8+ con Google Play Services 18+ (Google Wallet API)
  - Browser: Safari iOS, Chrome Android (Firefox/Samsung Browser deben fallback a PWA)
- **Técnico — stack obligatorio:** Lambda + Hono + Zod + DynamoDB single-table + Cognito (definido en CLAUDE.md raíz)
- **Presupuesto AWS:** este feature solo (Lambda + APNs + Google Wallet calls) <$15 USD/mes con 100 tenants activos
- **Dependencias externas:**
  - Apple Developer Program **Organization** (no Individual) — requiere DUNS, ~24h-1 semana aprobación
  - Google Cloud project con Google Wallet API enabled (gratis al volumen inicial)
  - APNs cert renovado anualmente (proceso documentado en runbook)
- **Performance:** funcionamiento aceptable en conexiones móviles de 3G (loading time tolerable hasta 5s)

---

## 8. Edge cases

**Genéricos:**
- **EC-1:** ¿Qué pasa si el end_customer pierde conexión a mitad del "Add to Wallet"? → Backend genera pass de forma idempotente, segundo tap reanuda sin duplicar.
- **EC-2:** ¿Qué pasa si dos taps simultáneos del mismo end_customer? → Idempotency key por (customer_id, merchant_id), backend retorna mismo pass.
- **EC-3:** ¿Qué pasa con end_customers que ya tenían tarjeta de antes en otro programa de Integra? → Misma identidad Cognito, balance separado por (customer_id, merchant_id).
- **EC-4:** ¿Cómo responde el sistema bajo carga 10x baseline (campaign massive)? → Lambda concurrency reservada por tenant; rate limiting; alerta a integra_admin si throttling >1%.

**Específicos de dominio loyalty (del banco del SKILL):**
- **EC-5:** ¿Qué pasa si un end_customer acumula puntos en un comercio que después cancela suscripción? → Tarjeta queda freeze; push notification al end_customer ofreciendo canjear antes del corte (configurable 30 días grace).
- **EC-6:** ¿Qué pasa si un end_customer intenta canjear con saldo insuficiente (race condition entre dos devices)? → DDB conditional write, segundo intento falla con mensaje claro. (Nota: canje cubierto en BR separado `points-redemption`, este BR solo cubre onboarding.)
- **EC-7:** ¿Qué pasa con passes Apple Wallet cuando el comercio cambia su logo/branding después de que el cliente ya agregó la tarjeta? → APNs push fuerza re-fetch del pass; logo actualiza en <60s en el device.
- **EC-8:** ¿Qué pasa si un end_customer regresa después de 1+ año (pass en Wallet pero inactivo)? → Pass se mantiene; backend reactiva al primer touch de saldo nuevo. Si pasaron >24 meses sin uso, pass expira (configurable).

**Específicos Apple/Google Wallet:**
- **EC-9:** ¿Qué pasa si el cert Apple expira? → Alerting con 30 días de anticipación; runbook de rotación documentado. Passes existentes mantienen visibilidad pero updates fallan hasta rotar.
- **EC-10:** ¿Qué pasa si Apple rechaza el cert recién emitido (branding/nombre incorrecto)? → Apple Developer team revisa nombre/logo del Pass Type ID antes de generar el cert. Smoke test pre-producción con cert sandbox.
- **EC-11:** ¿Qué pasa si APNs/Google rechaza un device token (revoked)? → Reconciliación periódica (daily job) que limpia tokens muertos; end_customer re-agrega si quiere updates.

---

## 9. Open questions

### Abiertas (bloquean `finalize`)

- [ ] **Q-1:** ¿Cuáles son los baselines de adopción/time-to-first-card/conversión en programas comparables (Loyverse en México, Square Loyalty)? Sin baseline, los targets son aspiracionales. *Owner: Jorge — research 1 semana*.
- [ ] **Q-2:** ¿Tenemos cuenta Apple Developer **Organization** activa con DUNS? Si no, ¿cuándo arrancamos el trámite? *Bloqueador duro para Apple Wallet — alinear con system-design phase.*

### Resueltas (interview round 1 — 2026-05-13)

- [x] **Q-3:** SLA push updates → **aspiracional** (best-effort, no contractual). AC-4 reformulado.
- [x] **Q-4:** PWA fallback identifier → **SMS al phone E.164** (resuelto por Q-7). Proveedor SMS se decide en system-design.
- [x] **Q-5:** Pass Type ID → **uno compartido** `pass.ai.integra-group.lealtad` con visuals templated por tenant. Plan de migración a Pass Type ID por tier si Apple cuestiona >100 tenants.
- [x] **Q-6:** Retención post-borrado → **soft-delete 90 días, después hard-delete por TTL**. Historial agregado sin PII se mantiene.
- [x] **Q-7:** Identidad end_customer → **phone E.164 master + Cognito sub + email opcional**. Cambio de teléfono requiere SMS-claim al teléfono viejo.

---

## 10. Sign-off

- [ ] Cliente revisó: TODO (Integra es cliente de sí mismo en este caso — necesita firma de stakeholder de producto)
- [ ] Integra revisó: TODO (Jorge + lead técnico)
- [ ] Todos los AC pasaron review de testabilidad
- [ ] Todos los KPIs tienen baseline + target
- [ ] Out-of-scope explícito y justificado
- [ ] Cero open questions abiertas — **7 abiertas hoy, bloquean finalize**

**Status final:** draft

---

## Referencias

- Job stories vs user stories: https://jtbd.info/job-stories
- Given/When/Then (Cucumber): https://cucumber.io/docs/gherkin/
- Apple PassKit Programming Guide: https://developer.apple.com/documentation/walletpasses
- Google Wallet API — Loyalty: https://developers.google.com/wallet/retail/loyalty-cards
- LFPDPPP arts. 22-26 (derechos ARCO): https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf
