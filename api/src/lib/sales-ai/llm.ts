/**
 * Wrapper LLM para Sales-AI. Su único trabajo es redactar la `reason` en
 * español natural (≤140 chars) dado el signal + contexto del merchant.
 * NO calcula score ni toma decisiones — eso es rules.ts.
 *
 * Modelo objetivo: Claude Haiku 4.5 vía Bedrock (us-east-1).
 *
 * Hoy esta implementación NO llama a Bedrock — devuelve directamente el
 * FALLBACK_REASONS para evitar requerir IAM/Bedrock habilitado en este
 * ticket. Cuando se conecte real:
 *   - Agregar permission bedrock:InvokeModel al Lambda execution role (CDK)
 *   - Cargar @aws-sdk/client-bedrock-runtime
 *   - Implementar generateReason() vía InvokeModelCommand con prompt cached
 *
 * Configurable por env SALES_AI_LLM_ENABLED=true para activar (sin él,
 * fallback determinista — ideal para tests y deploys iniciales).
 */

import { FALLBACK_REASONS, Signal } from './rules';
import { Merchant } from '../entities';

export interface ReasonInput {
  signal: Signal;
  merchant: Pick<Merchant, 'name' | 'industry'>;
  cardsCount: number;
  cardsLast30d: number;
}

const ENABLED = process.env.SALES_AI_LLM_ENABLED === 'true';

export async function generateReason(input: ReasonInput): Promise<string> {
  if (!ENABLED) {
    return FALLBACK_REASONS[input.signal];
  }
  try {
    // TODO(bedrock): implementar invocación real. Por ahora siempre fallback
    // — el endpoint funciona; el upgrade es transparente cuando se habilite.
    return FALLBACK_REASONS[input.signal];
  } catch {
    return FALLBACK_REASONS[input.signal];
  }
}
