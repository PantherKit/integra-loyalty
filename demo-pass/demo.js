'use strict';

/*
 * demo.js — Orquestador de la demo de tarjeta de lealtad.
 *
 *   1. SIEMPRE genera el artefacto visual (dist/preview.html + .svg) desde
 *      pass.json. No requiere certificado Apple ni dependencias nativas, así
 *      que se le puede enseñar a un cliente hoy mismo.
 *
 *   2. Si existen los 3 PEM en certs/ (cert Apple Developer real), además
 *      firma y empaqueta el .pkpass instalable vía generate-demo.js.
 *
 * Riesgo #5 del CLAUDE.md: la cuenta Apple Developer ($99/año, ~1 semana
 * por DUNS) aún no existe. Esta demo NO se bloquea por eso.
 */

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CERTS_DIR = path.join(__dirname, 'certs');
const REQUIRED  = ['wwdr.pem', 'signerCert.pem', 'signerKey.pem'];

function haveCerts() {
  return REQUIRED.every(f => fs.existsSync(path.join(CERTS_DIR, f)));
}

function run(script) {
  execFileSync(process.execPath, [path.join(__dirname, script)], {
    stdio: 'inherit',
  });
}

console.log('\n=== Integra Lealtad · Demo de Tarjeta de Lealtad ===\n');

// Paso 1 — artefacto visual (siempre disponible, sin cert).
console.log('1) Generando preview visual desde pass.json...');
run('preview.js');

// Paso 2 — .pkpass firmado solo si hay certificado real.
console.log('');
if (haveCerts()) {
  console.log('2) Certificado Apple detectado en certs/ — firmando .pkpass...');
  try {
    run('generate-demo.js');
  } catch (e) {
    console.error('   [ERROR] Falló el firmado del .pkpass. El preview visual');
    console.error('           sigue disponible en dist/. Detalle arriba.');
    process.exitCode = 1;
  }
} else {
  console.log('2) Sin certificado Apple en certs/ (esperado: cuenta Apple');
  console.log('   Developer aún no existe — ver PRODUCTION.md).');
  console.log('   Se omite el .pkpass firmado; el preview visual es la');
  console.log('   entrega para enseñar al cliente.');
}

console.log('\n=== Listo ===');
console.log('Abre el preview:  open demo-pass/dist/preview.html');
if (haveCerts()) {
  console.log('Instala en iPhone: ver README.md (AirDrop / npx serve)');
}
console.log('');
