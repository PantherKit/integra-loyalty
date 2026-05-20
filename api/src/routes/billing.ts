import { Hono } from 'hono';
import { z } from 'zod';
import { requireTenant, requireRole, MERCHANT_ROLES } from '../middleware/tenant';
import { getTenant } from '../lib/repositories/tenant';
import { entitlement } from '../lib/entitlement';
import {
  createCheckoutSession,
  handleWebhook,
  BillingNotConfiguredError,
} from '../lib/stripe';
import { BillingPlanSchema } from '../lib/entities';

export const billing = new Hono();

const WEB_BASE =
  process.env.PUBLIC_WEB_URL ?? 'https://lealtad.integra-group.ai';

const CheckoutSchema = z.object({ plan: BillingPlanSchema });

/**
 * POST /billing/checkout — crea una sesión de Stripe Checkout y devuelve {url}.
 * Requiere tenant + rol de comercio.
 */
billing.post(
  '/checkout',
  requireTenant,
  requireRole(...MERCHANT_ROLES),
  async (c) => {
    const tenantId = c.get('tenantId');
    const body = await c.req.json().catch(() => null);
    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
    }

    const tenant = await getTenant(tenantId);
    if (!tenant) return c.json({ error: 'tenant_not_found' }, 404);

    try {
      const { url } = await createCheckoutSession({
        tenant,
        plan: parsed.data.plan,
        successUrl: `${WEB_BASE}/dashboard/suscribirse/?checkout=success`,
        cancelUrl: `${WEB_BASE}/dashboard/suscribirse/?checkout=cancel`,
      });
      return c.json({ url });
    } catch (e) {
      if (e instanceof BillingNotConfiguredError) {
        return c.json({ error: 'billing_not_configured' }, 503);
      }
      throw e;
    }
  }
);

/**
 * GET /billing/status — estado de la suscripción del tenant.
 * No depende de Stripe (lee del tenant): funciona aunque no haya secret.
 */
billing.get('/status', requireTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const tenant = await getTenant(tenantId);
  if (!tenant) return c.json({ error: 'tenant_not_found' }, 404);

  const ent = entitlement(tenant);
  return c.json({
    subscriptionStatus: tenant.subscriptionStatus ?? 'none',
    trialEndsAt: tenant.trialEndsAt ?? null,
    plan: tenant.billingPlan ?? null,
    currentPeriodEnd: tenant.currentPeriodEnd ?? null,
    active: ent.active,
    reason: ent.reason,
  });
});

/**
 * POST /billing/webhook — PÚBLICO (sin requireTenant). Stripe firma el body
 * crudo: hay que pasar el body SIN parsear a constructEvent. En Hono usamos
 * c.req.text() (el raw exacto que llegó). Responde 200 si la firma valida.
 */
billing.post('/webhook', async (c) => {
  const sig = c.req.header('stripe-signature');
  if (!sig) return c.json({ error: 'missing_signature' }, 400);

  const rawBody = await c.req.text();

  try {
    const result = await handleWebhook(rawBody, sig);
    return c.json(result, 200);
  } catch (e) {
    if (e instanceof BillingNotConfiguredError) {
      return c.json({ error: 'billing_not_configured' }, 503);
    }
    const msg = e instanceof Error ? e.message : 'invalid';
    // Firma inválida / payload corrupto: 400 para que Stripe reintente.
    return c.json({ error: 'webhook_signature_invalid', detail: msg }, 400);
  }
});
