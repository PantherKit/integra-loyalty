# DEVLOG — Apple Wallet Pass Demo

Registro técnico completo de la implementación del pass de demostración de Integra Lealtad para Apple Wallet. Sirve como referencia para el equipo y como base para la implementación productiva.

**Fecha:** 17 mayo 2026
**Branch:** `feat/apple-pass`
**Autor:** Equipo Integra Group AI

---

## Contexto

Se necesitaba una demo funcional e instalable en Apple Wallet para el mismo día. El objetivo no era un sistema productivo completo, sino el camino más corto para tener un `.pkpass` real firmado con certificado de Integra que un prospect pudiera instalar en su iPhone.

**Alcance de la demo:**
- Pass real firmado con certificado Apple de Integra
- Tipo `storeCard` (el correcto para programas de lealtad)
- Datos de un comercio ficticio (Café Roma) y cliente ficticio (Juan García)
- Instalable con un tap desde Safari en iOS

**Fuera del alcance (queda para la implementación productiva):**
- Updates push de puntos (APNs)
- PassKit Web Service (registro de devices)
- Multi-tenancy real
- Generación dinámica desde base de datos

---

## Decisiones Técnicas

### Tipo de pass: `storeCard` en lugar de `generic`

Apple PassKit tiene 5 tipos: `boardingPass`, `coupon`, `eventTicket`, `generic`, y `storeCard`. Para tarjetas de lealtad el tipo correcto es `storeCard` porque:

- Es el tipo semántico que Apple asocia a loyalty/rewards
- Habilita el campo `strip.png` (imagen detrás de los puntos)
- Siri y Spotlight lo tratan como tarjeta de comercio
- Wallet lo agrupa correctamente con otras tarjetas de tiendas

La documentación de hace 2-3 años en el equipo usaba `generic`, lo cual funciona pero pierde contexto semántico.

### Un solo Pass Type ID para todos los merchants

Se registró `pass.ai.integragroup.lealtad` como identificador único de toda la plataforma. La alternativa era un Pass Type ID por comercio.

Razones para un solo ID en esta etapa:
- Un solo certificado que gestionar y renovar
- Menos overhead operativo
- Branding por comercio se maneja dentro del pass (colores, logo, nombre)
- Suficiente para MVP y primeros 250 comercios objetivo

Cuando un merchant enterprise grande requiera ser el issuer nominal en Wallet (que el pass diga su nombre en lugar de Integra), se revisa. Por ahora no aplica.

### `barcodes` (plural) en lugar de `barcode` (singular)

El campo `barcode` singular está deprecado en PassKit. Se usa el array `barcodes` que soporta múltiples formatos. El barcode del pass tiene como valor el ID de membresía del cliente (`INTEGRA-DEMO-001`) — en producción será el `customerId` del tenant.

### Geofence incluido desde la demo

El `pass.json` incluye un array `locations` con las coordenadas de Café Roma en Roma Norte, CDMX. Cuando el portador del pass esté cerca, iOS muestra una notificación en el lock screen. Es un diferenciador visible en demo en vivo que conviene mostrar.

### Generador de PNG en pure Node.js

Los assets de Apple Wallet (icon, logo, strip) requieren archivos PNG en dimensiones específicas. En lugar de agregar `sharp`, `jimp` u otra dependencia nativa para generarlos, se implementó un generador PNG mínimo usando solo `zlib` (built-in de Node.js).

El resultado son imágenes de color sólido — funcionales, sin dependencias adicionales, reemplazables con assets reales de branding sin tocar el script.

### Variables sensibles en `.env`, no en código

`passTypeIdentifier`, `teamIdentifier` y `signerKeyPassphrase` se leen de variables de entorno vía `dotenv`. El `pass.json` en el repo tiene `"PLACEHOLDER"` en esos campos; el script los reemplaza en runtime vía los overrides de `PKPass.from()`.

---

## Estructura del Directorio

```
demo-pass/
├── DEVLOG.md                       ← este archivo
├── README.md                       ← guía de uso para desarrolladores
├── .env.example                    ← plantilla de variables (sin valores reales)
├── .gitignore                      ← excluye todo lo sensible
├── package.json                    ← única dependencia: passkit-generator
├── generate-demo.js                ← script principal
├── integra-lealtad.pass/
│   ├── pass.json                   ← template del pass (storeCard)
│   └── *.png                       ← assets generados en runtime (gitignored)
└── certs/
    ├── .gitkeep
    ├── signerCert.pem              ← gitignored — agregar manualmente
    ├── signerKey.pem               ← gitignored — agregar manualmente
    └── wwdr.pem                    ← gitignored — agregar manualmente
```

El directorio del modelo termina en `.pass` porque `passkit-generator` espera esa extensión. Aprendizaje del día: si el directorio se llama diferente, el error es críptico ("directory not found" con `.pass` appended).

