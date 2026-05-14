import { Hono } from 'hono';
import { requireTenant } from '../middleware/tenant';
import { createProgram, listProgramsByTenant, getProgram } from '../lib/repositories/program';
import { CreateProgramInput } from '../lib/entities';

export const programs = new Hono();

programs.post('/', requireTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json().catch(() => null);
  const parsed = CreateProgramInput.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);

  const program = await createProgram(tenantId, parsed.data);
  return c.json(program, 201);
});

programs.get('/me', requireTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const items = await listProgramsByTenant(tenantId);
  return c.json({ items });
});

programs.get('/:id', requireTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'missing_id' }, 400);
  const program = await getProgram(tenantId, id);
  if (!program) return c.json({ error: 'not_found' }, 404);
  return c.json(program);
});
