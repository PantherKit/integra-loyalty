import { Hono } from 'hono';
import { z } from 'zod';
import { getMerchantBySlug } from '../lib/repositories/merchant';
import { listProgramsByTenant } from '../lib/repositories/program';
import { createCustomer, findCustomerByPhoneInTenant } from '../lib/repositories/customer';
import { createCard } from '../lib/repositories/card';
import { SignupCustomerInput } from '../lib/entities';

// Endpoints públicos (sin auth) — landing del merchant + customer signup
export const publicRoutes = new Hono();

// GET /m/:slug — info pública del comercio + programa activo
publicRoutes.get('/m/:slug', async (c) => {
  const slug = c.req.param('slug').toLowerCase();
  const merchant = await getMerchantBySlug(slug);
  if (!merchant) return c.json({ error: 'merchant_not_found' }, 404);

  const programs = await listProgramsByTenant(merchant.tenantId);
  const activeProgram = programs.find((p) => p.status === 'active');

  return c.json({
    merchant: {
      slug: merchant.slug,
      name: merchant.name,
      industry: merchant.industry,
      brandColor: merchant.brandColor,
      logoUrl: merchant.logoUrl,
    },
    program: activeProgram
      ? {
          programId: activeProgram.programId,
          name: activeProgram.name,
          description: activeProgram.description,
          stampsRequired: activeProgram.stampsRequired,
          rewardDetail: activeProgram.rewardDetail,
        }
      : null,
  });
});

const SignupBody = SignupCustomerInput.extend({ programId: z.string().uuid().optional() });

// POST /m/:slug/customers — customer hace signup en el programa del comercio
// Idempotent: si phone ya está en este tenant, retorna la card existente.
publicRoutes.post('/m/:slug/customers', async (c) => {
  const slug = c.req.param('slug').toLowerCase();
  const body = await c.req.json().catch(() => null);
  const parsed = SignupBody.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);

  const merchant = await getMerchantBySlug(slug);
  if (!merchant) return c.json({ error: 'merchant_not_found' }, 404);

  const programs = await listProgramsByTenant(merchant.tenantId);
  const targetProgram =
    (parsed.data.programId && programs.find((p) => p.programId === parsed.data.programId)) ??
    programs.find((p) => p.status === 'active');
  if (!targetProgram) return c.json({ error: 'no_active_program', hint: 'el comercio aún no configuró un programa' }, 409);

  // Idempotent: customer existente
  let customer = await findCustomerByPhoneInTenant(merchant.tenantId, parsed.data.phone);
  if (!customer) {
    customer = await createCustomer({
      tenantId: merchant.tenantId,
      phone: parsed.data.phone,
      firstName: parsed.data.firstName,
      email: parsed.data.email,
    });
  }

  // Por ahora cada signup crea una card nueva (no chequea existencia previa por simplicidad de Slice 2A).
  // TODO Slice 2B+: idempotency por (customerId, programId).
  const card = await createCard({
    tenantId: merchant.tenantId,
    programId: targetProgram.programId,
    customerId: customer.customerId,
    customerPhone: customer.phone,
  });

  return c.json({ customer, card, program: targetProgram }, 201);
});

// (GET /cards/:id se movió a routes/cards.ts para convivir con stamp/redeem)
