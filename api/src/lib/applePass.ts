import { PKPass } from 'passkit-generator';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { deflateSync } from 'node:zlib';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHmac } from 'node:crypto';
import type { Card, LoyaltyProgram, Merchant } from './entities';

// =============================================================================
// Cert loading (Secrets Manager + local fallback para verificación local)
// =============================================================================

export interface PassCredentials {
  signerCert: string;
  signerKey: string;
  wwdr: string;
  passphrase: string;
  passTypeId: string;
  teamId: string;
}

const SECRET_NAME = process.env.APPLE_PASS_SECRET || 'integra-loyalty/apple-pass';
const SECRET_REGION = 'us-east-1';

// Cache module-level: persiste entre invocaciones Lambda (warm).
let cachedCreds: PassCredentials | null = null;

// Carpeta certs/ de demo-pass relativa a la raíz del repo (solo test local).
// __dirname en runtime = api/src/lib (tsx/esbuild) ó dist; subimos a la raíz del repo.
const LOCAL_CERTS_DIR = resolve(process.cwd(), '../demo-pass/certs');

function loadLocalCreds(): PassCredentials | null {
  const certPath = resolve(LOCAL_CERTS_DIR, 'signerCert.pem');
  if (!existsSync(certPath)) return null;
  try {
    return {
      signerCert: readFileSync(certPath, 'utf8'),
      signerKey: readFileSync(resolve(LOCAL_CERTS_DIR, 'signerKey.pem'), 'utf8'),
      wwdr: readFileSync(resolve(LOCAL_CERTS_DIR, 'wwdr.pem'), 'utf8'),
      passphrase: process.env.LOCAL_PASS_PASS || 'integragroupthebest',
      passTypeId: 'pass.ai.integragroup.lealtad',
      teamId: 'L2A48F6TTL',
    };
  } catch {
    return null;
  }
}

async function loadFromSecretsManager(): Promise<PassCredentials> {
  const client = new SecretsManagerClient({ region: SECRET_REGION });
  const res = await client.send(new GetSecretValueCommand({ SecretId: SECRET_NAME }));
  if (!res.SecretString) throw new Error('apple-pass secret has no SecretString');
  const parsed = JSON.parse(res.SecretString) as Partial<PassCredentials>;
  const required: (keyof PassCredentials)[] = [
    'signerCert',
    'signerKey',
    'wwdr',
    'passphrase',
    'passTypeId',
    'teamId',
  ];
  for (const k of required) {
    if (!parsed[k]) throw new Error(`apple-pass secret missing key: ${k}`);
  }
  return parsed as PassCredentials;
}

async function getCredentials(): Promise<PassCredentials> {
  if (cachedCreds) return cachedCreds;

  // Preferimos Secrets Manager (prod). Si falla (sin creds AWS / secret)
  // y existe el fallback local de demo-pass/certs, lo usamos para verificación local.
  try {
    cachedCreds = await loadFromSecretsManager();
    return cachedCreds;
  } catch (err) {
    const local = loadLocalCreds();
    if (local) {
      console.warn('applePass: usando certs locales de demo-pass/certs (fallback test)');
      cachedCreds = local;
      return cachedCreds;
    }
    throw err;
  }
}

/**
 * Acceso a las credenciales de los certs Apple (cargadas con cache + fallback).
 * Usado por el push APNs (necesita signerCert/signerKey/passphrase/passTypeId).
 */
export async function getPassCredentials(): Promise<PassCredentials> {
  return getCredentials();
}

// =============================================================================
// PassKit Web Service — authenticationToken determinístico
// =============================================================================

/**
 * Token de autenticación del pase, determinístico por cardId.
 * Apple lo envía como `Authorization: ApplePass <token>` en cada request
 * del Web Service. No requiere almacenamiento: se recalcula y compara.
 *
 * NOTA: usa la passphrase de los certs como SECRET por defecto. Esto crea
 * una dependencia async (carga de creds). Cae a PASS_AUTH_SECRET si está.
 */
