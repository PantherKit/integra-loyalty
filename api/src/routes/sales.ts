/**
 * Sales Org — consola interna de la fuerza de ventas de Integra.
 *
 * Modelo de 2 roles:
 *  - integra_admin (admin): crea admins y vendedores; ve su subárbol.
 *  - sales_rep (vendedor): vende a comercios; ve solo su propia cartera.
 *
 * Visibilidad por subárbol: cada User Integra-side lleva `createdBy`; un
 * admin ve lo que él y sus descendientes crearon (lib/sales-tree.ts).
 * Cualquier admin puede crear admins y vendedores — el creado cuelga del
 * admin que lo creó.
 *
 * Endpoints (montados bajo /admin/sales):
 *  - POST /reps                          alta de vendedor
 *  - GET  /reps                          vendedores del subárbol
 *  - GET  /reps/:repId                   detalle de un vendedor
 *  - POST /admins                        alta de admin
 *  - GET  /admins                        admins del subárbol
 *  - GET  /merchants                     comercios del subárbol
 *  - POST /merchants                     alta de comercio
 *  - POST /merchants/:merchantId/assign  reasignar vendedor de un comercio
 *  - GET  /kpis/*                        KPIs del subárbol
 *  - GET  /ai/priorities/*               priorización IA
 *
 * Autorización: requireTenant + requireRole(...INTEGRA_ROLES). Visibilidad
 * fuera de subárbol → 404 (no 403) para no filtrar existencia.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { requireTenant, requireRole, INTEGRA_ROLES } from '../middleware/tenant';
import { createCognitoUser } from '../lib/cognito';
import { listIntegraUsers, putUser } from '../lib/repositories/user';
import {
  assignRepToMerchant,
  getMerchantByTenant,
  listMerchantsByRep,
} from '../lib/repositories/merchant';
import { createTenant } from '../lib/repositories/tenant';
import { INTEGRA_TENANT_ID, Industry, User } from '../lib/entities';
import { descendantsOf } from '../lib/sales-tree';
import {
  computeMerchantsKpisForRep,
  computeRepKpi,
  computeSubtreeKpi,
  Window,
} from '../lib/sales-kpi';
import { computePriorities } from '../lib/sales-ai';

export const sales = new Hono();

sales.use('*', requireTenant);
sales.use('*', requireRole(...INTEGRA_ROLES));

// ============================================================================
// Helpers
// ============================================================================

/** Password temporal de alta — el usuario lo cambia luego por recuperación. */
function generateTempPassword(): string {
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '23456789';
  const syms = '!@#$%*';
  const pool = lower + upper + nums + syms;
  let out = '';
  out += lower[Math.floor(Math.random() * lower.length)];
  out += upper[Math.floor(Math.random() * upper.length)];
  out += nums[Math.floor(Math.random() * nums.length)];
  out += syms[Math.floor(Math.random() * syms.length)];
  for (let i = 0; i < 12; i++) out += pool[Math.floor(Math.random() * pool.length)];
  return out;
}

interface Scope {
  all: User[];
  reps: User[]; // vendedores descendientes del caller
  admins: User[]; // admins descendientes del caller
}

/**
 * Carga el subárbol del caller (admin). Devuelve sus vendedores y admins
 * descendientes. No incluye al caller mismo.
 */
async function loadScope(callerId: string): Promise<Scope> {
  const all = await listIntegraUsers();
  const desc = descendantsOf(callerId, all);
  return {
    all,
    reps: desc.filter((u) => u.role === 'sales_rep'),
    admins: desc.filter((u) => u.role === 'integra_admin'),
  };
}

function serializeUser(u: User) {
  return {
    userId: u.userId,
    email: u.email,
    createdBy: u.createdBy ?? null,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  };
}

function parseWindow(q: string | undefined): Window {
  if (q === '7d' || q === '30d' || q === '90d' || q === 'all') return q;
  return '30d';
}

