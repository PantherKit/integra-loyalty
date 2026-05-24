/**
 * Wrapper Claude para generar el copy final de las recomendaciones del
 * dashboard del merchant.
 *
 * Patrón: una sola llamada por request con TODOS los signals → array de
 * { id, copy }. Si no hay llave configurada, si el HTTP falla o si el JSON
 * devuelto no parsea, se hace fail-closed con copy genérico por signal_type
 * (NUNCA lanza, NUNCA bloquea el endpoint).
 *
 * Secreto: 'integra-loyalty/anthropic' (Secrets Manager, us-east-1) con la
 * shape { "ANTHROPIC_API_KEY": "sk-ant-..." }. Lectura lazy + cache
 * module-level — mismo patrón que stripe.ts / applePass.ts.
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { Recommendation, Signal, KpiExplanation, KpiId } from './types';

const SECRET_NAME = process.env.ANTHROPIC_SECRET_NAME || 'integra-loyalty/anthropic';
const SECRET_REGION = process.env.AWS_REGION || 'us-east-1';
const SECRET_KEY = 'ANTHROPIC_API_KEY';
export const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const MAX_COPY_LEN = 140;

let cachedApiKey: string | null | undefined; // undefined = no intentado, null = intentado y no hay
let cachedClient: AnthropicLike | null = null;

/**
 * Subset mínimo del SDK de Anthropic — lo definimos a mano para no añadir
 * la dependencia '@anthropic-ai/sdk' (no está instalada). En su lugar
 * hacemos fetch directo al endpoint REST de Anthropic.
 */
interface AnthropicLike {
  createMessage(req: {
    model: string;
    max_tokens: number;
    system: string;
    messages: Array<{ role: 'user'; content: string }>;
  }): Promise<{ content: Array<{ type: string; text?: string }> }>;
}