export async function passAuthToken(cardId: string): Promise<string> {
  const envSecret = process.env.PASS_AUTH_SECRET;
  const secret = envSecret ?? (await getCredentials()).passphrase;
  return createHmac('sha256', secret).update(cardId).digest('hex');
}

// =============================================================================
// Mini PNG encoder (sin libs nativas: zlib core de Node)
// Genera un PNG RGBA sólido NxN. Suficiente para icon/logo que Apple exige.
// =============================================================================

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** PNG RGBA sólido de size x size del color [r,g,b]. */
function solidPng(size: number, r: number, g: number, b: number): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // color type RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  // Raw image data: cada fila = filter byte (0) + size px * 4 canales.
  const rowLen = 1 + size * 4;
  const raw = Buffer.alloc(rowLen * size);
  for (let y = 0; y < size; y++) {
    const off = y * rowLen;
    raw[off] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const p = off + 1 + x * 4;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
      raw[p + 3] = 255;
    }
  }

  const idatData = deflateSync(raw);

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idatData),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/** PNG con degradado vertical (top → bottom). Da una "banda" de marca
 *  detrás de los campos del pase Apple — el mayor salto visual posible
 *  dentro de la plantilla rígida de Apple Wallet. */
function gradientPng(
  w: number,
  h: number,
  top: [number, number, number],
  bot: [number, number, number]
): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9); // RGBA
  const rowLen = 1 + w * 4;
  const raw = Buffer.alloc(rowLen * h);
  for (let y = 0; y < h; y++) {
    const t = h === 1 ? 0 : y / (h - 1);
    const r = Math.round(top[0] + (bot[0] - top[0]) * t);
    const g = Math.round(top[1] + (bot[1] - top[1]) * t);
    const b = Math.round(top[2] + (bot[2] - top[2]) * t);
    const off = y * rowLen;
    raw[off] = 0;
    for (let x = 0; x < w; x++) {
      const p = off + 1 + x * 4;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
      raw[p + 3] = 255;
    }
  }
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function clampShade(t: [number, number, number], amt: number): [number, number, number] {
  return [
    Math.max(0, Math.min(255, t[0] + amt)),
    Math.max(0, Math.min(255, t[1] + amt)),
    Math.max(0, Math.min(255, t[2] + amt)),
  ];
}

// =============================================================================
// Strip de sellos — PNG RGBA dibujado a mano (sin sharp/canvas en Lambda)
// =============================================================================

type RGB = [number, number, number];

/** Pinta un pixel con alpha-blend sobre el buffer RGBA (sRGB simple). */
function blendPx(buf: Buffer, W: number, x: number, y: number, c: RGB, a: number) {
  if (a <= 0 || x < 0 || y < 0 || x >= W) return;
  const p = (y * W + x) * 4;
  if (p < 0 || p + 3 >= buf.length) return;
  const ia = 1 - a;
  buf[p] = Math.round(c[0] * a + buf[p] * ia);
  buf[p + 1] = Math.round(c[1] * a + buf[p + 1] * ia);
  buf[p + 2] = Math.round(c[2] * a + buf[p + 2] * ia);
  buf[p + 3] = Math.max(buf[p + 3], Math.round(255 * a + buf[p + 3] * ia));
}

/** Círculo relleno con borde antialiased (cobertura sub-pixel por distancia). */
function fillCircle(
  buf: Buffer,
  W: number,
  H: number,
  cx: number,
  cy: number,
  r: number,
  c: RGB,
  alpha = 1
) {
  const x0 = Math.max(0, Math.floor(cx - r - 1));
  const x1 = Math.min(W - 1, Math.ceil(cx + r + 1));
  const y0 = Math.max(0, Math.floor(cy - r - 1));
  const y1 = Math.min(H - 1, Math.ceil(cy + r + 1));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      // 1px de borde suavizado: cobertura 1 dentro, 0 fuera, lineal en el borde.
      const cov = Math.max(0, Math.min(1, r + 0.5 - d));
      if (cov > 0) blendPx(buf, W, x, y, c, cov * alpha);
    }
  }
}

