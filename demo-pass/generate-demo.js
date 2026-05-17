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
const OUTPUT    = path.join(__dirname, 'demo-integra-lealtad.pkpass');

/* ─── DEMO DATA ───────────────────────────────────────────────────────── */
const DEMO_DATA = {
  merchant: {
    name:    'Café Roma',
    address: 'Orizaba 161, Roma Norte, CDMX',
    lat:     19.4194,
    lon:    -99.1566,
  },
  customer: {
    name:     'Juan García',
    memberId: 'DEMO-001',
    stamps:   5,
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

/* ─── SVG STRIP (via sharp) ───────────────────────────────────────────── */

/**
 * Dibuja un ícono outline estilo Lucide/Hugeicons. Evitamos dependencias de
 * icon packs para mantener el generador portable y sin riesgo de licencias.
 */
function stampIcon(cx, cy, size, isActive) {
  const color = isActive ? '#F0F5EB' : '#A0B0A0';
  const opacity = isActive ? '1' : '0.4';
  const strokeWidth = 1.9;
  const scale = size / 24;
  const x = cx - size / 2;
  const y = cy - size / 2;

  return `
    <g transform="translate(${x} ${y}) scale(${scale})"
       fill="none"
       stroke="${color}"
       stroke-width="${strokeWidth}"
       stroke-linecap="round"
       stroke-linejoin="round"
       opacity="${opacity}">
      <path d="M10 2v2"/>
      <path d="M14 2v2"/>
      <path d="M6 8h11v6a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V8Z"/>
      <path d="M17 9h1a3 3 0 0 1 0 6h-1"/>
      <path d="M4 21h16"/>
    </g>`;
}

/**
 * Construye el SVG del strip a las dimensiones dadas.
 * Diseñado a base @1x (375×123) y escalado proporcionalmente.
 */
function buildStripSVG(w, h) {
  const s = w / 375;
  const totalStamps = 8;
  const filled = Math.min(DEMO_DATA.customer.stamps, totalStamps);
  const size = 32 * s;
  const colGap = 46 * s;
  const rowGap = 44 * s;
  const gridWidth = (3 * colGap) + size;
  const startX = (w - gridWidth) / 2 + size / 2;
  const startY = 38 * s;

  const stamps = Array.from({ length: totalStamps }, (_, i) => {
    const row = i < 4 ? 0 : 1;
    const col = i % 4;
    const cx = startX + col * colGap;
    const cy = startY + row * rowGap;
    return stampIcon(cx, cy, size, i < filled);
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#3C5046"/>
      <stop offset="100%" stop-color="#3C5046"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  ${stamps}
</svg>`;
}

/**
 * Genera strip.png y strip@2x.png usando sharp para rasterizar el SVG.
 * Siempre regenera (no "si no existe") para reflejar cambios en DEMO_DATA.
 */
async function generateStrip() {
  const sizes = [
    { name: 'strip.png',    w: 375, h: 123 },
    { name: 'strip@2x.png', w: 750, h: 246 },
  ];

  for (const { name, w, h } of sizes) {
    const svg  = buildStripSVG(w, h);
    const dest = path.join(MODEL_DIR, name);
    await sharp(Buffer.from(svg)).png().toFile(dest);
  }

  console.log('  [OK] Strip generado (SVG + sharp)');
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
