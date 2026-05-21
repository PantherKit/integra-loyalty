/**
 * Reglas deterministas que clasifican cada merchant en una "señal" y le
 * asignan un score. El LLM (sales-ai/llm.ts) solo redacta la `reason` en
 * español natural — no toca el score ni la clasificación.
 *
 * Score 0-100. Convención:
 *  - 80-100: urgente, atender hoy
 *  - 60-79: prioritario esta semana
 *  - 40-59: seguimiento normal
 *  - 0-39: estable, no necesita acción
 *
 * Documentado para QA / debugging — modificar aquí cambia el ranking.
 */

import { Merchant, Tenant } from '../entities';

export type Signal =
  | 'churn_risk'
  | 'upsell_opportunity'
  | 'dormant'
  | 'new_lead_followup';

export interface MerchantContext {
  merchant: Merchant;
  tenant: Tenant | null;
  cardsCount: number;
  cardsLast30d: number;
}

export interface Classification {
  signal: Signal | null;
  score: number;
  factors: string[]; // claves humanas para debugging / explicabilidad
}

const DAY_MS = 24 * 60 * 60 * 1000;

function ageDays(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
}

export function classify(ctx: MerchantContext): Classification {
  const { merchant, tenant, cardsCount, cardsLast30d } = ctx;
  const factors: string[] = [];

  // Regla 1 — churn risk explícito: suscripción past_due o canceled.
  if (tenant?.subscriptionStatus === 'past_due') {
    factors.push('subscription_past_due');
    return { signal: 'churn_risk', score: 95, factors };
  }
  if (tenant?.subscriptionStatus === 'canceled') {
    factors.push('subscription_canceled');
    return { signal: 'churn_risk', score: 85, factors };
  }

  // Regla 2 — dormant: comercio sin actualizaciones en 14+ días y sin actividad reciente.
  const merchantAge = ageDays(merchant.updatedAt);
  if (merchantAge > 14 && cardsLast30d === 0) {
    factors.push(`stale_${merchantAge}d`);
    factors.push('no_recent_cards');
    const score = Math.min(80, 50 + Math.floor(merchantAge / 2));
    return { signal: 'dormant', score, factors };
  }

  // Regla 3 — new lead followup: comercio recién creado pero aún en trial.
  if (
    tenant?.subscriptionStatus === 'trialing' &&
    merchantAge < 7 &&
    cardsCount === 0
  ) {
    factors.push('fresh_trial_no_cards');
    return { signal: 'new_lead_followup', score: 70, factors };
  }

  // Regla 4 — upsell opportunity: comercio activo con tracción y plan básico.
  if (
    tenant?.subscriptionStatus === 'active' &&
    tenant.billingPlan === 'basico' &&
    cardsLast30d >= 20
  ) {
    factors.push('high_volume_basic_plan');
    return { signal: 'upsell_opportunity', score: 75, factors };
  }

  // Regla 5 — bajo riesgo: nada que hacer.
  factors.push('healthy_no_action');
  return { signal: null, score: 0, factors };
}

/** Texto canned por signal, usado si el LLM falla o no está habilitado. */
export const FALLBACK_REASONS: Record<Signal, string> = {
  churn_risk: 'Su suscripción está en riesgo — contactar para recuperar el pago.',
  upsell_opportunity:
    'Está emitiendo muchas tarjetas con plan básico — ofrecer upgrade a Pro.',
  dormant: 'Sin actividad reciente — verificar que sigue operando el programa.',
  new_lead_followup: 'Recién registrado en trial — acompañar primeros pasos.',
};