/** Anillo (círculo solo borde) tenue para los sellos vacíos. */
function ring(
  buf: Buffer,
  W: number,
  H: number,
  cx: number,
  cy: number,
  r: number,
  thickness: number,
  c: RGB,
  alpha = 1
) {
  const x0 = Math.max(0, Math.floor(cx - r - 1));
  const x1 = Math.min(W - 1, Math.ceil(cx + r + 1));
  const y0 = Math.max(0, Math.floor(cy - r - 1));
  const y1 = Math.min(H - 1, Math.ceil(cy + r + 1));
  const rOut = r;
  const rIn = r - thickness;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const covOut = Math.max(0, Math.min(1, rOut + 0.5 - d));
      const covIn = Math.max(0, Math.min(1, d - (rIn - 0.5)));
      const cov = Math.min(covOut, covIn);
      if (cov > 0) blendPx(buf, W, x, y, c, cov * alpha);
    }
  }
}

/** Palomita simple (✓) centrada en (cx,cy), antialiased por trazo grueso. */
function checkMark(
  buf: Buffer,
  W: number,
  H: number,
  cx: number,
  cy: number,
  r: number,
  c: RGB
) {
  // Dos segmentos: bajada corta izquierda + subida larga derecha.
  const s = r * 0.62;
  const p1: [number, number] = [cx - s * 0.95, cy + s * 0.05];
  const p2: [number, number] = [cx - s * 0.2, cy + s * 0.72];
  const p3: [number, number] = [cx + s * 1.0, cy - s * 0.7];
  const thick = Math.max(1.4, r * 0.2);
  drawSeg(buf, W, H, p1, p2, thick, c);
  drawSeg(buf, W, H, p2, p3, thick, c);
}

function drawSeg(
  buf: Buffer,
  W: number,
  H: number,
  a: [number, number],
  b: [number, number],
  thick: number,
  c: RGB
) {
  const minx = Math.max(0, Math.floor(Math.min(a[0], b[0]) - thick - 1));
  const maxx = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0]) + thick + 1));
  const miny = Math.max(0, Math.floor(Math.min(a[1], b[1]) - thick - 1));
  const maxy = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1]) + thick + 1));
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy || 1;
  for (let y = miny; y <= maxy; y++) {
    for (let x = minx; x <= maxx; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let t = ((px - a[0]) * dx + (py - a[1]) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const qx = a[0] + t * dx;
      const qy = a[1] + t * dy;
      const dist = Math.hypot(px - qx, py - qy);
      const cov = Math.max(0, Math.min(1, thick - dist));
      if (cov > 0) blendPx(buf, W, x, y, c, cov);
    }
  }
}

function encodeRgbaPng(W: number, H: number, raw: Buffer): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9); // RGBA
  // raw es WxH RGBA contiguo; añadimos filter byte (0) por fila.
  const rowLen = 1 + W * 4;
  const filtered = Buffer.alloc(rowLen * H);
  for (let y = 0; y < H; y++) {
    filtered[y * rowLen] = 0;
    raw.copy(filtered, y * rowLen + 1, y * W * 4, (y + 1) * W * 4);
  }
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(filtered)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Strip image del storeCard: grid de sellos dibujado a mano.
 * Fondo crema, tokens llenos = círculo de marca + palomita blanca,
 * tokens vacíos = anillo gris tenue. Antialias por cobertura sub-pixel.
 */
