'use strict';

require('dotenv').config();

const path  = require('path');
const fs    = require('fs');
const zlib  = require('zlib');
const sharp = require('sharp');
const { PKPass } = require('passkit-generator');

/* ─── CONFIG ──────────────────────────────────────────────────────────── */
const CONFIG = {
  passTypeIdentifier:  process.env.PASS_TYPE_ID || 'pass.ai.integragroup.lealtad',
  teamIdentifier:      process.env.TEAM_ID       || 'XXXXXXXXXX',
  signerKeyPassphrase: process.env.SIGNER_PASS   || '',
};

/* ─── PATHS ───────────────────────────────────────────────────────────── */
const CERTS_DIR = path.join(__dirname, 'certs');
const MODEL_DIR = path.join(__dirname, 'integra-lealtad.pass');
const ASSETS_DIR = path.join(__dirname, 'assets');
const OUTPUT    = path.join(__dirname, 'demo-integra-lealtad.pkpass');

/* ─── DEMO DATA ───────────────────────────────────────────────────────── */
const DEMO_DATA = {
  merchant: {
    name:    'Marquesitas OMO',
    address: 'Orizaba 161, Roma Norte, CDMX',
    lat:     19.4194,
    lon:    -99.1566,
  },
  customer: {
    name:     'Juan García',
    memberId: 'DEMO-001',
    stamps:   6,
    stampsToReward: '3 sellos',
    prizes:   '0 premios',
    tier:     'Gold',
    since:    'Ene 2024',
  },
};

/* ─── SOLID-COLOR PNG (pure Node.js, para íconos pequeños) ───────────── */
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

function solidColorPNG(width, height, [r, g, b]) {
  const PNG_SIG  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr     = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const row = Buffer.allocUnsafe(1 + width * 3);
  row[0] = 0;
  for (let x = 0; x < width; x++) {
    row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b;
  }
  const raw  = Buffer.concat(Array.from({ length: height }, () => row));
  const idat = zlib.deflateSync(raw, { level: 6 });

  return Buffer.concat([
    PNG_SIG,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ─── STRIP GENERATOR (Compositing con sharp) ─────────────────────────── */

async function generateStrip() {
  const sizes = [
    { name: 'strip.png',    w: 375, h: 123, scale: 1 },
    { name: 'strip@2x.png', w: 750, h: 246, scale: 2 },
  ];

  const totalStamps = 8;
  const filled = Math.min(DEMO_DATA.customer.stamps, totalStamps);

  // Rutas de los assets reales
  // Nota: hay un typo en el nombre del archivo en disco (maqruqesita)
  const activeAssetPath = path.join(ASSETS_DIR, 'marquesita@2x.png');
  const inactiveAssetPath = path.join(ASSETS_DIR, 'maqruqesita_default@2x.png');

  // Leemos los buffers de las imágenes una sola vez
  const activeBuffer = fs.readFileSync(activeAssetPath);
  const inactiveBuffer = fs.readFileSync(inactiveAssetPath);

  for (const { name, w, h, scale } of sizes) {
    // Tamaño base del ícono a 1x es ~32px, escalamos según la resolución
    const iconSize = Math.round(32 * scale);
    
    // Redimensionamos los assets al tamaño necesario para esta resolución
    // La marquesita inactiva la hacemos un poco transparente para que se vea como "apagada"
    const activeIcon = await sharp(activeBuffer).resize(iconSize, iconSize, { fit: 'inside' }).toBuffer();
    const inactiveIcon = await sharp(inactiveBuffer)
      .resize(iconSize, iconSize, { fit: 'inside' })
      .ensureAlpha()
      .toBuffer();

    // Layout grid — safe area interna para evitar el crop horizontal de Wallet
    const leftPad = Math.round(40 * scale);
    const baseColGap = (w - 2 * leftPad - iconSize) / 3;
    const colGap  = Math.round(baseColGap * 0.8);
    const rowGap  = Math.round(44 * scale * 0.8);
    const gridWidth = (3 * colGap) + iconSize;
    const startX  = Math.round((w - gridWidth) / 2);
    const startY  = Math.round(8 * scale); // el título vive en logoText, fuera del strip

    const compositeArray = [];

    // Preparamos las posiciones de los 8 sellos
    for (let i = 0; i < totalStamps; i++) {
      const row = i < 4 ? 0 : 1;
      const col = i % 4;
      const x = startX + col * colGap;
      const y = startY + row * rowGap;
      
      compositeArray.push({
        input: i < filled ? activeIcon : inactiveIcon,
        top: y,
        left: x,
      });
    }

    // Creamos el fondo verde oscuro y le pegamos los sellos
    const dest = path.join(MODEL_DIR, name);
    await sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background: { r: 255, g: 254, b: 249, alpha: 1 } // #fffef9
      }
    })
    .composite(compositeArray)
    .png()
    .toFile(dest);
  }

  console.log('  [OK] Strip generado (Compositing con assets reales)');
}

