import Stripe from 'stripe';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { Tenant, BillingPlan } from './entities';
import { updateTenantBilling } from './repositories/tenant';

// =============================================================================
// Carga de credenciales Stripe desde Secrets Manager
// MISMO patrón que applePass.ts: cache module-level + carga perezosa.
// NO hace throw a nivel módulo: si el secret no existe, las rutas responden
// un error controlado (billing_not_configured) en vez de tirar la Lambda.
// =============================================================================

export interface StripeCredentials {
  secretKey: string;
  webhookSecret: string;
}

const SECRET_NAME = process.env.STRIPE_SECRET_NAME || 'integra-loyalty/stripe';
const SECRET_REGION = 'us-east-1';

let cachedCreds: StripeCredentials | null = null;
let cachedClient: Stripe | null = null;

/** Error tipado para que las rutas devuelvan 503 billing_not_configured. */
export class BillingNotConfiguredError extends Error {
  constructor(detail?: string) {
    super(detail ?? 'billing_not_configured');
    this.name = 'BillingNotConfiguredError';
  }
}

async function loadCredentials(): Promise<StripeCredentials> {
  if (cachedCreds) return cachedCreds;
  try {
    const client = new SecretsManagerClient({ region: SECRET_REGION });
    const res = await client.send(new GetSecretValueCommand({ SecretId: SECRET_NAME }));
    if (!res.SecretString) throw new Error('stripe secret has no SecretString');
    const parsed = JSON.parse(res.SecretString) as Partial<StripeCredentials>;
    if (!parsed.secretKey) throw new Error('stripe secret missing key: secretKey');
    if (!parsed.webhookSecret) throw new Error('stripe secret missing key: webhookSecret');
    cachedCreds = { secretKey: parsed.secretKey, webhookSecret: parsed.webhookSecret };
    return cachedCreds;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    throw new BillingNotConfiguredError(msg);
  }
}

/** Cliente Stripe (lazy + cache). Lanza BillingNotConfiguredError si no hay secret. */
export async function getStripe(): Promise<Stripe> {
  if (cachedClient) return cachedClient;
  const creds = await loadCredentials();
  cachedClient = new Stripe(creds.secretKey, { apiVersion: '2025-02-24.acacia' });
  return cachedClient;
}

async function getWebhookSecret(): Promise<string> {
  return (await loadCredentials()).webhookSecret;
}

// =============================================================================
// Catálogo de planes (MXN, recurrente mensual). Centavos.
// =============================================================================

interface PlanDef {
  plan: BillingPlan;
  lookupKey: string;
  productName: string;
  unitAmount: number; // centavos MXN
}

const PLAN_DEFS: PlanDef[] = [
  { plan: 'basico', lookupKey: 'integra_basico', productName: 'Integra Loyalty — Básico', unitAmount: 34900 },
  { plan: 'pro', lookupKey: 'integra_pro', productName: 'Integra Loyalty — Pro', unitAmount: 64900 },
  { plan: 'multi', lookupKey: 'integra_multi', productName: 'Integra Loyalty — Multi-sucursal', unitAmount: 119000 },
];

const LOOKUP_TO_PLAN: Record<string, BillingPlan> = Object.fromEntries(
  PLAN_DEFS.map((d) => [d.lookupKey, d.plan])
) as Record<string, BillingPlan>;

let cachedPrices: Record<BillingPlan, string> | null = null;

/**
 * Crea (idempotente) los 3 Products+Prices recurrentes mensuales en MXN.
 * Idempotencia: busca primero el Price por lookup_key; si existe lo reusa.
 * Devuelve mapa plan -> priceId.
 */
export async function ensurePrices(): Promise<Record<BillingPlan, string>> {
  if (cachedPrices) return cachedPrices;
  const stripe = await getStripe();

  const existing = await stripe.prices.list({
    active: true,
    lookup_keys: PLAN_DEFS.map((d) => d.lookupKey),
    expand: ['data.product'],
    limit: 100,
  });

  const map: Partial<Record<BillingPlan, string>> = {};
  for (const price of existing.data) {
    if (price.lookup_key && LOOKUP_TO_PLAN[price.lookup_key]) {
      map[LOOKUP_TO_PLAN[price.lookup_key]] = price.id;
    }
  }

  for (const def of PLAN_DEFS) {
    if (map[def.plan]) continue;
    const product = await stripe.products.create({
      name: def.productName,
      metadata: { plan: def.plan },
    });
    const price = await stripe.prices.create({
      product: product.id,
      currency: 'mxn',
      unit_amount: def.unitAmount,
      recurring: { interval: 'month' },
      lookup_key: def.lookupKey,
    });
    map[def.plan] = price.id;
  }

  cachedPrices = map as Record<BillingPlan, string>;
  return cachedPrices;
}