---

## Certificados Apple

### Qué se creó en Apple Developer Portal

- **Pass Type ID:** `pass.ai.integragroup.lealtad`
- **Organization:** Jorge Jiménez / Integra Group AI (MX)
- **Team ID:** `L2A48F6TTL`
- **Vigencia del certificado:** hasta 16 junio 2027

### Los 3 archivos PEM requeridos para firmar

| Archivo | Qué es | Origen |
|---|---|---|
| `signerCert.pem` | Certificado PassKit público | Exportado del `.p12` con openssl |
| `signerKey.pem` | Private key protegida con passphrase | Exportado del `.p12` con openssl |
| `wwdr.pem` | Certificado intermedio de Apple (G4) | Descargado de apple.com/certificateauthority |

### Comandos usados para convertir el `.p12`

El OpenSSL incluido en macOS es LibreSSL, que **no soporta el flag `-legacy`**. Los comandos correctos para macOS son:

```bash
# Extraer el certificado público
openssl pkcs12 \
  -in integra-lealtad-pass.p12 \
  -clcerts -nokeys \
  -out certs/signerCert.pem \
  -passin pass:PASSWORD_DEL_P12

# Extraer la private key (con nueva passphrase para el PEM)
openssl pkcs12 \
  -in integra-lealtad-pass.p12 \
  -nocerts \
  -out certs/signerKey.pem \
  -passin pass:PASSWORD_DEL_P12 \
  -passout pass:PASSPHRASE_PARA_LA_KEY

# Descargar y convertir WWDR G4
curl -o AppleWWDRCAG4.cer https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
openssl x509 -inform DER -in AppleWWDRCAG4.cer -out certs/wwdr.pem
```

En OpenSSL 3.x (Linux, o si instalaste OpenSSL via Homebrew), se requiere agregar `-legacy` a los dos primeros comandos.

### Alerta de "certificate not trusted" en Keychain Access

Al importar el `.cer` descargado de Apple Developer, Keychain muestra el aviso rojo "certificate is not trusted". Es esperado y no afecta el proceso: significa que el certificado WWDR G4 de Apple no está en el trust store local de macOS. No es necesario instalarlo ahí porque lo usamos directamente como `wwdr.pem` en el script.

---

## Estructura del `pass.json` (storeCard)

```
┌─────────────────────────────────────────┐
│  [logoText]  logo.png          [NIVEL]  │  ← headerFields
│─────────────────────────────────────────│
│  strip.png (color sólido de fondo)      │
│              PUNTOS                     │  ← primaryFields
│              1,250                      │
│─────────────────────────────────────────│
│  MIEMBRO         DESDE                  │  ← secondaryFields
│  Juan García     Ene 2024               │
│─────────────────────────────────────────│
│  PROMOCIÓN                              │  ← auxiliaryFields
│  2x puntos este fin de semana           │
│                                         │
│  [QR code — INTEGRA-DEMO-001]           │  ← barcodes
└─────────────────────────────────────────┘

Al voltear el pass (back):
  - Comercio, Dirección
  - ID de Membresía
  - Términos y Condiciones
  - Email de soporte
```

### Campos y sus keys en `pass.json`

| Campo | key | Zona visual |
|---|---|---|
| `tier` | `tier` | Header derecha (Gold) |
| `points` | `points` | Primary (número grande) |
| `member` | `member` | Secondary izquierda |
| `since` | `since` | Secondary derecha |
| `promo` | `promo` | Auxiliary |
| `merchant_name` | `merchant_name` | Back |
| `merchant_addr` | `merchant_addr` | Back |
| `member_id` | `member_id` | Back |
| `terms` | `terms` | Back |
| `support` | `support` | Back |

Las keys deben ser únicas dentro del pass. El campo `changeMessage` en `points` usa `%@` como placeholder — cuando se actualice el valor del campo via APNs, Wallet mostrará ese mensaje (ej: "Tienes 1,350 puntos acumulados").

### Assets y sus dimensiones

| Asset | Dimensión 1x | Dimensión 2x | Zona |
|---|---|---|---|
| `icon.png` | 29×29 | 58×58 (+ 87×87 @3x) | Ícono de la app en notificaciones |
| `logo.png` | 160×50 | 320×100 | Esquina superior izquierda del pass |
| `strip.png` | 375×123 | 750×246 | Franja de color detrás del primaryField |

---

## Flujo de Generación

```
.env (PASS_TYPE_ID, TEAM_ID, SIGNER_PASS)
        │
        ▼
generate-demo.js
        │
        ├── validateConfig()      ← avisa si faltan env vars
        ├── validateCerts()       ← verifica los 3 PEM en certs/
        ├── ensureAssets()        ← crea PNGs si no existen
        │
        ├── PKPass.from({
        │     model: integra-lealtad.pass/   ← lee pass.json + assets
        │     certificates: { wwdr, signerCert, signerKey }
        │   }, {
        │     passTypeIdentifier,            ← override del PLACEHOLDER
        │     teamIdentifier                 ← override del PLACEHOLDER
        │   })
        │
        └── pass.getAsBuffer() → demo-integra-lealtad.pkpass
```

