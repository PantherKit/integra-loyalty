# Integra Lealtad — Demo Pass Apple Wallet

Demo de tarjeta de lealtad para Apple Wallet (comercio demo: **Marquesitas OMO**).

Hay **dos modos**, un solo comando: `npm run demo`.

| Modo | Cuándo | Salida |
|---|---|---|
| **Preview visual** (siempre) | No requiere cert Apple ni `npm install` | `dist/preview.html` + `dist/preview.svg` — frente y reverso de la tarjeta con el branding del comercio. Esto se le enseña al cliente HOY. |
| **`.pkpass` firmado** (auto) | Cuando existen los 3 PEM en `certs/` | `demo-integra-lealtad.pkpass` instalable en iPhone |

`demo.js` detecta solo si hay certificado y hace lo que corresponda, sin cambiar
código ni comandos.

```bash
cd demo-pass
npm run demo                    # sin cert: genera el preview visual
open dist/preview.html          # ver la tarjeta (cualquier navegador)
```

> El preview NO tiene dependencias (solo Node built-in). No se bloquea por la
> falta de la cuenta Apple Developer ($99/año, ~1 semana por DUNS).

**Para conseguir y conectar el certificado Apple real** (abrir cuenta Apple
Developer Organization, DUNS, Pass Type ID, generar y colocar los PEM) ver
**[`PRODUCTION.md`](./PRODUCTION.md) — Parte A**, y los Pasos 1-5 de abajo.

---

## Prerequisitos (solo para el `.pkpass` firmado)

- Apple Developer Program activo (cuenta de organización de Integra)
- Node.js >= 18
- OpenSSL en la terminal (viene instalado en macOS)
- iPhone con iOS 11+ para probar la instalación

---

## Paso 1: Crear el Pass Type ID en Apple Developer Portal