// =============================================================================
// Checkout
// =============================================================================

export interface CreateCheckoutArgs {
  tenant: Tenant;
  plan: BillingPlan;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Crea una Stripe Checkout Session en modo 'subscription'.
 * - Crea/reusa el customer (guarda stripeCustomerId en el tenant).
 * - Respeta los 14 días: si trialEndsAt está en el futuro, lo pasa como
 *   subscription_data.trial_end (epoch s) para no recortar la prueba.
 */
export async function createCheckoutSession(
  args: CreateCheckoutArgs
): Promise<{ url: string }> {
  const stripe = await getStripe();
  const prices = await ensurePrices();
  const priceId = prices[args.plan];
  if (!priceId) throw new Error(`no price for plan ${args.plan}`);

  let customerId = args.tenant.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { tenantId: args.tenant.tenantId },
    });
    customerId = customer.id;
    await updateTenantBilling(args.tenant.tenantId, { stripeCustomerId: customerId });
  }

  const trialEndMs = args.tenant.trialEndsAt
    ? Date.parse(args.tenant.trialEndsAt)
    : NaN;
  const trialEndSec =
    Number.isFinite(trialEndMs) && trialEndMs > Date.now()
      ? Math.floor(trialEndMs / 1000)
      : undefined;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: args.tenant.tenantId,
    subscription_data: {
      metadata: { tenantId: args.tenant.tenantId, plan: args.plan },
      ...(trialEndSec ? { trial_end: trialEndSec } : {}),
    },
    metadata: { tenantId: args.tenant.tenantId, plan: args.plan },
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
  });

  if (!session.url) throw new Error('stripe checkout session has no url');
  return { url: session.url };
}

// =============================================================================
// Webhook
// =============================================================================

function statusFromStripe(s: Stripe.Subscription.Status): Tenant['subscriptionStatus'] {
  switch (s) {
    case 'active':
    case 'trialing':
    case 'past_due':
    case 'canceled':
      return s;
    case 'unpaid':
      return 'past_due';
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
      return 'none';
    default:
      return 'none';
  }
}

function planFromSubscription(sub: Stripe.Subscription): BillingPlan | undefined {
  const metaPlan = sub.metadata?.plan as BillingPlan | undefined;
  if (metaPlan) return metaPlan;
  const lk = sub.items?.data?.[0]?.price?.lookup_key;
  return lk ? LOOKUP_TO_PLAN[lk] : undefined;
}

/**
 * current_period_end: en API <= 2025-02-24 vive en la suscripción; desde
 * 2025-03-31 (incl. la versión dahlia del webhook) Stripe lo movió al item.
 * Leemos ambos para ser compatibles con cualquier versión del payload.
 */
function periodEndSec(sub: Stripe.Subscription): number | undefined {
  const top = (sub as { current_period_end?: number }).current_period_end;
  if (typeof top === 'number') return top;
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined;
  return typeof item?.current_period_end === 'number'
    ? item.current_period_end
    : undefined;
}

async function applySubscription(tenantId: string, sub: Stripe.Subscription) {
  const periodEnd = periodEndSec(sub);
  await updateTenantBilling(tenantId, {
    subscriptionStatus: statusFromStripe(sub.status),
    stripeSubscriptionId: sub.id,
    billingPlan: planFromSubscription(sub),
    currentPeriodEnd: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : undefined,
  });
}

/**
 * Verifica la firma del webhook y procesa los eventos relevantes.
 * checkout.session.completed / customer.subscription.updated|deleted
 * sincronizan el estado de suscripción en el tenant.
 */
export async function handleWebhook(
  rawBody: string | Buffer,
  sig: string
): Promise<{ received: true; type: string }> {
  const stripe = await getStripe();
  const webhookSecret = await getWebhookSecret();
  const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantId =
        session.client_reference_id ?? session.metadata?.tenantId;
      if (tenantId && session.subscription) {
        const subId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        await applySubscription(tenantId, sub);
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const tenantId = sub.metadata?.tenantId;
      if (tenantId) {
        if (event.type === 'customer.subscription.deleted') {
          await updateTenantBilling(tenantId, {
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: sub.id,
          });
        } else {
          await applySubscription(tenantId, sub);
        }
      }
      break;
    }
    default:
      break;
  }

  return { received: true, type: event.type };
}
