import { Hono } from 'hono';
import { requireTenant, requireRole, MERCHANT_ROLES } from '../middleware/tenant';
import { getCard, getCardById, listCardsByPhoneInTenant, stampCard, redeemCard } from '../lib/repositories/card';
import { getProgram } from '../lib/repositories/program';
import { getMerchantByTenant } from '../lib/repositories/merchant';
import { buildPkpass } from '../lib/applePass';
import { StampInput, RedeemInput } from '../lib/entities';

export const cards = new Hono();

/**
 * GET /cards/lookup?phone=+5219991234567 — merchant busca cards de un customer por phone (auth).
 */
cards.get('/lookup', requireTenant, requireRole(...MERCHANT_ROLES), async (c) => {
  const tenantId = c.get('tenantId');
  const phone = c.req.query('phone');
  if (!phone || !/^\+\d{10,15}$/.test(phone)) {
    return c.json({ error: 'invalid_phone', hint: 'formato E.164 ej. +5219991234567' }, 400);
  }
  const items = await listCardsByPhoneInTenant(tenantId, phone);
  return c.json({ items });
});

/**
 * GET /cards/:id — público, lee una card por su id opaco (PWA wallet view).
 * Nota: SIN requireTenant. cardId es opaco (UUID), funciona como bearer.
 * Hallazgo C1: NO devolver el item crudo (filtraba customerId, tenantId,
 * customerPhone E.164 y claves internas cross-tenant). Se proyecta un DTO
 * mínimo; el branding/programa lo da el endpoint público del comercio.
 */
cards.get('/:id', async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'missing_id' }, 400);
  const card = await getCardById(id);
  if (!card) return c.json({ error: 'card_not_found' }, 404);
  return c.json({
    cardId: card.cardId,
    programId: card.programId,
    stamps: card.stamps,
    redemptionsCount: card.redemptionsCount,
    status: card.status,
  });
});

/**
 * GET /cards/:id/pkpass — público, genera y firma el Apple Wallet pass
 * dinámico para esta card. SIN requireTenant (igual que GET /cards/:id):
 * cardId es opaco y funciona como bearer.
 */
cards.get('/:id/pkpass', async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'missing_id' }, 400);

  const card = await getCardById(id);
  if (!card) return c.json({ error: 'card_not_found' }, 404);

  try {
    const [program, merchant] = await Promise.all([
      getProgram(card.tenantId, card.programId),
      getMerchantByTenant(card.tenantId),
    ]);
    if (!program) return c.json({ error: 'program_not_found' }, 404);
    if (!merchant) return c.json({ error: 'merchant_not_found' }, 404);

    const pkpass = await buildPkpass({ card, program, merchant });

    c.header('Content-Type', 'application/vnd.apple.pkpass');
    c.header('Content-Disposition', `attachment; filename=integra-${card.cardId}.pkpass`);
    return c.body(new Uint8Array(pkpass));
  } catch (err) {
    console.error('pkpass_generation_failed', { cardId: id, err });
    return c.json({ error: 'pkpass_generation_failed' }, 500);
  }
});

/**
 * POST /cards/:id/stamp — agrega sellos (auth requerida).
 */
cards.post('/:id/stamp', requireTenant, requireRole(...MERCHANT_ROLES), async (c) => {
  const tenantId = c.get('tenantId');
  const userId = c.get('userId');
  const cardId = c.req.param('id');
  if (!cardId) return c.json({ error: 'missing_id' }, 400);

  const body = await c.req.json().catch(() => ({}));
  const parsed = StampInput.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);

  const card = await getCard(tenantId, cardId);
  if (!card) return c.json({ error: 'card_not_found' }, 404);

  const program = await getProgram(tenantId, card.programId);
  if (!program) return c.json({ error: 'program_not_found' }, 404);

  try {
    const result = await stampCard({
      tenantId,
      cardId,
      amount: parsed.data.amount,
      program,
      performedByUserId: userId,
      note: parsed.data.note,
    });
    return c.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('ConditionalCheckFailed')) {
      return c.json({ error: 'race_condition', hint: 'Otro stamp se aplicó al mismo tiempo. Reintenta.' }, 409);
    }
    if (msg.startsWith('card_not_active')) return c.json({ error: msg }, 409);
    throw e;
  }
});

/**
 * POST /cards/:id/redeem — canjea premio (auth requerida).
 */
cards.post('/:id/redeem', requireTenant, requireRole(...MERCHANT_ROLES), async (c) => {
  const tenantId = c.get('tenantId');
  const userId = c.get('userId');
  const cardId = c.req.param('id');
  if (!cardId) return c.json({ error: 'missing_id' }, 400);

  const body = await c.req.json().catch(() => ({}));
  const parsed = RedeemInput.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);

  const card = await getCard(tenantId, cardId);
  if (!card) return c.json({ error: 'card_not_found' }, 404);

  const program = await getProgram(tenantId, card.programId);
  if (!program) return c.json({ error: 'program_not_found' }, 404);

  try {
    const result = await redeemCard({
      tenantId,
      cardId,
      program,
      performedByUserId: userId,
      note: parsed.data.note,
    });
    return c.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.startsWith('insufficient_stamps')) {
      return c.json({ error: 'insufficient_stamps', detail: msg, hint: 'Aún no completa el programa.' }, 409);
    }
    if (msg.includes('ConditionalCheckFailed')) {
      return c.json({ error: 'race_condition', hint: 'El canje ya fue procesado.' }, 409);
    }
    if (msg.startsWith('card_not_active')) return c.json({ error: msg }, 409);
    throw e;
  }
});
