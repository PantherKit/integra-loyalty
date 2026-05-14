import { Hono } from 'hono';
import { requireTenant } from '../middleware/tenant';
import { listRecentTransactions } from '../lib/repositories/transaction';

export const activity = new Hono();

/**
 * GET /activity — feed de actividad reciente del tenant (merchant dashboard).
 * Query param: ?limit=20 (default 50, max 100)
 */
activity.get('/', requireTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const limitParam = c.req.query('limit');
  const limit = Math.min(100, Math.max(1, parseInt(limitParam ?? '50', 10) || 50));
  const items = await listRecentTransactions(tenantId, limit);
  return c.json({ items });
});