class FetchAnthropicClient implements AnthropicLike {
  constructor(private apiKey: string) {}
  async createMessage(req: {
    model: string;
    max_tokens: number;
    system: string;
    messages: Array<{ role: 'user'; content: string }>;
  }) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`anthropic_http_${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
    }
    return (await res.json()) as { content: Array<{ type: string; text?: string }> };
  }
}

/** Inyectable para tests. Si se setea, reemplaza el cliente HTTP real. */
let testClient: AnthropicLike | null = null;
export function __setAnthropicClientForTests(client: AnthropicLike | null) {
  testClient = client;
  cachedClient = null;
}
/** Resetea el cache de credenciales — sólo para tests. */
export function __resetSecretCacheForTests() {
  cachedApiKey = undefined;
  cachedClient = null;
}

async function loadApiKey(): Promise<string | null> {
  if (cachedApiKey !== undefined) return cachedApiKey;
  try {
    const client = new SecretsManagerClient({ region: SECRET_REGION });
    const res = await client.send(new GetSecretValueCommand({ SecretId: SECRET_NAME }));
    if (!res.SecretString) throw new Error('secret has no SecretString');
    const parsed = JSON.parse(res.SecretString) as Record<string, unknown>;
    const key = parsed[SECRET_KEY];
    if (typeof key !== 'string' || !key) throw new Error(`secret missing key: ${SECRET_KEY}`);
    cachedApiKey = key;
    return cachedApiKey;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    // Log sin exponer secreto. Mensaje no contiene la llave.
    console.warn('[recommendations] anthropic secret unavailable, running in disabled mode:', msg);
    cachedApiKey = null;
    return null;
  }
}

async function getClient(): Promise<AnthropicLike | null> {
  if (testClient) return testClient;
  if (cachedClient) return cachedClient;
  const key = await loadApiKey();
  if (!key) return null;
  cachedClient = new FetchAnthropicClient(key);
  return cachedClient;
}

/**
 * Indica si el wrapper tiene credenciales disponibles (post-resolución
 * lazy). Útil para que el orquestador sepa si tiene sentido seguir.
 */
export async function isLlmAvailable(): Promise<boolean> {
  const c = await getClient();
  return c !== null;
}

const FALLBACK_COPY: Record<Signal['signal_type'], string> = {
  churn_at_risk: 'Un cliente frecuente lleva semanas sin volver — un mensaje breve puede recuperarlo.',
  slow_day: 'Tienes un día con bajo movimiento — comparte el programa para activar tráfico ese día.',
  stale_redemption: 'Hay una tarjeta completa sin canjear hace días — invita al cliente a reclamar su premio.',
};

const FALLBACK_KPI_EXPLANATIONS: Record<KpiId, string> = {
  clientes_activos: 'Personas con actividad en tus últimas operaciones.',
  sellos_otorgados: 'Total de sellos entregados en las últimas operaciones.',
  premios_canjeados: 'Recompensas que ya entregaste a tus clientes.',
  programa_activo: 'Programa de lealtad publicado y operando.',
};

function truncateCopy(s: string): string {
  if (s.length <= MAX_COPY_LEN) return s;
  return s.slice(0, MAX_COPY_LEN - 1).trimEnd() + '…';
}

function buildPrompt(signals: Signal[]): { system: string; user: string } {
  const system =
    'Eres asistente de marketing para un comercio mexicano que usa Integra Loyalty. ' +
    'Recibes señales detectadas sobre su programa de lealtad y debes redactar UN copy ' +
    'corto en español (≤140 caracteres, tono cercano, sin emojis, sin signos de admiración ' +
    'al inicio) por cada señal. También puedes producir explicaciones de 1 línea para ' +
    'los KPIs cuando aporten contexto. Responde SIEMPRE con JSON válido, sin texto extra.';

  const signalList = signals
    .map(
      (s, i) =>
        `${i + 1}. signal_type=${s.signal_type} evidence=${JSON.stringify(s.evidence)}`
    )
    .join('\n');

  const user = [
    'Genera un copy por cada señal listada. Devuelve JSON exactamente con este shape:',
    '{ "recommendations": [{"id": "<id>", "copy": "<texto>"}], "kpi_explanations": [{"kpi_id":"clientes_activos|sellos_otorgados|premios_canjeados|programa_activo","text":"<texto>"}] }',
    'El campo id debe ser el mismo índice 1-based listado abajo prefijado con "s" (ej. "s1").',
    'kpi_explanations es opcional — incluye solo las que aporten contexto al merchant.',
    '',
    'Señales:',
    signalList,
  ].join('\n');

  return { system, user };
}

interface RawCopy {
  id?: unknown;
  copy?: unknown;
}
interface RawKpi {
  kpi_id?: unknown;
  text?: unknown;
}
interface RawResponse {
  recommendations?: RawCopy[];
  kpi_explanations?: RawKpi[];
}

const VALID_KPI_IDS: ReadonlySet<KpiId> = new Set<KpiId>([
  'clientes_activos',
  'sellos_otorgados',
  'premios_canjeados',
  'programa_activo',
]);

function parseModelOutput(text: string): RawResponse | null {
  try {
    // Defensa: a veces los modelos envuelven con ```json ... ```; recortamos.
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as RawResponse;
  } catch {
    return null;
  }
}

/**
 * Toma los signals + la respuesta cruda del modelo (puede ser null si
 * falló) y arma el array final de Recommendations con fallback por signal.
 */
function assembleRecommendations(
  signals: Signal[],
  raw: RawResponse | null
): Recommendation[] {
  const copyById = new Map<string, string>();
  if (raw && Array.isArray(raw.recommendations)) {
    for (const r of raw.recommendations) {
      if (typeof r?.id === 'string' && typeof r?.copy === 'string' && r.copy.trim().length > 0) {
        copyById.set(r.id, truncateCopy(r.copy.trim()));
      }
    }
  }

  return signals.map((sig, i) => {
    const id = `s${i + 1}`;
    const copy = copyById.get(id) ?? FALLBACK_COPY[sig.signal_type];
    return {
      id,
      signal_type: sig.signal_type,
      copy: truncateCopy(copy),
      cta_label: sig.suggested_cta.label,
      cta_kind: sig.suggested_cta.kind,
      cta_target: sig.suggested_cta.target,
      evidence: sig.evidence,
    };
  });
}

function assembleKpiExplanations(raw: RawResponse | null): KpiExplanation[] {
  if (!raw || !Array.isArray(raw.kpi_explanations)) return [];
  const out: KpiExplanation[] = [];
  const seen = new Set<KpiId>();
  for (const k of raw.kpi_explanations) {
    if (
      typeof k?.kpi_id === 'string' &&
      typeof k?.text === 'string' &&
      VALID_KPI_IDS.has(k.kpi_id as KpiId) &&
      !seen.has(k.kpi_id as KpiId)
    ) {
      seen.add(k.kpi_id as KpiId);
      out.push({ kpi_id: k.kpi_id as KpiId, text: truncateCopy(k.text.trim()) });
    }
  }
  return out;
}

/**
 * Llama a Claude (UNA vez) con todos los signals y construye el payload.
 *
 * Política fail-closed con dos modos distintos:
 *
 *  - **Sin llave (secret no configurado)** — modo "recomendaciones no
 *    configuradas": devolvemos `{ recommendations: [], kpi_explanations: [] }`
 *    para que el dashboard ESCONDA la sección. El comercio aún no contrató
 *    AI; mostrar copy canned se ve falso. (acceptance: "endpoint sin
 *    secreto devuelve payload vacío").
 *
 *  - **Con llave pero llamada falla / JSON inválido** — modo "fallback":
 *    devolvemos los signals detectados con copy canned por signal_type.
 *    Mejor mostrar algo coherente que tirar la página. (acceptance:
 *    "parser fail-closed con JSON inválido devuelve fallback").
 *
 * Si signals está vacío NO llama al modelo (cumple ack criteria).
 */
export async function generateRecommendations(
  signals: Signal[]
): Promise<{ recommendations: Recommendation[]; kpi_explanations: KpiExplanation[] }> {
  if (signals.length === 0) {
    return { recommendations: [], kpi_explanations: [] };
  }

  const client = await getClient();
  if (!client) {
    // Sin secreto = no configurado: vacío.
    return { recommendations: [], kpi_explanations: [] };
  }

  let raw: RawResponse | null = null;
  try {
    const { system, user } = buildPrompt(signals);
    const res = await client.createMessage({
      model: CLAUDE_MODEL,
      max_tokens: 600,
      system,
      messages: [{ role: 'user', content: user }],
    });
    const text = res.content?.find((b) => b.type === 'text')?.text ?? '';
    raw = parseModelOutput(text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.warn('[recommendations] anthropic call failed:', msg);
    raw = null;
  }

  return {
    recommendations: assembleRecommendations(signals, raw),
    kpi_explanations:
      assembleKpiExplanations(raw).length > 0
        ? assembleKpiExplanations(raw)
        : defaultKpiExplanationsFor(signals),
  };
}

/**
 * Cuando no hay LLM disponible (o no devolvió kpi_explanations), elegimos
 * 1–2 explicaciones canned ligadas al tipo de signal — no inventamos texto.
 * Si no hay signals, devolvemos array vacío (el dashboard no muestra nada).
 */
function defaultKpiExplanationsFor(signals: Signal[]): KpiExplanation[] {
  const out: KpiExplanation[] = [];
  const seen = new Set<KpiId>();
  for (const s of signals) {
    let kpi: KpiId | null = null;
    switch (s.signal_type) {
      case 'churn_at_risk':
        kpi = 'clientes_activos';
        break;
      case 'slow_day':
        kpi = 'sellos_otorgados';
        break;
      case 'stale_redemption':
        kpi = 'premios_canjeados';
        break;
    }
    if (kpi && !seen.has(kpi)) {
      seen.add(kpi);
      out.push({ kpi_id: kpi, text: FALLBACK_KPI_EXPLANATIONS[kpi] });
    }
  }
  return out;
}
