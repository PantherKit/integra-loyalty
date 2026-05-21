/**
 * Sales Org — endpoints internos de la fuerza de ventas de Integra.
 *
 * Jerarquía: integra_admin → sales_admin → sales_rep → merchant.
 *
 * Visibilidad:
 *  - integra_admin ve toda la fuerza
 *  - sales_admin ve solo sus reps y los merchants vendidos por esos reps
 *  - sales_rep ve solo sus merchants
 *
 * Endpoints (montados bajo /admin/sales):
 *  - POST /reps                          alta de sales_rep
 *  - GET  /reps                          lista de reps según rol
 *  - GET  /reps/:repId                   detalle de un rep
 *  - GET  /merchants                     merchants visibles según rol
 *  - POST /merchants/:merchantId/assign  reasignar salesRepId
 *
 * Autorización: requireTenant + requireRole(...INTEGRA_ROLES). Cada handler
 * reverifica visibilidad jerárquica antes de devolver datos. Visibilidad ajena
 * devuelve 404 (no 403) para no filtrar existencia.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { requireTenant, requireRole, INTEGRA_ROLES } from '../middleware/tenant';
import { createCognitoUser } from '../lib/cognito';
import {
  getUser,
  listIntegraUsers,
  listSalesRepsByAdmin,
  putUser,
} from '../lib/repositories/user';
import { randomUUID } from 'node:crypto';
import {
  assignRepToMerchant,
  getMerchantByTenant,
  listMerchantsByRep,
} from '../lib/repositories/merchant';
import { createTenant } from '../lib/repositories/tenant';
import { INTEGRA_TENANT_ID, Industry, User } from '../lib/entities';
import {
  computeAdminKpi,
  computeMerchantsKpisForRep,
  computeRepKpi,
  listAllSalesAdmins,
  Window,
} from '../lib/sales-kpi';

export const sales = new Hono();

sales.use('*', requireTenant);
sales.use('*', requireRole(...INTEGRA_ROLES));

// ============================================================================
// POST /admin/sales/reps — alta de sales_rep
// ============================================================================

const CreateRepBody = z.object({
  email: z.string().email(),
  // Si el caller es integra_admin, debe pasar salesAdminId explícito.
  // Si el caller es sales_admin, se ignora y se usa su propio sub.
  salesAdminId: z.string().optional(),
});

/** Password temporal de alta — el rep lo cambia después por flow de recuperación. */
function generateTempPassword(): string {
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '23456789';
  const syms = '!@#$%*';
  const pool = lower + upper + nums + syms;
  let out = '';
  // Garantiza al menos uno de cada categoría
  out += lower[Math.floor(Math.random() * lower.length)];
  out += upper[Math.floor(Math.random() * upper.length)];
  out += nums[Math.floor(Math.random() * nums.length)];
  out += syms[Math.floor(Math.random() * syms.length)];
  for (let i = 0; i < 12; i++) out += pool[Math.floor(Math.random() * pool.length)];
  return out;
}

sales.post('/reps', async (c) => {
  const callerRole = c.get('userRole');
  if (callerRole !== 'sales_admin' && callerRole !== 'integra_admin') {
    return c.json({ error: 'forbidden' }, 403);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = CreateRepBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  // Resolución del admin dueño: sales_admin → su propio sub; integra_admin → del body.
  const salesAdminId =
    callerRole === 'sales_admin' ? c.get('userId') : parsed.data.salesAdminId;
  if (!salesAdminId) {
    return c.json(
      { error: 'invalid_body', hint: 'integra_admin must pass salesAdminId' },
      400
    );
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
    salesAdminId,
  });

  return c.json(
    {
      rep: {
        userId: user.userId,
        email: user.email,
        salesAdminId: user.salesAdminId,
      },
      tempPassword, // mostrar UNA vez; el admin lo entrega al rep por canal seguro
    },
    201
  );
});

// ============================================================================
// GET /admin/sales/reps — lista de reps según rol
// ============================================================================

