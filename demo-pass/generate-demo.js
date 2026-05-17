'use strict';

require('dotenv').config();

const path = require('path');
const fs   = require('fs');
const zlib = require('zlib');
const { PKPass } = require('passkit-generator');

/* ─── CONFIG ──────────────────────────────────────────────────────────────
   Copia .env.example a .env y rellena los valores reales.
   También puedes exportarlos manualmente:
     export PASS_TYPE_ID=pass.ai.integragroup.lealtad
     export TEAM_ID=AB1234WXYZ
     export SIGNER_PASS=tu-passphrase
──────────────────────────────────────────────────────────────────────── */
const CONFIG = {
  passTypeIdentifier: process.env.PASS_TYPE_ID   || 'pass.ai.integragroup.lealtad',
  teamIdentifier:     process.env.TEAM_ID         || 'XXXXXXXXXX',
  signerKeyPassphrase: process.env.SIGNER_PASS    || '',
};

/* ─── PATHS ───────────────────────────────────────────────────────────── */
const CERTS_DIR  = path.join(__dirname, 'certs');
const MODEL_DIR  = path.join(__dirname, 'integra-lealtad.pass');
const OUTPUT     = path.join(__dirname, 'demo-integra-lealtad.pkpass');

/* ─── PNG GENERATOR (pure Node.js — sin dependencias externas) ────────────
   Genera PNGs de color sólido para los assets requeridos por Apple Wallet.
   Para producción, estos deberían ser imágenes de branding del comercio.
──────────────────────────────────────────────────────────────────────── */
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf    = Buffer.allocUnsafe(4);
  const crcBuf    = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length, 0);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

/**
 * Crea un PNG de color sólido RGB sin dependencias externas.
 * @param {number} width
 * @param {number} height
 * @param {[number, number, number]} rgb - valores 0-255
 * @returns {Buffer}
 */
