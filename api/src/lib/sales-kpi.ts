/**
 * Cómputo de KPIs de la fuerza de ventas. Funciones puras / agregadoras que
 * combinan los repositorios existentes. Las heurísticas son deterministas;
 * la priorización con LLM vive en ticket-06 (sales-ai/).
 */

import { countCardsByTenant } from './repositories/card';
import { listMerchantsByRep } from './repositories/merchant';
import { listSalesRepsByAdmin, listIntegraUsers } from './repositories/user';
import { getTenant } from './repositories/tenant';
import { Merchant } from './entities';

export type Window = '7d' | '30d' | '90d' | 'all';

export function windowToSinceIso(window: Window): string | undefined {
  if (window === 'all') return undefined;
  const days = window === '7d' ? 7 : window === '30d' ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** Tabulador de planes de pago en MXN/mes (docs/pricing.md). */
const PLAN_MRR_MXN: Record<string, number> = {
  basico: 349,
  pro: 649,
  multi: 1190,
};

export interface RepKpi {
  repId: string;
  repEmail: string;
  merchantsCount: number;
  cardsIssuedCount: number;
  cardsActiveCount: number;
  mrrMxn: number;
  churnRiskCount: number;
}

export interface AdminKpi {
  adminId: string;
  adminEmail: string;
  repsCount: number;
  merchantsCount: number;
  cardsIssuedCount: number;
  mrrMxn: number;
}

export interface MerchantKpi {
  merchantId: string;
  name: string;
  status: string;
  subscriptionStatus?: string;
  cardsCount: number;
  mrrMxn: number;
  lastActivityAt: string | null;
}

/**
 * Heurística determinista de churn risk (ticket-03 — base; ticket-06 refina con IA).
 *
 * Hoy: subscription.past_due, canceled, o sin updates en 14 días.
 */
export async function classifyChurnRisk(merchant: Merchant): Promise<boolean> {
  const tenant = await getTenant(merchant.tenantId);
  if (!tenant) return false;
  if (tenant.subscriptionStatus === 'past_due' || tenant.subscriptionStatus === 'canceled') {
    return true;
  }
  const fourteenDaysAgoMs = Date.now() - 14 * 24 * 60 * 60 * 1000;
  return new Date(merchant.updatedAt).getTime() < fourteenDaysAgoMs;
}

export async function computeRepKpi(
  rep: { userId: string; email: string },
  window: Window = '30d'
): Promise<RepKpi> {
  const sinceIso = windowToSinceIso(window);
  const merchants = await listMerchantsByRep(rep.userId);

  let cardsIssued = 0;
  let cardsActive = 0;
  let mrr = 0;
  let churn = 0;

  const fourteenDaysAgoMs = Date.now() - 14 * 24 * 60 * 60 * 1000;

  for (const m of merchants) {
    cardsIssued += await countCardsByTenant(m.tenantId, { sinceIso });
    cardsActive += await countCardsByTenant(m.tenantId, { activeOnly: true });
    const tenant = await getTenant(m.tenantId);
    if (tenant?.subscriptionStatus === 'active' && tenant.billingPlan) {
      mrr += PLAN_MRR_MXN[tenant.billingPlan] ?? 0;
    }
    const past = tenant?.subscriptionStatus === 'past_due' || tenant?.subscriptionStatus === 'canceled';
    const stale = new Date(m.updatedAt).getTime() < fourteenDaysAgoMs;
    if (past || stale) churn += 1;
  }

  return {
    repId: rep.userId,
    repEmail: rep.email,
    merchantsCount: merchants.length,
    cardsIssuedCount: cardsIssued,
    cardsActiveCount: cardsActive,
    mrrMxn: mrr,
    churnRiskCount: churn,
  };
}

export async function computeAdminKpi(admin: {
  userId: string;
  email: string;
}): Promise<AdminKpi> {
  const reps = await listSalesRepsByAdmin(admin.userId);
  const repKpis = await Promise.all(reps.map((r) => computeRepKpi(r, 'all')));
  return {
    adminId: admin.userId,
    adminEmail: admin.email,
    repsCount: reps.length,
    merchantsCount: repKpis.reduce((s, k) => s + k.merchantsCount, 0),
    cardsIssuedCount: repKpis.reduce((s, k) => s + k.cardsIssuedCount, 0),
    mrrMxn: repKpis.reduce((s, k) => s + k.mrrMxn, 0),
  };
}

export async function listAllSalesAdmins(): Promise<{ userId: string; email: string }[]> {
  const all = await listIntegraUsers();
  return all
    .filter((u) => u.role === 'sales_admin')
    .map((u) => ({ userId: u.userId, email: u.email }));
}

export async function computeMerchantsKpisForRep(repId: string): Promise<MerchantKpi[]> {
  const merchants = await listMerchantsByRep(repId);
  const out: MerchantKpi[] = [];
  for (const m of merchants) {
    const tenant = await getTenant(m.tenantId);
    const cardsCount = await countCardsByTenant(m.tenantId);
    const mrr =
      tenant?.subscriptionStatus === 'active' && tenant.billingPlan
        ? PLAN_MRR_MXN[tenant.billingPlan] ?? 0
        : 0;
    out.push({
      merchantId: m.tenantId,
      name: m.name,
      status: 'active',
      subscriptionStatus: tenant?.subscriptionStatus,
      cardsCount,
      mrrMxn: mrr,
      lastActivityAt: m.updatedAt,
    });
  }
  return out;
}
