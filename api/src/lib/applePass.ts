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

  const bgRgb = hexToRgbString(merchant.brandColor, 'rgb(30, 30, 40)');
  const [br, bg, bb] = hexToRgbTuple(merchant.brandColor);
  const fgRgb = contrastOn(merchant.brandColor);

  // Logo real del comercio (PNG subido en el onboarding). Si no hay, cae a
  // un bloque sólido (Apple igual exige las imágenes).
  const brandLogo = pngFromDataUrl(merchant.logoUrl);
  const solidSm = solidPng(58, br, bg, bb);
  const icon = brandLogo ?? solidPng(29, br, bg, bb);
  const icon2x = brandLogo ?? solidSm;
  const logo = brandLogo ?? solidPng(160, br, bg, bb);
  const logo2x = brandLogo ?? solidPng(320, br, bg, bb);

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
    },
    {
      wwdr: creds.wwdr,
      signerCert: creds.signerCert,
      signerKey: creds.signerKey,
      signerKeyPassphrase: creds.passphrase,
    }
  );

  pass.type = 'storeCard';

  const remaining = Math.max(0, program.stampsRequired - card.stamps);
  const complete = card.stamps >= program.stampsRequired;

  // Header: visible incluso cuando el pase está apilado en Wallet.
  pass.headerFields.push({
    key: 'count',
    label: 'SELLOS',
    value: `${card.stamps}/${program.stampsRequired}`,
  });

  pass.primaryFields.push({
    key: 'progress',
    label: 'TU PROGRESO',
    value: complete ? '¡Premio listo! 🎉' : `Te faltan ${remaining}`,
  });

  pass.secondaryFields.push({
    key: 'reward',
    label: 'TU PREMIO',
    value: program.rewardDetail,
  });

  pass.auxiliaryFields.push({
    key: 'merchant',
    label: 'COMERCIO',
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
