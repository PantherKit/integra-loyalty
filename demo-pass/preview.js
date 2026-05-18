'use strict';

/*
 * preview.js — Genera un artefacto visual fiel del pass (frente + reverso)
 * SIN requerir el certificado Apple Developer real ni dependencias nativas.
 *
 * Lee integra-lealtad.pass/pass.json (misma fuente de verdad que el .pkpass
 * firmado) y produce:
 *   - dist/preview.svg   (frente de la tarjeta, vectorial)
 *   - dist/preview.html  (frente + reverso, abrible en cualquier navegador)
 *
 * Cero dependencias: solo módulos built-in de Node. Esto garantiza que la
 * demo sea reproducible en cualquier máquina aunque no exista el cert Apple
 * de $99/año (riesgo #5 del CLAUDE.md) ni se pueda compilar `sharp`.
 */

const fs   = require('fs');
const path = require('path');

const MODEL_DIR = path.join(__dirname, 'integra-lealtad.pass');
const DIST_DIR  = path.join(__dirname, 'dist');

/* ─── Helpers ─────────────────────────────────────────────────────────── */

// "rgb(57, 109, 234)" | "#abc" -> "#3960ea"
function toHex(color, fallback) {
  if (!color) return fallback;
  const m = String(color).match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (m) {
    return (
      '#' +
      [m[1], m[2], m[3]]
        .map(n => Number(n).toString(16).padStart(2, '0'))
        .join('')
    );
  }
  return color.startsWith('#') ? color : fallback;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Brillo relativo para decidir texto claro/oscuro sobre el fondo.
function isLight(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substr(0, 2), 16);
  const g = parseInt(h.substr(2, 2), 16);
  const b = parseInt(h.substr(4, 2), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

function fieldsToRows(fields) {
  return (fields || [])
    .map(
      f => `
      <div class="row">
        <span class="rl">${esc(f.label)}</span>
        <span class="rv">${esc(f.value)}</span>
      </div>`
    )
    .join('');
}

/* ─── Frente del pass (SVG) ───────────────────────────────────────────── */

function buildFrontSVG(pass) {
  const card    = pass.storeCard || {};
  const bg      = toHex(pass.backgroundColor, '#fffef9');
  const fg      = toHex(pass.foregroundColor, '#396dea');
  const label   = toHex(pass.labelColor, fg);
  const onBg    = isLight(bg) ? '#1c2430' : '#ffffff';
  const logoTxt = pass.logoText || pass.organizationName || 'Tarjeta de Lealtad';

  const secondary = card.secondaryFields || [];
  const primary   = card.primaryFields || [];
  const header    = card.headerFields || [];

  const W = 360;
  const H = 460;

  const headerCell = header[0]
    ? `<text x="${W - 24}" y="44" text-anchor="end" font-size="11"
            fill="${label}" letter-spacing="0.5">${esc((header[0].label || '').toUpperCase())}</text>
       <text x="${W - 24}" y="64" text-anchor="end" font-size="18"
            font-weight="700" fill="${onBg}">${esc(header[0].value)}</text>`
    : '';

  const primaryCell = primary[0]
    ? `<text x="${W / 2}" y="186" text-anchor="middle" font-size="13"
            fill="${label}" letter-spacing="1">${esc((primary[0].label || '').toUpperCase())}</text>
       <text x="${W / 2}" y="230" text-anchor="middle" font-size="44"
            font-weight="800" fill="${onBg}">${esc(primary[0].value)}</text>`
    : `<text x="${W / 2}" y="172" text-anchor="middle" font-size="12"
            fill="${label}" letter-spacing="1">SELLOS ACUMULADOS</text>
       ${stampGrid(W, fg, bg)}`;

  const sec = secondary
    .map((f, i) => {
      const x = i === 0 ? 24 : W - 24;
      const anchor = i === 0 ? 'start' : 'end';
      return `
        <text x="${x}" y="318" text-anchor="${anchor}" font-size="10"
              fill="${label}" letter-spacing="0.5">${esc((f.label || '').toUpperCase())}</text>
        <text x="${x}" y="338" text-anchor="${anchor}" font-size="15"
              font-weight="600" fill="${onBg}">${esc(f.value)}</text>`;
    })
    .join('');

  const barcode = (pass.barcodes && pass.barcodes[0]) || pass.barcode;
  const barcodeBlock = barcode
    ? `
      <rect x="${W / 2 - 70}" y="372" width="140" height="60" rx="6" fill="#ffffff"/>
      ${barLines(W / 2 - 62, 380, 124, 44)}
      <text x="${W / 2}" y="448" text-anchor="middle" font-size="9"
            fill="${onBg}" opacity="0.75">${esc(barcode.altText || barcode.message)}</text>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
     font-family="-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
  <defs>
    <clipPath id="card"><rect width="${W}" height="${H}" rx="18"/></clipPath>
  </defs>
  <g clip-path="url(#card)">
    <rect width="${W}" height="${H}" fill="${bg}"/>
    <text x="24" y="42" font-size="17" font-weight="800" fill="${fg}"
          letter-spacing="0.5">${esc(logoTxt)}</text>
    ${headerCell}
    <line x1="24" y1="92" x2="${W - 24}" y2="92" stroke="${fg}" stroke-opacity="0.18"/>
    ${primaryCell}
    <line x1="24" y1="284" x2="${W - 24}" y2="284" stroke="${fg}" stroke-opacity="0.18"/>
    ${sec}
    ${barcodeBlock}
  </g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="18"
        fill="none" stroke="#00000022"/>
</svg>`;
}

// Cuadrícula de sellos cuando no hay primaryFields (caso loyalty por sellos).
function stampGrid(W, fg, bg) {
  const total = 8;
  const filled = 6; // espejo de DEMO_DATA.customer.stamps en generate-demo.js
  const cols = 4;
  const r = 16;
  const gapX = 64;
  const gapY = 56;
  const startX = W / 2 - ((cols - 1) * gapX) / 2;
  const startY = 196;
  let out = '';
  for (let i = 0; i < total; i++) {
    const cx = startX + (i % cols) * gapX;
    const cy = startY + Math.floor(i / cols) * gapY;
    const on = i < filled;
    out += `<circle cx="${cx}" cy="${cy}" r="${r}"
              fill="${on ? fg : 'none'}"
              stroke="${fg}" stroke-width="2" stroke-opacity="${on ? 1 : 0.4}"/>`;
    if (on) {
      out += `<path d="M ${cx - 7} ${cy} l 4 5 l 9 -10"
              stroke="${isLight(bg) ? '#ffffff' : '#1c2430'}"
              stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    }
  }
  return out;
}

// Render aproximado de un Code128 (decorativo, no escaneable — es un preview).
function barLines(x, y, w, h) {
  let out = '';
  let cx = x;
  let i = 0;
  while (cx < x + w - 1) {
    const bw = 1 + (i % 4);
    if (i % 2 === 0) {
      out += `<rect x="${cx.toFixed(1)}" y="${y}" width="${bw}" height="${h}" fill="#111"/>`;
    }
    cx += bw + 1;
    i++;
  }
  return out;
}

/* ─── HTML: frente (SVG embebido) + reverso (backFields) ──────────────── */

function buildHTML(pass, svg) {
  const card = pass.storeCard || {};
  const bg   = toHex(pass.backgroundColor, '#fffef9');
  const fg   = toHex(pass.foregroundColor, '#396dea');
  const back = fieldsToRows(card.backFields);
  const loc  = (pass.locations || [])[0];
  const geo  = loc
    ? `<div class="geo">📍 Geofence: ${esc(loc.relevantText)}
       <span class="coord">(${loc.latitude}, ${loc.longitude})</span></div>`
    : '';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preview — ${esc(pass.logoText || pass.organizationName)}</title>
<style>
  :root { --fg:${fg}; --bg:${bg}; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
         background:#0f1115; color:#e8e8ea; padding:32px; }
  h1 { font-size:18px; font-weight:700; margin:0 0 4px; }
  .sub { color:#8a8f98; font-size:13px; margin:0 0 28px; }
  .badge { display:inline-block; background:#2a2f3a; color:#cdd3dd; font-size:11px;
           padding:3px 9px; border-radius:99px; margin-left:8px; vertical-align:middle; }
  .stage { display:flex; gap:40px; flex-wrap:wrap; align-items:flex-start; }
  .face { width:360px; }
  .face h2 { font-size:12px; text-transform:uppercase; letter-spacing:1px;
             color:#8a8f98; margin:0 0 10px; }
  .shadow { filter: drop-shadow(0 12px 28px rgba(0,0,0,.55)); border-radius:18px; }
  .back { background:var(--bg); border-radius:18px; padding:22px 24px;
          border:1px solid #00000022; min-height:460px; }
  .back .bh { font-size:15px; font-weight:800; color:var(--fg);
              margin:0 0 16px; letter-spacing:.5px; }
  .row { padding:11px 0; border-bottom:1px solid color-mix(in srgb, var(--fg) 14%, transparent); }
  .row:last-child { border-bottom:0; }
  .rl { display:block; font-size:10px; letter-spacing:.5px; text-transform:uppercase;
        color:var(--fg); opacity:.85; margin-bottom:3px; }
  .rv { display:block; font-size:14px; color:#1c2430; line-height:1.4; }
  .geo { margin-top:28px; background:#1a1d24; border:1px solid #2a2f3a;
         border-radius:10px; padding:14px 16px; font-size:13px; color:#cdd3dd;
         max-width:760px; }
  .coord { color:#8a8f98; font-size:11px; margin-left:6px; }
  footer { margin-top:36px; color:#5a606b; font-size:12px; max-width:760px; line-height:1.6; }
</style>
</head>
<body>
  <h1>Tarjeta de Lealtad — Preview<span class="badge">DEMO sin certificado Apple</span></h1>
  <p class="sub">Render fiel generado desde <code>pass.json</code>. Cuando exista
     el certificado Apple Developer, el mismo <code>pass.json</code> produce el
     <code>.pkpass</code> firmado e instalable en Wallet.</p>

  <div class="stage">
    <div class="face">
      <h2>Frente (Apple Wallet)</h2>
      <div class="shadow">${svg}</div>
    </div>
    <div class="face">
      <h2>Reverso (al voltear el pass)</h2>
      <div class="back">
        <div class="bh">${esc(pass.logoText || pass.organizationName)}</div>
        ${back || '<div class="rv">Sin backFields definidos.</div>'}
      </div>
    </div>
  </div>

  ${geo}

  <footer>
    Powered by Integra Lealtad · ${esc(pass.organizationName || 'Integra Group AI')} ·
    Pass Type: <code>${esc(pass.passTypeIdentifier)}</code> ·
    Serial: <code>${esc(pass.serialNumber)}</code><br>
    El barcode mostrado es una representación visual (no escaneable). El .pkpass
    firmado genera un Code128/QR real.
  </footer>
</body>
</html>`;
}

/* ─── Main ────────────────────────────────────────────────────────────── */

function main() {
  const passPath = path.join(MODEL_DIR, 'pass.json');
  if (!fs.existsSync(passPath)) {
    console.error(`[ERROR] No se encontró ${passPath}`);
    process.exit(1);
  }
  const pass = JSON.parse(fs.readFileSync(passPath, 'utf8'));

  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });

  const svg  = buildFrontSVG(pass);
  const html = buildHTML(pass, svg);

  const svgOut  = path.join(DIST_DIR, 'preview.svg');
  const htmlOut = path.join(DIST_DIR, 'preview.html');
  fs.writeFileSync(svgOut, svg);
  fs.writeFileSync(htmlOut, html);

  console.log('  [OK] Preview visual generado (sin certificado Apple):');
  console.log(`       ${svgOut}`);
  console.log(`       ${htmlOut}`);
}

if (require.main === module) main();

module.exports = { buildFrontSVG, buildHTML, toHex };
