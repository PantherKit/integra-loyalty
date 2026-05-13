import { Hono } from 'hono';
import { z } from 'zod';
import { requireTenant } from '../middleware/tenant';

export const merchants = new Hono();

const CreateMerchantSchema = z.object({
  name: z.string().min(2).max(120),
  industry: z.enum(['cafe', 'restaurant', 'salon', 'retail', 'other']),
});

merchants.post('/', requireTenant, async (c) => {
  const body = await c.req.json();
  const parsed = CreateMerchantSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);

  const tenantId = c.get('tenantId');
  // TODO: persist to DDB
  return c.json({ tenantId, ...parsed.data, status: 'created (mock — DDB integration pending)' }, 201);
});

merchants.get('/', requireTenant, async (c) => {
  const tenantId = c.get('tenantId');
  // TODO: query DDB
  return c.json({ tenantId, items: [], status: 'mock — DDB integration pending' });
});
