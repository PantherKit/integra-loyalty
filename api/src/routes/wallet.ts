import { Hono } from 'hono';
import { getCardById } from '../lib/repositories/card';
import { getProgram } from '../lib/repositories/program';
import { getMerchantByTenant } from '../lib/repositories/merchant';
import { buildPkpass, passAuthToken } from '../lib/applePass';
import {
  registerDevice,
  unregisterDevice,
  listRegistrationsByDevice,
} from '../lib/repositories/passRegistration';

/**
 * PassKit Web Service de Apple — protocolo EXACTO.
 * Montado en /v1 (Apple agrega /v1 a webServiceURL).
 *
 *  - serialNumber == cardId (opaco, UUID)
 *  - passTypeIdentifier == el de los certs (no se valida contra DB, fijo)
 *  - auth: `Authorization: ApplePass <token>` con token == passAuthToken(serial)
 *
 * No filtramos detalle interno en errores (solo 401/404/204/304/200/201).
 */
export const wallet = new Hono();

/** Extrae el token de `Authorization: ApplePass <token>`; null si ausente/mal formado. */
function extractApplePassToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^ApplePass\s+(.+)$/);
  return m ? m[1].trim() : null;
}

/** Valida el token contra passAuthToken(serial). */
async function isAuthorized(authHeader: string | undefined, serialNumber: string): Promise<boolean> {
  const token = extractApplePassToken(authHeader);
  if (!token) return false;
  try {
    const expected = await passAuthToken(serialNumber);
    // comparación de longitud constante razonable: ambos son hex de 64 chars
    if (token.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Registro de un device para recibir updates de un pase
// POST /v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber
// ---------------------------------------------------------------------------
wallet.post(
  '/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber',
  async (c) => {
    const deviceLibraryIdentifier = c.req.param('deviceLibraryIdentifier');
    const serialNumber = c.req.param('serialNumber');

    if (!(await isAuthorized(c.req.header('Authorization'), serialNumber))) {
      return c.body(null, 401);
    }

    const card = await getCardById(serialNumber);
    if (!card) return c.body(null, 404);

    const body = (await c.req.json().catch(() => ({}))) as { pushToken?: string };
    const pushToken = body?.pushToken;
    if (!pushToken || typeof pushToken !== 'string') {
      return c.body(null, 400);
    }

    // ¿ya existía? -> 200, si no -> 201 (protocolo Apple)
    const existing = (await listRegistrationsByDevice(deviceLibraryIdentifier)).some(
      (r) => r.cardId === serialNumber
    );

    await registerDevice({
      tenantId: card.tenantId,
      cardId: serialNumber,
      deviceLibraryIdentifier,
      pushToken,
    });

    return c.body(null, existing ? 200 : 201);
  }
);

// ---------------------------------------------------------------------------
// Des-registro de un device
// DELETE (misma ruta)
// ---------------------------------------------------------------------------
wallet.delete(
  '/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber',
  async (c) => {
    const deviceLibraryIdentifier = c.req.param('deviceLibraryIdentifier');
    const serialNumber = c.req.param('serialNumber');

    if (!(await isAuthorized(c.req.header('Authorization'), serialNumber))) {
      return c.body(null, 401);
    }

    const card = await getCardById(serialNumber);
    if (!card) return c.body(null, 404);

    await unregisterDevice(card.tenantId, serialNumber, deviceLibraryIdentifier);
    return c.body(null, 200);
  }
);

// ---------------------------------------------------------------------------
// Lista de seriales actualizados para un device
// GET /v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier?passesUpdatedSince=...
// ---------------------------------------------------------------------------
wallet.get(
  '/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier',
  async (c) => {
    const deviceLibraryIdentifier = c.req.param('deviceLibraryIdentifier');
    const passesUpdatedSince = c.req.query('passesUpdatedSince');

    const regs = await listRegistrationsByDevice(deviceLibraryIdentifier);
    if (regs.length === 0) return c.body(null, 204);

    const since = passesUpdatedSince ? Date.parse(passesUpdatedSince) : NaN;
    const sinceMs = Number.isNaN(since) ? null : since;

    const serialNumbers: string[] = [];
    let maxUpdatedAt = 0;
    let maxUpdatedAtIso = '';

    for (const reg of regs) {
      const card = await getCardById(reg.cardId);
      if (!card) continue;
      const cardUpdatedMs = Date.parse(card.updatedAt);
      if (Number.isNaN(cardUpdatedMs)) continue;

      if (sinceMs === null || cardUpdatedMs > sinceMs) {
        serialNumbers.push(card.cardId);
      }
      if (cardUpdatedMs > maxUpdatedAt) {
        maxUpdatedAt = cardUpdatedMs;
        maxUpdatedAtIso = card.updatedAt;
      }
    }

    if (serialNumbers.length === 0) return c.body(null, 204);

    return c.json({
      lastUpdated: maxUpdatedAtIso || new Date(maxUpdatedAt).toISOString(),
      serialNumbers,
    });
  }
);

// ---------------------------------------------------------------------------
// El pase actualizado
// GET /v1/passes/:passTypeIdentifier/:serialNumber
// ---------------------------------------------------------------------------
wallet.get('/passes/:passTypeIdentifier/:serialNumber', async (c) => {
  const serialNumber = c.req.param('serialNumber');

  if (!(await isAuthorized(c.req.header('Authorization'), serialNumber))) {
    return c.body(null, 401);
  }

  const card = await getCardById(serialNumber);
  if (!card) return c.body(null, 404);

  const cardUpdatedMs = Date.parse(card.updatedAt);

  // If-Modified-Since: si el cliente ya tiene una versión >= la nuestra -> 304
  const ifModifiedSince = c.req.header('If-Modified-Since');
  if (ifModifiedSince && !Number.isNaN(cardUpdatedMs)) {
    const sinceMs = Date.parse(ifModifiedSince);
    if (!Number.isNaN(sinceMs) && sinceMs >= cardUpdatedMs) {
      return c.body(null, 304);
    }
  }

  const [program, merchant] = await Promise.all([
    getProgram(card.tenantId, card.programId),
    getMerchantByTenant(card.tenantId),
  ]);
  if (!program || !merchant) return c.body(null, 404);

  try {
    const pkpass = await buildPkpass({ card, program, merchant });
    c.header('Content-Type', 'application/vnd.apple.pkpass');
    if (!Number.isNaN(cardUpdatedMs)) {
      c.header('Last-Modified', new Date(cardUpdatedMs).toUTCString());
    }
    return c.body(new Uint8Array(pkpass));
  } catch (err) {
    console.error('wallet_pkpass_generation_failed', { serialNumber, err });
    return c.body(null, 500);
  }
});

// ---------------------------------------------------------------------------
// Log endpoint — Apple envía errores del device aquí. Nunca falla.
// POST /v1/log
// ---------------------------------------------------------------------------
wallet.post('/log', async (c) => {
  const body = await c.req.json().catch(() => null);
  console.log('apple_wallet_log', body);
  return c.body(null, 200);
});
