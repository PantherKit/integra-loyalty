/**
 * Tipos compartidos del módulo de recomendaciones del dashboard del merchant.
 * Reutilizados por la route GET /dashboard/recommendations y por el front
 * (web/components/dashboard/RecommendationCard.tsx, ahí redeclarados a mano
 * porque web no compila contra api/ — mantenerlos en sync).
 */

export const SIGNAL_TYPES = ['churn_at_risk', 'slow_day', 'stale_redemption'] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

export const CTA_KINDS = ['navigate', 'whatsapp', 'dismiss'] as const;
export type CtaKind = (typeof CTA_KINDS)[number];

export const KPI_IDS = [
  'clientes_activos',
  'sellos_otorgados',
  'premios_canjeados',
  'programa_activo',
] as const;
export type KpiId = (typeof KPI_IDS)[number];

export interface Recommendation {
  id: string;
  signal_type: SignalType;
  copy: string;
  cta_label: string;
  cta_kind: CtaKind;
  cta_target?: string;
  evidence?: Record<string, unknown>;
}

export interface KpiExplanation {
  kpi_id: KpiId;
  text: string;
}

export interface RecommendationsPayload {
  recommendations: Recommendation[];
  kpi_explanations: KpiExplanation[];
}

/**
 * Signal interno producido por los detectores antes de ir al LLM. No se
 * expone al cliente — sólo viaja entre detectors.ts → llm.ts → orchestrator.
 */
export interface Signal {
  signal_type: SignalType;
  /** Datos de evidencia que el LLM usa para redactar el copy y que devolvemos al cliente. */
  evidence: Record<string, unknown>;
  /** Acción sugerida: define cta_label, cta_kind y cta_target del card final. */
  suggested_cta: {
    label: string;
    kind: CtaKind;
    target?: string;
  };
}