/* ─── ASSETS DE ICONO / LOGO ─────────────────────────────────────────── */
const ICON_ASSETS = [
  { name: 'icon.png',    w:  29, h:  29 },
  { name: 'icon@2x.png', w:  58, h:  58 },
  { name: 'icon@3x.png', w:  87, h:  87 },
];

const BRAND_COLOR = [30, 60, 120];

function ensureIconAssets() {
  if (!fs.existsSync(MODEL_DIR)) fs.mkdirSync(MODEL_DIR, { recursive: true });

  let created = 0;
  for (const { name, w, h } of ICON_ASSETS) {
    const dest = path.join(MODEL_DIR, name);
    if (!fs.existsSync(dest)) {
      fs.writeFileSync(dest, solidColorPNG(w, h, BRAND_COLOR));
      created++;
    }
  }

  if (created > 0) {
    console.log(`  [OK] ${created} iconos PNG creados`);
  } else {
    console.log('  [OK] Iconos ya existentes');
  }
}

function removeLogoAssets() {
  for (const name of ['logo.png', 'logo@2x.png', 'logo@3x.png']) {
    const logoPath = path.join(MODEL_DIR, name);
    if (fs.existsSync(logoPath)) fs.unlinkSync(logoPath);
  }

  console.log('  [OK] Logo image omitido; Wallet usará logoText');
}

/* ─── VALIDACIONES ────────────────────────────────────────────────────── */
function validateCerts() {
  const required = ['wwdr.pem', 'signerCert.pem', 'signerKey.pem'];
  const missing  = required.filter(f => !fs.existsSync(path.join(CERTS_DIR, f)));

  if (missing.length === 0) return;

  console.error('\n[ERROR] Faltan certificados en certs/:\n');
  missing.forEach(f => console.error(`  - ${f}`));
  console.error('\nSigue el README.md (seccion "Preparar Certificados").');
  process.exit(1);
}

function validateConfig() {
  const warnings = [];
  if (CONFIG.teamIdentifier === 'XXXXXXXXXX')
    warnings.push('TEAM_ID no configurado — define la variable de entorno TEAM_ID');
  if (!CONFIG.signerKeyPassphrase)
    warnings.push('SIGNER_PASS vacio — si tu llave tiene passphrase, el firmado fallara');

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
  ensureIconAssets();
  removeLogoAssets();
  await generateStrip();

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
      passTypeIdentifier: CONFIG.passTypeIdentifier,
      teamIdentifier:     CONFIG.teamIdentifier,
    },
  );

  const buffer = await pass.getAsBuffer();
  fs.writeFileSync(OUTPUT, buffer);

  console.log('\n[OK] Pass generado exitosamente:');
  console.log(`     ${OUTPUT}`);
  console.log('\n--- Como instalar en iPhone ---');
  console.log('  AirDrop: click derecho en el .pkpass > Compartir > AirDrop');
  console.log('  HTTP:    npx serve . --cors  →  abre desde Safari en iPhone');
  console.log('');
}

main().catch(err => {
  console.error('\n[ERROR] Fallo al generar el pass:');
  console.error(err.message || err);
  if (err.message?.includes('certificate')) {
    console.error('\nPosibles causas:');
    console.error('  - passTypeIdentifier del cert no coincide con PASS_TYPE_ID');
    console.error('  - Passphrase incorrecta (revisa SIGNER_PASS)');
    console.error('  - wwdr.pem no es G4');
  }
  process.exit(1);
});