// ============================================================================
// POST /admin/sales/reps — alta de vendedor
// ============================================================================

const CreateRepBody = z.object({ email: z.string().email() });

sales.post('/reps', async (c) => {
  if (c.get('userRole') !== 'integra_admin') {
    return c.json({ error: 'forbidden', hint: 'solo un admin crea vendedores' }, 403);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = CreateRepBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  const tempPassword = generateTempPassword();
  const { cognitoSub } = await createCognitoUser({
    email: parsed.data.email,
    password: tempPassword,
    tenantId: INTEGRA_TENANT_ID,
    role: 'sales_rep',
  });

  const user = await putUser({
    type: 'USER',
    tenantId: INTEGRA_TENANT_ID,
    userId: cognitoSub,
    email: parsed.data.email,
    role: 'sales_rep',
    cognitoSub,
    createdBy: c.get('userId'), // cuelga del admin que lo crea
  });

  return c.json({ rep: serializeUser(user), tempPassword }, 201);
});

// ============================================================================
// GET /admin/sales/reps — vendedores del subárbol
// ============================================================================

sales.get('/reps', async (c) => {
  if (c.get('userRole') !== 'integra_admin') {
    return c.json({ error: 'forbidden' }, 403);
  }
  const { reps } = await loadScope(c.get('userId'));
  return c.json({ reps: reps.map(serializeUser) });
});

// ============================================================================
// GET /admin/sales/reps/:repId — detalle de un vendedor
// ============================================================================

sales.get('/reps/:repId', async (c) => {
  if (c.get('userRole') !== 'integra_admin') {
    return c.json({ error: 'forbidden' }, 403);
  }
  const repId = c.req.param('repId');
  const { reps } = await loadScope(c.get('userId'));
  const rep = reps.find((r) => r.userId === repId);
  // 404 si no está en el subárbol — no filtramos existencia.
  if (!rep) return c.json({ error: 'rep_not_found' }, 404);
  return c.json(serializeUser(rep));
});

// ============================================================================
// POST /admin/sales/admins — alta de admin
// ============================================================================

const CreateAdminBody = z.object({ email: z.string().email() });

sales.post('/admins', async (c) => {
  if (c.get('userRole') !== 'integra_admin') {
    return c.json({ error: 'forbidden', hint: 'solo un admin crea admins' }, 403);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = CreateAdminBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  const tempPassword = generateTempPassword();
  const { cognitoSub } = await createCognitoUser({
    email: parsed.data.email,
    password: tempPassword,
    tenantId: INTEGRA_TENANT_ID,
    role: 'integra_admin',
  });

  const user = await putUser({
    type: 'USER',
    tenantId: INTEGRA_TENANT_ID,
    userId: cognitoSub,
    email: parsed.data.email,
    role: 'integra_admin',
    cognitoSub,
    createdBy: c.get('userId'), // cuelga del admin que lo crea
  });

  return c.json({ admin: serializeUser(user), tempPassword }, 201);
});

// ============================================================================
// GET /admin/sales/admins — admins del subárbol
// ============================================================================

sales.get('/admins', async (c) => {
  if (c.get('userRole') !== 'integra_admin') {
    return c.json({ error: 'forbidden' }, 403);
  }
  const { admins } = await loadScope(c.get('userId'));
  return c.json({ admins: admins.map(serializeUser) });
});

// ============================================================================
// GET /admin/sales/merchants — comercios del subárbol
// ============================================================================

sales.get('/merchants', async (c) => {
  const callerRole = c.get('userRole');
  const callerId = c.get('userId');

  if (callerRole === 'sales_rep') {
    const merchants = await listMerchantsByRep(callerId);
    return c.json({ merchants });
  }

  // integra_admin: comercios vendidos por cualquier vendedor del subárbol.
  const { reps } = await loadScope(callerId);
  const repIdFilter = c.req.query('repId');
  const targetReps = repIdFilter
    ? reps.filter((r) => r.userId === repIdFilter)
    : reps;
  const lists = await Promise.all(targetReps.map((r) => listMerchantsByRep(r.userId)));
  return c.json({ merchants: lists.flat() });
});

// ============================================================================
// POST /admin/sales/merchants/:merchantId/assign — reasignar vendedor
// ============================================================================

const AssignBody = z.object({ salesRepId: z.string().nullable() });

sales.post('/merchants/:merchantId/assign', async (c) => {
  if (c.get('userRole') !== 'integra_admin') {
    return c.json({ error: 'forbidden' }, 403);
  }
  const merchantTenantId = c.req.param('merchantId');

  const body = await c.req.json().catch(() => null);
  const parsed = AssignBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  // El vendedor destino debe estar en el subárbol del admin.
  if (parsed.data.salesRepId !== null) {
    const { reps } = await loadScope(c.get('userId'));
    if (!reps.some((r) => r.userId === parsed.data.salesRepId)) {
      return c.json({ error: 'rep_not_in_your_team' }, 403);
    }
  }

  const merchant = await getMerchantByTenant(merchantTenantId);
  if (!merchant) return c.json({ error: 'merchant_not_found' }, 404);

  const updated = await assignRepToMerchant(merchantTenantId, parsed.data.salesRepId);
  return c.json({ merchant: updated });
});

// ============================================================================
// POST /admin/sales/merchants — alta de comercio
// ============================================================================

const CreateMerchantBody = z.object({
  merchantName: z.string().min(2).max(120),
  industry: Industry,
  ownerEmail: z.string().email(),
  // Solo integra_admin: a qué vendedor del subárbol asignarlo. sales_rep
  // se asigna a sí mismo y este campo se ignora.
  salesRepId: z.string().optional(),
});

sales.post('/merchants', async (c) => {
  const callerRole = c.get('userRole');
  const callerId = c.get('userId');

  const body = await c.req.json().catch(() => null);
  const parsed = CreateMerchantBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  let assignedRepId: string | null = null;
  if (callerRole === 'sales_rep') {
    assignedRepId = callerId;
  } else if (parsed.data.salesRepId) {
    const { reps } = await loadScope(callerId);
    if (!reps.some((r) => r.userId === parsed.data.salesRepId)) {
      return c.json({ error: 'rep_not_in_your_team' }, 403);
    }
    assignedRepId = parsed.data.salesRepId;
  }

  const tempPassword = generateTempPassword();
  const newTenantId = randomUUID();
  const { cognitoSub } = await createCognitoUser({
    email: parsed.data.ownerEmail,
    password: tempPassword,
    tenantId: newTenantId,
    role: 'owner',
  });

  const { tenant, merchant, user } = await createTenant({
    email: parsed.data.ownerEmail,
    merchantName: parsed.data.merchantName,
    industry: parsed.data.industry,
    cognitoSub,
    tenantId: newTenantId,
  });

  const finalMerchant = assignedRepId
    ? await assignRepToMerchant(tenant.tenantId, assignedRepId)
    : merchant;

  return c.json(
    {
      tenant: { tenantId: tenant.tenantId, slug: merchant.slug },
      merchant: finalMerchant,
      owner: { userId: user.userId, email: user.email },
      tempPassword,
    },
    201
  );
});

// ============================================================================
// KPIs
// ============================================================================

/** GET /admin/sales/kpis/reps — KPI por vendedor del subárbol. */
sales.get('/kpis/reps', async (c) => {
  if (c.get('userRole') !== 'integra_admin') {
    return c.json({ error: 'forbidden' }, 403);
  }
  const window = parseWindow(c.req.query('window'));
  const { reps } = await loadScope(c.get('userId'));
  const kpis = await Promise.all(
    reps.map((r) => computeRepKpi({ userId: r.userId, email: r.email }, window))
  );
  return c.json({ window, reps: kpis });
});

/** GET /admin/sales/kpis/admins — KPI por admin descendiente (su subárbol). */
sales.get('/kpis/admins', async (c) => {
  if (c.get('userRole') !== 'integra_admin') {
    return c.json({ error: 'forbidden' }, 403);
  }
  const { admins, all } = await loadScope(c.get('userId'));
  const kpis = await Promise.all(
    admins.map(async (a) => {
      const subReps = descendantsOf(a.userId, all).filter((u) => u.role === 'sales_rep');
      const totals = await computeSubtreeKpi(subReps);
      return { adminId: a.userId, adminEmail: a.email, ...totals };
    })
  );
  return c.json({ admins: kpis });
});

/**
 * GET /admin/sales/kpis/me — KPI del caller.
 *  - sales_rep      → su KPI individual
 *  - integra_admin  → totales de su subárbol completo
 */
sales.get('/kpis/me', async (c) => {
  const callerRole = c.get('userRole');
  const callerId = c.get('userId');
  const callerEmail = c.get('userEmail');

  if (callerRole === 'sales_rep') {
    const window = parseWindow(c.req.query('window'));
    const kpi = await computeRepKpi({ userId: callerId, email: callerEmail }, window);
    return c.json(kpi);
  }

  // integra_admin → suma de su subárbol.
  const { reps } = await loadScope(callerId);
  const totals = await computeSubtreeKpi(reps);
  return c.json({ adminId: callerId, adminEmail: callerEmail, ...totals });
});

/** GET /admin/sales/kpis/merchants/:repId — desglose por comercio de un rep. */
sales.get('/kpis/merchants/:repId', async (c) => {
  const callerRole = c.get('userRole');
  const callerId = c.get('userId');
  const repId = c.req.param('repId');

  if (callerRole === 'sales_rep') {
    if (repId !== callerId) return c.json({ error: 'forbidden' }, 403);
  } else {
    // integra_admin → el rep debe estar en su subárbol.
    const { reps } = await loadScope(callerId);
    if (!reps.some((r) => r.userId === repId)) {
      return c.json({ error: 'rep_not_found' }, 404);
    }
  }

  const merchants = await computeMerchantsKpisForRep(repId);
  return c.json({ repId, merchants });
});

// ============================================================================
// AI lead scoring
// ============================================================================

/** GET /admin/sales/ai/priorities/me — priorities del caller. */
sales.get('/ai/priorities/me', async (c) => {
  const callerRole = c.get('userRole');
  const callerId = c.get('userId');
  const fresh = c.req.query('fresh') === 'true' && callerRole === 'integra_admin';

  if (callerRole === 'sales_rep') {
    const priorities = await computePriorities(callerId, { fresh });
    return c.json({ repId: callerId, priorities });
  }

  // integra_admin → unión de prioridades de los vendedores del subárbol.
  const { reps } = await loadScope(callerId);
  const all = await Promise.all(
    reps.map((r) =>
      computePriorities(r.userId, { fresh }).then((p) =>
        p.map((pp) => ({ ...pp, repId: r.userId, repEmail: r.email }))
      )
    )
  );
  const flat = all.flat().sort((a, b) => b.score - a.score);
  return c.json({ priorities: flat });
});

/** GET /admin/sales/ai/priorities/reps/:repId — priorities de un rep dado. */
sales.get('/ai/priorities/reps/:repId', async (c) => {
  const callerRole = c.get('userRole');
  const callerId = c.get('userId');
  const repId = c.req.param('repId');
  const fresh = c.req.query('fresh') === 'true' && callerRole === 'integra_admin';

  if (callerRole === 'sales_rep') return c.json({ error: 'forbidden' }, 403);

  const { reps } = await loadScope(callerId);
  if (!reps.some((r) => r.userId === repId)) {
    return c.json({ error: 'rep_not_found' }, 404);
  }

  const priorities = await computePriorities(repId, { fresh });
  return c.json({ repId, priorities });
});
