/**
 * Detectores deterministas que escanean transactions y producen señales
 * candidatas para el panel "Acciones recomendadas hoy".
 *
 * Funciones puras: reciben la data como parámetros, no leen secretos ni
 * llaman a DynamoDB. El orquestador (index.ts) es quien hace I/O y se las
 * pasa. Nunca lanzan — si la data es insuficiente devuelven [].
 */

import type { Transaction, Customer, LoyaltyProgram } from '../entities';
import type { Signal, SignalType } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Agrupa transacciones (que vienen ordenadas DESC) por customerId.
 * Mantiene el orden DESC dentro de cada grupo.
 */
function groupByCustomer(txs: Transaction[]): Map<string, Transaction[]> {
  const m = new Map<string, Transaction[]>();
  for (const tx of txs) {
    const arr = m.get(tx.customerId);
    if (arr) arr.push(tx);
    else m.set(tx.customerId, [tx]);
  }
  return m;
}

function isoToMs(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/**
 * churn_at_risk — clientes que solían venir >= 1 vez por semana y llevan
 * más de 2.5x su intervalo medio sin volver.
 *
 * Necesita >= 3 visitas históricas (stamps) para calcular un intervalo medio
 * confiable y que el intervalo medio sea <= 7 días (≈ "1+ por semana").
 *
 * Devuelve UNA sola señal — el cliente más a riesgo del lote — para no
 * inundar el panel (cap final 0–3 lo aplica el orquestador).
 */
export function churnAtRisk(input: {
  transactions: Transaction[];
  customers?: Customer[];
  now?: number;
}): Signal[] {
  const now = input.now ?? Date.now();
  const grouped = groupByCustomer(input.transactions.filter((t) => t.kind === 'stamp'));
  if (grouped.size === 0) return [];

  const customersById = new Map<string, Customer>();
  for (const c of input.customers ?? []) customersById.set(c.customerId, c);

  let best: { customerId: string; phone: string; firstName?: string; gapDays: number; intervalDays: number } | null = null;

  for (const [customerId, txs] of grouped) {
    if (txs.length < 3) continue;
    // txs viene DESC por createdAt
    const timestamps = txs.map((t) => isoToMs(t.createdAt));
    const lastVisit = timestamps[0];
    if (!lastVisit) continue;

    // Intervalo medio entre visitas consecutivas (días)
    let totalGap = 0;
    let gapCount = 0;
    for (let i = 0; i < timestamps.length - 1; i++) {
      totalGap += timestamps[i] - timestamps[i + 1];
      gapCount += 1;
    }
    if (gapCount === 0) continue;
    const meanIntervalMs = totalGap / gapCount;
    const meanIntervalDays = meanIntervalMs / DAY_MS;
    if (meanIntervalDays > 7) continue; // no era cliente "semanal"

    const sinceLastMs = now - lastVisit;
    if (sinceLastMs <= meanIntervalMs * 2.5) continue;

    const gapDays = Math.floor(sinceLastMs / DAY_MS);
    if (!best || gapDays > best.gapDays) {
      const cust = customersById.get(customerId);
      best = {
        customerId,
        phone: txs[0].customerPhone,
        firstName: cust?.firstName,
        gapDays,
        intervalDays: Math.max(1, Math.round(meanIntervalDays)),
      };
    }
  }

  if (!best) return [];

  // WhatsApp wa.me requiere número sin '+'; el frontend abre wa.me/<phone>?text=...
  const phoneForWa = best.phone.replace(/^\+/, '');
  const greet = best.firstName ? best.firstName : 'cliente';
  const text = encodeURIComponent(
    `Hola ${greet}, te extrañamos en el programa de lealtad — ¡tenemos un sello esperándote!`
  );
  return [
    {
      signal_type: 'churn_at_risk',
      evidence: {
        customerPhone: best.phone,
        firstName: best.firstName,
        gapDays: best.gapDays,
        intervalDays: best.intervalDays,
      },
      suggested_cta: {
        label: 'Mandar WhatsApp',
        kind: 'whatsapp',
        target: `https://wa.me/${phoneForWa}?text=${text}`,
      },
    },
  ];
}

/**
 * slow_day — día de la semana con volumen promedio < 60% del promedio global,
 * calculado sobre al menos 4 semanas de data (>= 28 días entre la tx más
 * vieja y la más nueva). Devuelve a lo más una señal (el día más débil).
 */
export function slowDay(input: { transactions: Transaction[]; now?: number }): Signal[] {
  const now = input.now ?? Date.now();
  const stamps = input.transactions.filter((t) => t.kind === 'stamp');
  if (stamps.length === 0) return [];

  const oldest = isoToMs(stamps[stamps.length - 1].createdAt);
  if (!oldest) return [];
  const spanDays = (now - oldest) / DAY_MS;
  if (spanDays < 28) return [];

  // Cuenta por día de la semana (0=domingo..6=sábado)
  const byDow: number[] = [0, 0, 0, 0, 0, 0, 0];
  for (const tx of stamps) {
    const t = isoToMs(tx.createdAt);
    if (!t) continue;
    byDow[new Date(t).getDay()] += 1;
  }
  const total = byDow.reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  const avg = total / 7;
  if (avg < 1) return []; // muestra muy chica

  let worstDow = -1;
  let worstCount = Infinity;
  for (let d = 0; d < 7; d++) {
    if (byDow[d] < worstCount) {
      worstCount = byDow[d];
      worstDow = d;
    }
  }
  if (worstDow < 0) return [];
  if (worstCount >= avg * 0.6) return []; // no es lento de verdad

  const NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const pct = Math.round((worstCount / avg) * 100);
  return [
    {
      signal_type: 'slow_day',
      evidence: {
        dayOfWeek: worstDow,
        dayName: NAMES[worstDow],
        stampsOnDay: worstCount,
        weeklyAverage: Math.round(avg * 10) / 10,
        percentOfAverage: pct,
      },
      suggested_cta: {
        label: 'Compartir programa',
        kind: 'navigate',
        target: '/dashboard/share/',
      },
    },
  ];
}

/**
 * stale_redemption — clientes con tarjeta completa (stamps >= meta del
 * programa) cuyo último stamp fue hace > 14 días sin redeem posterior.
 * Devuelve UNA señal (el caso más viejo) para no saturar.
 */
export function staleRedemption(input: {
  transactions: Transaction[];
  programs?: LoyaltyProgram[];
  customers?: Customer[];
  now?: number;
}): Signal[] {
  const now = input.now ?? Date.now();
  if (input.transactions.length === 0) return [];

  // Threshold de sellos por programa: usa el programa real o un default razonable.
  const programThreshold = new Map<string, number>();
  for (const p of input.programs ?? []) programThreshold.set(p.programId, p.stampsRequired);

  const customersById = new Map<string, Customer>();
  for (const c of input.customers ?? []) customersById.set(c.customerId, c);

  // Recorremos por cardId: vienen DESC, así que la primera tx que veamos
  // para una card es la más reciente.
  type Latest = { tx: Transaction; threshold: number };
  const latestByCard = new Map<string, Latest>();
  for (const tx of input.transactions) {
    if (latestByCard.has(tx.cardId)) continue;
    const threshold = programThreshold.get(tx.programId) ?? 7;
    latestByCard.set(tx.cardId, { tx, threshold });
  }

  let best: { phone: string; firstName?: string; daysStale: number; stamps: number } | null = null;

  for (const { tx, threshold } of latestByCard.values()) {
    // La tarjeta está completa si el último estado es stamp y los stamps
    // post-tx alcanzan el threshold; si la última tx fue un redeem, no.
    if (tx.kind !== 'stamp') continue;
    if (tx.stampsAfter < threshold) continue;
    const ageDays = (now - isoToMs(tx.createdAt)) / DAY_MS;
    if (ageDays <= 14) continue;
    if (!best || ageDays > best.daysStale) {
      const cust = customersById.get(tx.customerId);
      best = {
        phone: tx.customerPhone,
        firstName: cust?.firstName,
        daysStale: Math.floor(ageDays),
        stamps: tx.stampsAfter,
      };
    }
  }

  if (!best) return [];
  return [
    {
      signal_type: 'stale_redemption',
      evidence: {
        customerPhone: best.phone,
        firstName: best.firstName,
        daysStale: best.daysStale,
        stamps: best.stamps,
      },
      suggested_cta: {
        label: 'Ir a canjear',
        kind: 'navigate',
        target: '/dashboard/give-stamp/',
      },
    },
  ];
}

/**
 * Corre los 3 detectores y devuelve la lista combinada de signals.
 */
export function detectAll(input: {
  transactions: Transaction[];
  programs?: LoyaltyProgram[];
  customers?: Customer[];
  now?: number;
}): Signal[] {
  return [
    ...churnAtRisk(input),
    ...slowDay(input),
    ...staleRedemption(input),
  ];
}

/** Lista de signal_types soportados — para validación / iteración. */
export const ALL_SIGNAL_TYPES: SignalType[] = ['churn_at_risk', 'slow_day', 'stale_redemption'];