function stampStripPng(
  width: number,
  height: number,
  total: number,
  filled: number,
  brand: RGB,
  bgCream: RGB = [247, 246, 243]
): Buffer {
  const W = width;
  const H = height;
  const raw = Buffer.alloc(W * H * 4);
  // Fondo crema opaco.
  for (let i = 0; i < W * H; i++) {
    raw[i * 4] = bgCream[0];
    raw[i * 4 + 1] = bgCream[1];
    raw[i * 4 + 2] = bgCream[2];
    raw[i * 4 + 3] = 255;
  }

  const n = Math.max(1, total);
  const cols = Math.min(5, n);
  const rows = Math.ceil(n / cols);

  // Token size derivado del ancho disponible (margen lateral 8%).
  const marginX = W * 0.08;
  const usableW = W - marginX * 2;
  const cellW = usableW / cols;
  // Alto: dejamos padding vertical; el grid se centra.
  const padY = H * 0.14;
  const usableH = H - padY * 2;
  const cellH = usableH / rows;
  const cell = Math.min(cellW, cellH);
  const radius = (cell / 2) * 0.66;

  // Centrar el bloque del grid.
  const gridW = cell * cols;
  const gridH = cell * rows;
  const startX = (W - gridW) / 2;
  const startY = (H - gridH) / 2;

  const ringColor: RGB = [210, 208, 203];
  const checkColor: RGB = [255, 255, 255];

  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    // En la última fila (parcial) centramos los tokens restantes.
    const inLast = row === rows - 1;
    const lastCount = n - cols * (rows - 1);
    const rowCols = inLast ? lastCount : cols;
    const rowStartX = startX + ((cols - rowCols) * cell) / 2;
    const cx = rowStartX + col * cell + cell / 2;
    const cy = startY + row * cell + cell / 2;

    if (i < filled) {
      fillCircle(raw, W, H, cx, cy, radius, brand, 1);
      checkMark(raw, W, H, cx, cy, radius, checkColor);
    } else {
      const thick = Math.max(1.5, radius * 0.13);
      ring(raw, W, H, cx, cy, radius, thick, ringColor, 1);
    }
  }

  return encodeRgbaPng(W, H, raw);
}

// =============================================================================
// Color helpers
// =============================================================================

