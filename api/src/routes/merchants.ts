import { Hono } from 'hono';
import { requireTenant, requireRole, MERCHANT_ROLES } from '../middleware/tenant';
import { getMerchantByTenant, updateMerchant } from '../lib/repositories/merchant';
import { UpdateMerchantInput } from '../lib/entities';

export const merchants = new Hono();

merchants.get('/me', requireTenant, requireRole(...MERCHANT_ROLES), async (c) => {
  const tenantId = c.get('tenantId');
  const merchant = await getMerchantByTenant(tenantId);
  if (!merchant) return c.json({ error: 'merchant_not_found' }, 404);
  return c.json(merchant);
});

merchants.patch('/me', requireTenant, requireRole(...MERCHANT_ROLES), async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json().catch(() => null);
  const parsed = UpdateMerchantInput.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  if (Object.keys(parsed.data).length === 0) return c.json({ error: 'empty_body' }, 400);

  try {
    const merchant = await updateMerchant(tenantId, parsed.data);
    return c.json(merchant);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('ConditionalCheckFailed')) return c.json({ error: 'merchant_not_found' }, 404);
    throw e;
  }
});