El `.pkpass` es un archivo ZIP con estructura interna:
```
demo-integra-lealtad.pkpass (ZIP)
├── pass.json
├── manifest.json     ← hashes SHA1 de cada archivo
├── signature         ← firma PKCS#7 con los certificados
├── icon.png / icon@2x.png / icon@3x.png
├── logo.png / logo@2x.png
└── strip.png / strip@2x.png
```

`passkit-generator` genera el `manifest.json` y la `signature` automáticamente.

---

## Cómo Instalar en iPhone

> El pass debe abrirse desde **Safari en iOS**. Chrome y otros browsers no tienen el handler para `application/vnd.apple.pkpass`.

**AirDrop** (más rápido en demo en vivo):
1. Finder → click derecho en `demo-integra-lealtad.pkpass` → Compartir → AirDrop
2. El iPhone acepta → Wallet se abre automáticamente

**Servidor HTTP local** (para compartir a múltiples iPhones en la misma red):
```bash
npx serve . --cors
# Abre desde Safari del iPhone: http://[IP-LOCAL]:3000/demo-integra-lealtad.pkpass
```

---

## Lo Que Falta Para Producción

Este demo cubre solo la generación estática. El sistema productivo requiere estas piezas adicionales:

### 1. Endpoint Lambda de generación dinámica

En lugar de un script local, un endpoint `POST /passes/{tenantId}/{customerId}` que:
- Lea datos del comercio y cliente desde DynamoDB
- Genere el pass con branding real del comercio (colores, logo desde S3)
- Devuelva el `.pkpass` con `Content-Type: application/vnd.apple.pkpass`
- Guarde metadata del pass en DynamoDB (serialNumber, authToken, updatedAt)

### 2. PassKit Web Service (registro de devices)

Cuando el usuario instala el pass, Apple Wallet registra el device contra un Web Service URL que debe estar en el `pass.json` junto con un `authenticationToken`. Requiere 4 endpoints Lambda:

```
POST   /v1/devices/{deviceId}/registrations/{passTypeId}/{serialNumber}
DELETE /v1/devices/{deviceId}/registrations/{passTypeId}/{serialNumber}
GET    /v1/devices/{deviceId}/registrations/{passTypeId}
GET    /v1/passes/{passTypeId}/{serialNumber}
```

Estos endpoints requieren HTTPS (no HTTP). Para la demo local se omitieron.

### 3. Push de actualizaciones con APNs

Cuando cambian los puntos de un cliente:
1. Se actualiza el registro en DynamoDB
2. Se manda push vía APNs al device registrado
3. iOS consulta el endpoint `GET /v1/passes/...`
4. El backend devuelve el pass actualizado
5. Wallet actualiza automáticamente sin acción del usuario

El `authenticationToken` en `pass.json` debe ser un string aleatorio largo generado por nosotros (mínimo 16 caracteres). Apple lo usa para autenticar las llamadas del device al Web Service.

### 4. Almacenamiento seguro de certificados

Los 3 PEM deben vivir en **AWS Secrets Manager**, no en el sistema de archivos. En Lambda:

```javascript
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
// Obtener signerKey.pem, signerCert.pem, wwdr.pem al inicio del handler
```

### 5. Assets de branding por comercio

Cada comercio necesita su propio `logo.png` y colores. El flujo productivo:
- Comercio sube logo desde el dashboard (editor drag-and-drop)
- Se almacena en S3 bajo `s3://bucket/tenants/{tenantId}/assets/`
- Al generar el pass, Lambda descarga los assets del comercio y los incluye

### 6. Renovación del certificado

El certificado PassKit vence el **16 junio 2027**. Antes de esa fecha hay que:
1. Generar nuevo CSR en Keychain Access
2. Subir a Apple Developer Portal
3. Descargar nuevo `.cer`, exportar nuevo `.p12`
4. Regenerar los 3 PEM
5. Actualizar el secreto en AWS Secrets Manager

Agendar recordatorio con 30 días de anticipación.

---

## Errores Encontrados y Soluciones

| Error | Causa | Solución |
|---|---|---|
| `unknown option '-legacy'` | macOS usa LibreSSL, no OpenSSL | Quitar el flag `-legacy` en macOS |
| `directory pass-model.pass not found` | `passkit-generator` exige extensión `.pass` en el directorio del modelo | Renombrar `pass-model/` a `integra-lealtad.pass/` |
| `certificate is not trusted` en Keychain | WWDR G4 no está en el trust store local | No es un error real; se resuelve solo al usar `wwdr.pem` en el script |