1. Ve a [developer.apple.com](https://developer.apple.com) > Certificates, Identifiers & Profiles
2. En el menú izquierdo selecciona **Identifiers**
3. Haz click en el botón **+** (agregar nuevo)
4. Selecciona **Pass Type IDs** y haz click en **Continue**
5. En **Description**: `Integra Lealtad`
6. En **Identifier**: `pass.ai.integragroup.lealtad`
   - El formato siempre es `pass.` + dominio invertido. Usa el dominio real de Integra.
7. Haz click en **Continue** y luego **Register**

Anota el identificador exacto. Lo necesitas en `.env` como `PASS_TYPE_ID`.

---

## Paso 2: Generar el certificado PassKit

1. En Apple Developer Portal ve a **Certificates** > **+** (agregar nuevo)
2. En la sección **Services**, selecciona **Pass Type ID Certificate**
3. Selecciona el Pass Type ID que acabas de crear: `pass.ai.integragroup.lealtad`
4. Apple te pedirá un **Certificate Signing Request (CSR)**

**Generar el CSR en macOS:**
1. Abre **Keychain Access** (aplicación del sistema)
2. Menú: **Keychain Access** > **Certificate Assistant** > **Request a Certificate From a Certificate Authority...**
3. Rellena:
   - User Email: tu email de Apple Developer
   - Common Name: `Integra Lealtad Pass`
   - Request is: **Saved to disk**
4. Guarda el archivo `.certSigningRequest`

5. Vuelve al portal de Apple, sube el CSR y descarga el certificado `.cer` resultante

---

## Paso 3: Preparar los certificados

Necesitas **3 archivos PEM** en la carpeta `certs/`:

```
certs/
├── wwdr.pem          <- Certificado raíz de Apple
├── signerCert.pem    <- Tu certificado PassKit (solo el cert, sin key)
└── signerKey.pem     <- Tu private key (protegida con passphrase)
```

### 3.1 — Importar y exportar el certificado como .p12

1. Haz doble click en el `.cer` descargado de Apple → se importa en Keychain Access
2. En Keychain Access, busca el certificado: "Pass Type ID: pass.ai.integragroup.lealtad"
3. Expande el certificado → debe mostrar la private key debajo
4. Selecciona **ambos** (el certificado y la private key)
5. Click derecho > **Export 2 items...**
6. Guarda como `integra-lealtad-pass.p12`
7. Pon una contraseña segura (la necesitarás en el siguiente paso, llámala `TU_P12_PASSWORD`)

### 3.2 — Convertir .p12 a archivos PEM

Abre la terminal en el directorio `demo-pass/` y ejecuta:

```bash
# 1. Extraer el certificado (signerCert.pem)
openssl pkcs12 -legacy \
  -in integra-lealtad-pass.p12 \
  -clcerts -nokeys \
  -out certs/signerCert.pem \
  -passin pass:TU_P12_PASSWORD

# 2. Extraer la private key (signerKey.pem)
#    Elige una passphrase para proteger la key (TU_SIGNER_PASSPHRASE)
openssl pkcs12 -legacy \
  -in integra-lealtad-pass.p12 \
  -nocerts \
  -out certs/signerKey.pem \
  -passin pass:TU_P12_PASSWORD \
  -passout pass:TU_SIGNER_PASSPHRASE
```

> **Nota:** El flag `-legacy` es necesario en OpenSSL 3.x (macOS Ventura y posterior).
> Si ves el error "no start line", prueba sin `-legacy`.

### 3.3 — Descargar el certificado WWDR de Apple (G4)

```bash
# Descargar el certificado raíz de Apple (WWDR G4)
curl -o AppleWWDRCAG4.cer https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer

# Convertir de DER a PEM
openssl x509 -inform DER -in AppleWWDRCAG4.cer -out certs/wwdr.pem
```

Verifica que los 3 archivos estén en `certs/`:
```bash
ls -la certs/
# Debe mostrar: wwdr.pem, signerCert.pem, signerKey.pem
```

---

## Paso 4: Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env`:
```
PASS_TYPE_ID=pass.ai.integragroup.lealtad   # tu identifier exacto
TEAM_ID=AB1234WXYZ                           # tu Team ID de Apple Developer
SIGNER_PASS=TU_SIGNER_PASSPHRASE            # la passphrase del paso 3.2
```

**¿Dónde encuentro el Team ID?**
En [developer.apple.com](https://developer.apple.com), en la esquina superior derecha al ver el perfil, o al pie de la página principal del portal. Formato: 10 caracteres alfanuméricos, ej: `AB1234WXYZ`.

---

## Paso 5: Instalar dependencias y generar el pass

```bash
npm install
npm run generate
```

Si todo está correcto, verás:
```
--- Integra Lealtad: Generador de Pass Demo ---

  Pass Type ID : pass.ai.integragroup.lealtad
  Team ID      : AB1234WXYZ

Preparando assets...
  [OK] 7 assets PNG creados en pass-model/
Firmando y empaquetando pass...

[OK] Pass generado exitosamente:
     /ruta/.../demo-integra-lealtad.pkpass
```

---

## Paso 6: Instalar en iPhone para la demo

> El pass **debe abrirse desde Safari en iOS**. Chrome y otros browsers no abren Apple Wallet.

### Opción A — AirDrop (más rápido, ideal para demo en vivo)
1. En Finder, localiza `demo-integra-lealtad.pkpass`
2. Click derecho > Compartir > AirDrop → selecciona el iPhone
3. En el iPhone acepta → Apple Wallet se abre automáticamente

### Opción B — Servidor HTTP local (cualquier iPhone en la misma red WiFi)
```bash
npx serve . --cors
# Muestra algo como: http://192.168.1.100:3000
```
Abre Safari en el iPhone y ve a:
```
http://192.168.1.100:3000/demo-integra-lealtad.pkpass
```
Safari reconoce el MIME type `application/vnd.apple.pkpass` y lo abre en Wallet.

### Opción C — QR code para demo sin cables
```bash
# Genera QR del link al servidor local
npx qrcode-terminal "http://192.168.1.100:3000/demo-integra-lealtad.pkpass"
```

---

## Personalizar el pass demo

Edita `integra-lealtad.pass/pass.json` para cambiar:
- **logoText**: nombre del comercio
- **storeCard.primaryFields.value**: sellos/puntos del cliente
- **storeCard.secondaryFields / backFields**: datos del cliente y comercio
- **backgroundColor / foregroundColor / labelColor**: colores de branding
- **barcodes.message**: identificador del cliente
- **locations**: coordenadas del comercio (geofence en lock screen)

`pass.json` es la única fuente de verdad: el mismo archivo alimenta el preview
visual (`npm run preview`) y el `.pkpass` firmado. Tras editarlo, vuelve a
correr `npm run demo`.

Para assets reales (logo, ícono, strip image), reemplaza los PNG generados en `integra-lealtad.pass/` con las imágenes del comercio. Borra los PNG existentes y el script los regenerará como placeholder si no los encuentra.

---

## Estructura del proyecto

```
demo-pass/
├── .env.example          <- Plantilla de variables de entorno
├── .gitignore            <- Excluye certs/, *.pkpass, dist/ del repo
├── package.json
├── demo.js               <- Orquestador: preview siempre + .pkpass si hay cert
├── preview.js            <- Artefacto visual sin cert (cero dependencias)
├── generate-demo.js      <- Firma y empaqueta el .pkpass (requiere certs)
├── PRODUCTION.md         <- Cómo obtener el cert Apple + ruta a Lambda
├── dist/                 <- preview.html / preview.svg (gitignored)
├── integra-lealtad.pass/
│   ├── pass.json         <- Template del pass (storeCard) — fuente de verdad
│   └── *.png             <- Assets generados (gitignored)
└── certs/
    ├── .gitkeep
    ├── wwdr.pem          <- Gitignored — agregar manualmente
    ├── signerCert.pem    <- Gitignored — agregar manualmente
    └── signerKey.pem     <- Gitignored — agregar manualmente
```

---

## Errores comunes

| Error | Causa | Solución |
|---|---|---|
| `no start line` | OpenSSL 3.x sin `-legacy` | Agrega el flag `-legacy` al comando |
| `certificate` en el error | `PASS_TYPE_ID` no coincide con el cert | Verifica que el identifier sea exactamente igual |
| `bad decrypt` | Passphrase incorrecta | Verifica `SIGNER_PASS` en `.env` |
| `Cannot find module 'passkit-generator'` | Falta `npm install` | Ejecuta `npm install` primero |
| Safari descarga el archivo en vez de abrirlo | Servidor sin MIME type correcto | Usa `npx serve` que configura el MIME type automáticamente |

---

## Siguiente paso (post-demo)

Una vez validada la demo, la implementación productiva incluye:

1. **Endpoint Lambda**: genera passes dinámicamente por `tenantId` + `customerId`
2. **DynamoDB**: almacena membresías y registros de devices Apple
3. **PassKit Web Service**: endpoints para que Apple Wallet registre/desregistre devices
4. **APNs**: notificaciones push cuando cambian los puntos
5. **Secrets Manager**: certificados fuera del repo, rotación automática
6. **S3**: almacenamiento de passes generados y assets de branding por comercio