function solidColorPNG(width, height, [r, g, b]) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 2; // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Cada scanline: 1 byte de filtro (none) + width*3 bytes RGB
  const scanline = Buffer.allocUnsafe(1 + width * 3);
  scanline[0] = 0;
  for (let x = 0; x < width; x++) {
    scanline[1 + x * 3] = r;
    scanline[2 + x * 3] = g;
    scanline[3 + x * 3] = b;
  }

  // Repetimos el scanline height veces
  const rawData = Buffer.concat(Array.from({ length: height }, () => scanline));
  const idat    = zlib.deflateSync(rawData, { level: 6 });

  return Buffer.concat([
    PNG_SIG,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ─── ASSETS ──────────────────────────────────────────────────────────────
   Apple Wallet requiere estas dimensiones específicas.
   strip.png aparece detrás de los primaryFields en un storeCard.
──────────────────────────────────────────────────────────────────────── */
const BRAND_COLOR  = [30,  60,  120]; // Azul Integra (fondo)
const ACCENT_COLOR = [20, 100,  180]; // Azul más claro para strip

const REQUIRED_ASSETS = [
  { name: 'icon.png',     w:  29, h:  29, color: BRAND_COLOR  },
  { name: 'icon@2x.png',  w:  58, h:  58, color: BRAND_COLOR  },
  { name: 'icon@3x.png',  w:  87, h:  87, color: BRAND_COLOR  },
  { name: 'logo.png',     w: 160, h:  50, color: BRAND_COLOR  },
  { name: 'logo@2x.png',  w: 320, h: 100, color: BRAND_COLOR  },
  { name: 'strip.png',    w: 375, h: 123, color: ACCENT_COLOR },
  { name: 'strip@2x.png', w: 750, h: 246, color: ACCENT_COLOR },
];

function ensureAssets() {
  if (!fs.existsSync(MODEL_DIR)) {
    fs.mkdirSync(MODEL_DIR, { recursive: true });
  }

  let created = 0;
  for (const { name, w, h, color } of REQUIRED_ASSETS) {
    const dest = path.join(MODEL_DIR, name);
    if (!fs.existsSync(dest)) {
      fs.writeFileSync(dest, solidColorPNG(w, h, color));
      created++;
    }
  }

  if (created > 0) {
    console.log(`  [OK] ${created} assets PNG creados en pass-model/`);
    console.log('       (Reemplaza con imagenes reales de branding para produccion)');
  } else {
    console.log('  [OK] Assets PNG ya existentes');
  }
}

/* ─── VALIDACION DE CERTIFICADOS ─────────────────────────────────────── */
function validateCerts() {
  const required = ['wwdr.pem', 'signerCert.pem', 'signerKey.pem'];
  const missing  = required.filter(f => !fs.existsSync(path.join(CERTS_DIR, f)));

  if (missing.length === 0) return;

  console.error('\n[ERROR] Faltan certificados en certs/:\n');
  missing.forEach(f => console.error(`  - ${f}`));
  console.error('\nSigue el README.md (sección "Preparar Certificados") para obtenerlos.');
  console.error('Referencia rapida:');
  console.error('  openssl pkcs12 -legacy -in cert.p12 -clcerts -nokeys -out certs/signerCert.pem -passin pass:TU_PASSWORD');
  console.error('  openssl pkcs12 -legacy -in cert.p12 -nocerts -out certs/signerKey.pem -passin pass:TU_PASSWORD -passout pass:TU_PASSPHRASE');
  console.error('  openssl x509 -inform DER -in AppleWWDRCAG4.cer -out certs/wwdr.pem\n');
  process.exit(1);
}

function validateConfig() {
  const warnings = [];

  if (CONFIG.teamIdentifier === 'XXXXXXXXXX') {
    warnings.push('TEAM_ID no configurado — define la variable de entorno TEAM_ID');
  }
  if (!CONFIG.signerKeyPassphrase) {
    warnings.push('SIGNER_PASS vacio — si tu llave tiene passphrase, el firmado fallara');
  }

  if (warnings.length > 0) {
    console.warn('\n[ADVERTENCIA]');
    warnings.forEach(w => console.warn(`  - ${w}`));
    console.warn('');
  }
}

/* ─── MAIN ────────────────────────────────────────────────────────────── */
async function main() {
  console.log('\n--- Integra Lealtad: Generador de Pass Demo ---\n');
  console.log(`  Pass Type ID : ${CONFIG.passTypeIdentifier}`);
  console.log(`  Team ID      : ${CONFIG.teamIdentifier}`);
  console.log('');

  validateConfig();
  validateCerts();

  console.log('Preparando assets...');
  ensureAssets();

  console.log('Firmando y empaquetando pass...');
  const pass = await PKPass.from(
    {
      model: MODEL_DIR,
      certificates: {
        wwdr:                fs.readFileSync(path.join(CERTS_DIR, 'wwdr.pem')),
        signerCert:          fs.readFileSync(path.join(CERTS_DIR, 'signerCert.pem')),
        signerKey:           fs.readFileSync(path.join(CERTS_DIR, 'signerKey.pem')),
        signerKeyPassphrase: CONFIG.signerKeyPassphrase,
      },
    },
    {
      // Estos overrides reemplazan los PLACEHOLDERs del pass.json
      passTypeIdentifier: CONFIG.passTypeIdentifier,
      teamIdentifier:     CONFIG.teamIdentifier,
    },
  );

  const buffer = await pass.getAsBuffer();
  fs.writeFileSync(OUTPUT, buffer);

  console.log('\n[OK] Pass generado exitosamente:');
  console.log(`     ${OUTPUT}`);
  console.log('\n--- Como instalar en iPhone para la demo ---');
  console.log('');
  console.log('  Opcion A — AirDrop (mas rapido para demo):');
  console.log('    1. Abre Finder, localiza demo-integra-lealtad.pkpass');
  console.log('    2. Click derecho > Compartir > AirDrop al iPhone');
  console.log('    3. En el iPhone acepta y Apple Wallet se abrira automaticamente');
  console.log('');
  console.log('  Opcion B — Servidor HTTP local (cualquier iPhone en la misma red):');
  console.log('    1. Ejecuta en este directorio:');
  console.log('         npx serve . --cors');
  console.log('    2. Abre Safari en el iPhone y ve a:');
  console.log('         http://[TU-IP-LOCAL]:3000/demo-integra-lealtad.pkpass');
  console.log('    3. Safari reconoce el MIME type y lo abre en Wallet automaticamente');
  console.log('');
  console.log('  Opcion C — S3 temporal:');
  console.log('    aws s3 cp demo-integra-lealtad.pkpass s3://tu-bucket/demo.pkpass --acl public-read');
  console.log('    aws s3 presign s3://tu-bucket/demo.pkpass --expires-in 86400');
  console.log('    (Abre el link presignado desde Safari en el iPhone)');
  console.log('');
  console.log('NOTA: El link DEBE abrirse desde Safari en iOS.');
  console.log('      Chrome y otros browsers no abren Apple Wallet.');
  console.log('');
}

main().catch(err => {
  console.error('\n[ERROR] Fallo al generar el pass:');
  console.error(err.message || err);
  if (err.message && err.message.includes('certificate')) {
    console.error('\nPosibles causas:');
    console.error('  - El passTypeIdentifier del certificado no coincide con PASS_TYPE_ID');
    console.error('  - La passphrase de signerKey.pem es incorrecta (revisa SIGNER_PASS)');
    console.error('  - El wwdr.pem no corresponde a la version G4 (G4 es la recomendada)');
  }
  process.exit(1);
});
