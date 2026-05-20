# PRODUCTION.md — De la demo a producción (Apple Wallet)

Este documento traza la ruta exacta para pasar del preview visual / `.pkpass`
local a un sistema productivo en AWS Lambda, y **cómo obtener y conectar el
certificado Apple real** (riesgo #5 del CLAUDE.md: la cuenta Apple Developer
$99/año aún no existe).

---

## Estado actual

| Pieza | Estado |
|---|---|
| `pass.json` (storeCard, branding por comercio) | Hecho |
| Preview visual sin cert (`npm run demo`) | Hecho — reproducible sin nada |
| `.pkpass` firmado local (`npm run generate`) | Listo, **bloqueado por falta de cert Apple** |
| Cuenta Apple Developer Organization | **NO existe — bloqueante** |
| Lambda dinámica + DynamoDB + APNs | Diseñado aquí, no implementado |

La demo NO depende del cert: `npm run demo` siempre produce el artefacto
visual. El cert solo desbloquea el `.pkpass` instalable real.

---

## Parte A — Obtener el certificado Apple (la parte que falta)

### A.1 Abrir la cuenta Apple Developer **Organization** (~1 semana)

No sirve una cuenta Individual: para que el pass diga "Integra Group AI" como
emisor y para multi-tenant, se necesita **Organization**.

1. **Conseguir el D-U-N-S Number** de la entidad legal (Integra Group AI / razón
   social MX). Gratis en https://developer.apple.com/enroll/duns-lookup/
   - Si no existe, Apple lo tramita con D&B. **Aquí está la semana de espera.**
   - Requiere: razón social legal exacta, dirección fiscal, teléfono verificable.
2. Enrolar en https://developer.apple.com/programs/enroll/ como **Organization**.
   - Apple llama por teléfono a verificar autoridad legal del firmante.
3. Pagar **$99 USD/año**.
4. Anotar el **Team ID** (10 chars, p.ej. `L2A48F6TTL`) → va a `TEAM_ID`.

> Mientras tanto: la demo visual (`npm run demo`) ya es presentable a clientes.

### A.2 Crear el Pass Type ID

Developer Portal → Certificates, Identifiers & Profiles → **Identifiers** → `+`
→ **Pass Type IDs** → Identifier: `pass.ai.integragroup.lealtad` → Register.
→ va a `PASS_TYPE_ID`. (Un solo Pass Type ID para toda la plataforma; el
branding por comercio se resuelve dentro del `pass.json`.)

### A.3 Generar el certificado PassKit

1. Keychain Access → Certificate Assistant → *Request a Certificate From a CA*
   → "Saved to disk" → genera `CertificateSigningRequest.certSigningRequest`.
2. Portal → **Certificates** → `+` → **Pass Type ID Certificate** → elige el
   Pass Type ID → sube el CSR → descarga `pass.cer`.
3. Doble click en `pass.cer` (entra a Keychain con su private key).
4. En Keychain, selecciona cert **+** private key → Export 2 items → `.p12`
   con password.

### A.4 Convertir `.p12` → 3 PEM y dejarlos donde el código los espera

El código (`generate-demo.js`) los lee de `demo-pass/certs/`:

```bash
# macOS usa LibreSSL: SIN -legacy. OpenSSL 3.x (Linux/brew): CON -legacy.
openssl pkcs12 -in pass.p12 -clcerts -nokeys \
  -out certs/signerCert.pem -passin pass:P12_PASS
openssl pkcs12 -in pass.p12 -nocerts \
  -out certs/signerKey.pem  -passin pass:P12_PASS -passout pass:KEY_PASS
curl -o wwdr.cer https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
openssl x509 -inform DER -in wwdr.cer -out certs/wwdr.pem
```

Resultado en `certs/`: `signerCert.pem`, `signerKey.pem`, `wwdr.pem`.
**Los 3 están en `.gitignore` — NUNCA se commitean.** Confirmado: el historial
git completo no contiene ningún PEM/P12/key/cer/env (solo `certs/.gitkeep`).

### A.5 Configurar env y generar el `.pkpass` real

```bash
cp .env.example .env
# PASS_TYPE_ID=pass.ai.integragroup.lealtad
# TEAM_ID=<Team ID de A.1>
# SIGNER_PASS=<KEY_PASS de A.4>
npm install        # passkit-generator + sharp
npm run demo       # ahora detecta certs/ y FIRMA el .pkpass automáticamente
```