sales.get('/reps', async (c) => {
  const callerRole = c.get('userRole');
  const callerId = c.get('userId');
  const adminIdFilter = c.req.query('adminId');

  if (callerRole === 'sales_rep') {
    return c.json({ error: 'forbidden' }, 403);
  }

  let reps: User[];
  if (callerRole === 'sales_admin') {
    reps = await listSalesRepsByAdmin(callerId);
  } else {
    // integra_admin
    const all = await listIntegraUsers();
    reps = all.filter((u) => u.role === 'sales_rep');
    if (adminIdFilter) reps = reps.filter((u) => u.salesAdminId === adminIdFilter);
  }

  return c.json({
    reps: reps.map((r) => ({
      userId: r.userId,
      email: r.email,
      salesAdminId: r.salesAdminId,
      createdAt: r.createdAt,
      lastLoginAt: r.lastLoginAt,
    })),
  });
});

// ============================================================================
// GET /admin/sales/reps/:repId — detalle de un rep
// ============================================================================

sales.get('/reps/:repId', async (c) => {
  const callerRole = c.get('userRole');
  const callerId = c.get('userId');
  const repId = c.req.param('repId');

  if (callerRole === 'sales_rep') {
    return c.json({ error: 'forbidden' }, 403);
  }

  const rep = await getUser(INTEGRA_TENANT_ID, repId);
  if (!rep || rep.role !== 'sales_rep') {
    return c.json({ error: 'rep_not_found' }, 404);
  }

  // sales_admin solo ve a sus reps; 404 para no filtrar existencia
  if (callerRole === 'sales_admin' && rep.salesAdminId !== callerId) {
    return c.json({ error: 'rep_not_found' }, 404);
  }

  return c.json({
    userId: rep.userId,
    email: rep.email,
    salesAdminId: rep.salesAdminId,
    createdAt: rep.createdAt,
    lastLoginAt: rep.lastLoginAt,
  });
});

// ============================================================================
// GET /admin/sales/merchants — merchants visibles según rol
// ============================================================================

sales.get('/merchants', async (c) => {
  const callerRole = c.get('userRole');
  const callerId = c.get('userId');
  const repIdFilter = c.req.query('repId');
  const adminIdFilter = c.req.query('adminId');

  if (callerRole === 'sales_rep') {
    const merchants = await listMerchantsByRep(callerId);
    return c.json({ merchants });
  }

  if (callerRole === 'sales_admin') {
    const reps = await listSalesRepsByAdmin(callerId);
    const repIds = new Set(reps.map((r) => r.userId));
    if (repIdFilter && !repIds.has(repIdFilter)) {
      return c.json({ merchants: [] });
    }
    const merchantsLists = await Promise.all(
      [...(repIdFilter ? [repIdFilter] : repIds)].map((id) => listMerchantsByRep(id))
    );
    return c.json({ merchants: merchantsLists.flat() });
  }

  // integra_admin: opcionales adminId + repId filters
  if (repIdFilter) {
    const merchants = await listMerchantsByRep(repIdFilter);
    return c.json({ merchants });
  }
  if (adminIdFilter) {
    const reps = await listSalesRepsByAdmin(adminIdFilter);
    const merchantsLists = await Promise.all(reps.map((r) => listMerchantsByRep(r.userId)));
    return c.json({ merchants: merchantsLists.flat() });
  }

  // Sin filtros: todos los merchants asignados (cada rep) — agregamos por unión.
  const allUsers = await listIntegraUsers();
  const allReps = allUsers.filter((u) => u.role === 'sales_rep');
  const allMerchants = await Promise.all(allReps.map((r) => listMerchantsByRep(r.userId)));
  return c.json({ merchants: allMerchants.flat() });
});

// ============================================================================
// POST /admin/sales/merchants/:merchantId/assign — reasignar
// ============================================================================

const AssignBody = z.object({
  salesRepId: z.string().nullable(),
});