function hexToRgbString(hex: string | undefined, fallback: string): string {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return fallback;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgbTuple(hex: string | undefined): [number, number, number] {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return [255, 255, 255];
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/** Color de texto legible (blanco/negro) sobre el color de marca. */
function contrastOn(hex: string | undefined): string {
  const [r, g, b] = hexToRgbTuple(hex);
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return L > 0.62 ? 'rgb(17, 24, 39)' : 'rgb(255, 255, 255)';
}

/** Decodifica un data URL PNG a Buffer. null si no es PNG válido. */
function pngFromDataUrl(dataUrl: string | undefined): Buffer | null {
  if (!dataUrl) return null;
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!m) return null;
  try {
    return Buffer.from(m[1], 'base64');
  } catch {
    return null;
  }
}

// =============================================================================
// buildPkpass
// =============================================================================

export interface BuildPkpassArgs {
  card: Card;
  program: LoyaltyProgram;
  merchant: Merchant;
}

export async function buildPkpass({ card, program, merchant }: BuildPkpassArgs): Promise<Buffer> {
  const creds = await getCredentials();

  // Esquema Apple-safe: fondo crema claro plano; texto/etiquetas = color de
  // marca (fallback gris oscuro). Apple aplica color plano; crema + marca se
  // ve premium y nunca cae en "texto blanco sobre claro".
  const CREAM: [number, number, number] = [247, 246, 243];
  const bgRgb = `rgb(${CREAM[0]}, ${CREAM[1]}, ${CREAM[2]})`;
  const [br, bg, bb] = hexToRgbTuple(merchant.brandColor);
  const fgRgb = hexToRgbString(merchant.brandColor, 'rgb(30, 30, 40)');

  // Logo real del comercio (PNG subido en el onboarding). Si no hay, cae a
  // un bloque sólido (Apple igual exige las imágenes).
  const brandLogo = pngFromDataUrl(merchant.logoUrl);
  const solidSm = solidPng(58, br, bg, bb);
  const icon = brandLogo ?? solidPng(29, br, bg, bb);
  const icon2x = brandLogo ?? solidSm;
  const logo = brandLogo ?? solidPng(160, br, bg, bb);
  const logo2x = brandLogo ?? solidPng(320, br, bg, bb);

  // Strip = grid de sellos dibujado a mano (lo más importante del diseño).
  // Dimensiones EXACTAS del skill para storeCard.
  const stTotal = Math.max(1, program.stampsRequired);
  const stFilled = Math.min(Math.max(0, card.stamps), stTotal);
  const strip = stampStripPng(375, 144, stTotal, stFilled, [br, bg, bb], CREAM);
  const strip2x = stampStripPng(750, 288, stTotal, stFilled, [br, bg, bb], CREAM);
  const strip3x = stampStripPng(1125, 432, stTotal, stFilled, [br, bg, bb], CREAM);

  // Web Service: Apple le agrega /v1 — la URL va SIN slash final y SIN /v1.
  const webServiceURL =
    process.env.PUBLIC_API_URL ?? 'https://tcsbnd5m3l.execute-api.us-east-1.amazonaws.com';
  // Mismo cálculo que passAuthToken(): creds ya están cargadas aquí (sync).
  const authSecret = process.env.PASS_AUTH_SECRET ?? creds.passphrase;
  const authenticationToken = createHmac('sha256', authSecret)
    .update(card.cardId)
    .digest('hex');

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: creds.passTypeId,
    teamIdentifier: creds.teamId,
    organizationName: merchant.name,
    description: `Tarjeta de lealtad — ${merchant.name}`,
    serialNumber: card.cardId,
    logoText: merchant.name,
    backgroundColor: bgRgb,
    foregroundColor: fgRgb,
    labelColor: fgRgb,
    webServiceURL,
    authenticationToken,
    storeCard: {},
  };

  const pass = new PKPass(
    {
      'pass.json': Buffer.from(JSON.stringify(passJson)),
      'icon.png': icon,
      'icon@2x.png': icon2x,
      'logo.png': logo,
      'logo@2x.png': logo2x,
      'strip.png': strip,
      'strip@2x.png': strip2x,
      'strip@3x.png': strip3x,
    },
    {
      wwdr: creds.wwdr,
      signerCert: creds.signerCert,
      signerKey: creds.signerKey,
      signerKeyPassphrase: creds.passphrase,
    }
  );

  pass.type = 'storeCard';

  const complete = card.stamps >= program.stampsRequired;

  // Header: visible incluso cuando el pase está apilado en Wallet.
  pass.headerFields.push({
    key: 'count',
    label: 'SELLOS',
    value: `${stFilled}/${stTotal}`,
  });

  // Sellos NO en primaryFields (la strip los dibuja). Solo ponemos un
  // primaryField corto cuando el premio está listo; si no, dejamos que
  // domine la strip y NO agregamos primaryField.
  if (complete) {
    pass.primaryFields.push({
      key: 'progress',
      label: '',
      value: '¡Premio listo! 🎉',
    });
  }

  pass.secondaryFields.push({
    key: 'reward',
    label: 'TU PREMIO',
    value: program.rewardDetail,
  });

  pass.auxiliaryFields.push({
    key: 'merchant',
    label: 'NEGOCIO',
    value: merchant.name,
  });

  pass.backFields.push(
    {
      key: 'how',
      label: 'Cómo funciona',
      value: `Junta ${program.stampsRequired} sellos y obtén: ${program.rewardDetail}. Muestra esta tarjeta en ${merchant.name} para que te sellen.`,
    },
    {
      key: 'program',
      label: 'Programa',
      value: program.name,
    },
    {
      key: 'support',
      label: 'Soporte',
      value: 'Integra Lealtad — soporte@integra-group.ai',
    }
  );

  // El QR debe ABRIR la pantalla de dar sello con esta tarjeta cargada
  // (mismo deep link que el QR de la web). Si codificara solo el cardId,
  // al escanearlo con la cámara "no abre nada".
  const webBase =
    process.env.PUBLIC_WEB_URL ?? 'https://dewt2ht9lbl07.cloudfront.net';
  pass.setBarcodes({
    message: `${webBase}/dashboard/give-stamp/?card=${card.cardId}`,
    altText: card.cardId.slice(0, 8).toUpperCase(),
    format: 'PKBarcodeFormatQR',
    messageEncoding: 'iso-8859-1',
  });

  return pass.getAsBuffer();
}