`demo.js` detecta los 3 PEM y, si están, ejecuta el firmado además del
preview. Sin cambios de código entre demo y "con cert real".

---

## Parte B — Productivo en AWS Lambda

### B.1 Endpoint de generación dinámica

```
GET /v1/passes/{tenantId}/{customerId}.pkpass   (Lambda + Hono)
```
- Lee comercio + cliente de **DynamoDB** (single-table, PK `TENANT#<id>`,
  SK `CUSTOMER#<id>`): nombre, sellos, tier, branding (colores, logo S3).
- Construye el `pass.json` en memoria desde una plantilla (este mismo
  `storeCard`), inyectando datos del tenant/cliente.
- Firma con `passkit-generator` y devuelve
  `Content-Type: application/vnd.apple.pkpass`.
- Persiste metadata: `serialNumber`, `authenticationToken` (random ≥16 chars),
  `pushToken`, `updatedAt`.

`pass.json` productivo añade respecto al demo:
```jsonc
"webServiceURL": "https://api.integra-group.ai/wallet",
"authenticationToken": "<random por pass, en DynamoDB>"
```

### B.2 Certificados en **Secrets Manager** (no filesystem)

Secreto `integra-loyalty/applewallet/certs` (JSON con los 3 PEM + passphrase).
En el handler:

```js
const { SecretsManagerClient, GetSecretValueCommand } =
  require('@aws-sdk/client-secrets-manager');
// cachear en /tmp o en memoria del container entre invocaciones (warm)
```
IAM: la Lambda solo con `secretsmanager:GetSecretValue` sobre ese ARN.
Rotación manual agendada (cert PassKit expira ~1 año; recordatorio -30 días).

### B.3 PassKit Web Service (4 endpoints Lambda)

```
POST   /v1/devices/{deviceId}/registrations/{passTypeId}/{serial}   registrar
DELETE /v1/devices/{deviceId}/registrations/{passTypeId}/{serial}   des-registrar
GET    /v1/devices/{deviceId}/registrations/{passTypeId}?passesUpdatedSince=  seriales cambiados
GET    /v1/passes/{passTypeId}/{serial}                              último .pkpass
POST   /v1/log                                                       logs de Wallet
```
Auth: header `Authorization: ApplePass <authenticationToken>` validado contra
DynamoDB. HTTPS obligatorio (API Gateway + ACM). Tabla de registros:
`DEVICE#<id>` ↔ `PASS#<serial>` + `pushToken`.

### B.4 APNs push al cambiar sellos/puntos

1. Mutación de sellos → update DynamoDB.
2. Lambda manda push APNs (token-based JWT, key `.p8` también en Secrets
   Manager) a los `pushToken` registrados para ese serial. Payload vacío.
3. Wallet llama `GET /v1/passes/...` → Lambda regenera y devuelve el `.pkpass`
   con `changeMessage` ("Ahora tienes %@ sellos").

### B.5 Google Wallet (paralelo, sin DUNS)

- Service Account en Google Cloud + Google Wallet API habilitada.
- 1 `LoyaltyClass` por comercio; 1 `LoyaltyObject` por cliente.
- Botón "Add to Google Wallet" = link con **JWT firmado** (RS256, key del
  service account en Secrets Manager) que embebe el LoyaltyObject.
- Updates: PATCH REST al `LoyaltyObject` al cambiar puntos. **No requiere
  Apple Developer**, se puede avanzar ya mientras llega el DUNS.

### B.6 Orden recomendado

1. Google Wallet primero (desbloqueado hoy).
2. En paralelo: tramitar DUNS + cuenta Apple Org (semana de espera).
3. Llega cert Apple → secreto en Secrets Manager → endpoint B.1.
4. PassKit Web Service B.3 + APNs B.4.
5. Editor de branding por comercio (logo→S3) alimenta el `pass.json` dinámico.

---

## Checklist de seguridad (verificado en la demo)

- [x] `certs/*.pem`, `*.p12`, `*.key`, `*.cer`, `.env` en `.gitignore`.
- [x] Historial git completo sin credenciales (solo `certs/.gitkeep`).
- [x] `passTypeIdentifier`/`teamIdentifier`/passphrase desde env, no en código.
- [x] `pass.json` versionado usa `"PLACEHOLDER"`; se sobreescribe al firmar.
- [ ] Producción: PEM en Secrets Manager, nunca en filesystem ni en la imagen.
- [ ] `authenticationToken` único por pass, aleatorio, en DynamoDB.