sales.post('/merchants/:merchantId/assign', async (c) => {
  const callerRole = c.get('userRole');
  const callerId = c.get('userId');
  const merchantTenantId = c.req.param('merchantId'); // por convención el merchantId es el tenantId

  if (callerRole === 'sales_rep') return c.json({ error: 'forbidden' }, 403);

  const body = await c.req.json().catch(() => null);
  const parsed = AssignBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  // sales_admin solo puede asignar a reps de su sub-fuerza
  if (callerRole === 'sales_admin' && parsed.data.salesRepId !== null) {
    const reps = await listSalesRepsByAdmin(callerId);
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
// KPIs (ticket 03)
// ============================================================================

function parseWindow(q: string | undefined): Window {
  if (q === '7d' || q === '30d' || q === '90d' || q === 'all') return q;
  return '30d';
}

/** GET /admin/sales/kpis/reps — KPIs por rep visibles al caller. */
sales.get('/kpis/reps', async (c) => {
  const callerRole = c.get('userRole');
  const callerId = c.get('userId');
  if (callerRole === 'sales_rep') return c.json({ error: 'forbidden' }, 403);

  const window = parseWindow(c.req.query('window'));
  const adminIdFilter = c.req.query('adminId');

  let reps: User[];
  if (callerRole === 'sales_admin') {
    reps = await listSalesRepsByAdmin(callerId);
  } else {
    const all = await listIntegraUsers();
    reps = all.filter((u) => u.role === 'sales_rep');
    if (adminIdFilter) reps = reps.filter((u) => u.salesAdminId === adminIdFilter);
  }

  const kpis = await Promise.all(
    reps.map((r) => computeRepKpi({ userId: r.userId, email: r.email }, window))
  );
  return c.json({ window, reps: kpis });
});

/** GET /admin/sales/kpis/admins — totales por sales_admin (integra_admin only). */
sales.get('/kpis/admins', async (c) => {
  const callerRole = c.get('userRole');
  if (callerRole !== 'integra_admin') return c.json({ error: 'forbidden' }, 403);

  const admins = await listAllSalesAdmins();
  const kpis = await Promise.all(admins.map((a) => computeAdminKpi(a)));
  return c.json({ admins: kpis });
});

/** GET /admin/sales/kpis/me — KPI personal del caller (rep o admin). */
sales.get('/kpis/me', async (c) => {
  const callerRole = c.get('userRole');
  const callerId = c.get('userId');
  const callerEmail = c.get('userEmail');

  if (callerRole === 'sales_rep') {
    const window = parseWindow(c.req.query('window'));
    const kpi = await computeRepKpi({ userId: callerId, email: callerEmail }, window);
    return c.json(kpi);
  }
  if (callerRole === 'sales_admin') {
    const kpi = await computeAdminKpi({ userId: callerId, email: callerEmail });
    return c.json(kpi);
  }
  return c.json({ error: 'no_kpis_for_role', role: callerRole }, 400);
});

// ============================================================================
// POST /admin/sales/merchants — alta de comercio asignado al rep (ticket 05)
// ============================================================================

const CreateMerchantBody = z.object({
  merchantName: z.string().min(2).max(120),
  industry: Industry,
  ownerEmail: z.string().email(),
  // Solo para sales_admin/integra_admin: a qué rep asignar. Si no se pasa,
  // el merchant queda sin atribución. Para sales_rep se ignora y se usa su sub.
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

  // Resolución del rep dueño
  let assignedRepId: string | null = null;
  if (callerRole === 'sales_rep') {
    assignedRepId = callerId;
  } else if (parsed.data.salesRepId) {
    // sales_admin solo puede asignar a reps de su sub-fuerza
    if (callerRole === 'sales_admin') {
      const reps = await listSalesRepsByAdmin(callerId);
      if (!reps.some((r) => r.userId === parsed.data.salesRepId)) {
        return c.json({ error: 'rep_not_in_your_team' }, 403);
      }
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

  // Asignar rep
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

/** GET /admin/sales/kpis/merchants/:repId — desglose por merchant del rep. */
sales.get('/kpis/merchants/:repId', async (c) => {
  const callerRole = c.get('userRole');
  const callerId = c.get('userId');
  const repId = c.req.param('repId');

  if (callerRole === 'sales_rep' && repId !== callerId) {
    return c.json({ error: 'forbidden' }, 403);
  }
  if (callerRole === 'sales_admin') {
    const reps = await listSalesRepsByAdmin(callerId);
    if (!reps.some((r) => r.userId === repId)) {
      return c.json({ error: 'rep_not_found' }, 404);
    }
  }

  const merchants = await computeMerchantsKpisForRep(repId);
  return c.json({ repId, merchants });
});
