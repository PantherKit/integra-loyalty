/**
 * Orquestador del módulo de recomendaciones.
 *
 * Flujo por request:
 *  1. Lee las últimas 20 transactions del merchant + sus programs + customers.
 *  2. Calcula un hash sobre las 20 tx (transactionId + stampsAfter).
 *  3. HIT de cache si hay entry con expiresAt en el futuro Y mismo txHash.
 *     MISS si TTL expiró o la data cambió → recomputa.
 *  4. Corre detectores (puros) → array de signals.
 *  5. UNA llamada a Claude con todos los signals (o fallback si no hay llave).
 *  6. Cap a 3 cards, ordena (churn_at_risk primero por urgencia), guarda en cache.
 *
 * NO toca DDB para programs/customers si la lista de transacciones es vacía
 * (corto-circuita y devuelve payload vacío inmediatamente).
 */

import { createHash } from 'node:crypto';
import { listRecentTransactions } from '../repositories/transaction';
import { listProgramsByTenant } from '../repositories/program';
import type { Transaction, LoyaltyProgram, Customer } from '../entities';
import { detectAll } from './detectors';
import { generateRecommendations } from './llm';
import type { RecommendationsPayload, Recommendation, Signal } from './types';

const TTL_MS = 60 * 60 * 1000; // 1h
const TX_WINDOW = 20;
const MAX_RECOMMENDATIONS = 3;

interface CacheEntry {
  expiresAt: number;
  payload: RecommendationsPayload;
  txHash: string;
}

const cache = new Map<string, CacheEntry>();

/** Sólo para tests — vacía el cache global. */
export function __clearRecommendationsCache() {
  cache.clear();
}

function hashTransactions(txs: Transaction[]): string {
  const h = createHash('sha1');
  for (const tx of txs) {
    h.update(tx.transactionId);
    h.update(':');
    h.update(String(tx.stampsAfter));
    h.update(';');
  }
  return h.digest('hex');
}

/**
 * Prioridad para ordenar las cards en UI cuando hay más de 1.
 * churn_at_risk pesa más porque es la única que pide acción inmediata
 * sobre un cliente concreto.
 */
const SIGNAL_PRIORITY: Record<Signal['signal_type'], number> = {
  churn_at_risk: 3,
  stale_redemption: 2,
  slow_day: 1,
};

function sortAndCap(recs: Recommendation[]): Recommendation[] {
  return [...recs]
    .sort((a, b) => SIGNAL_PRIORITY[b.signal_type] - SIGNAL_PRIORITY[a.signal_type])
    .slice(0, MAX_RECOMMENDATIONS);
}

export interface DataFetcher {
  transactions: (tenantId: string) => Promise<Transaction[]>;
  programs: (tenantId: string) => Promise<LoyaltyProgram[]>;
  customers?: (tenantId: string) => Promise<Customer[]>;
}

const defaultFetcher: DataFetcher = {
  transactions: (tid) => listRecentTransactions(tid, TX_WINDOW),
  programs: (tid) => listProgramsByTenant(tid),
  // No tenemos repo "list all customers"; los datos de customer.firstName son
  // opcionales en los detectores (degradan a "cliente"), así que evitamos un
  // scan costoso aquí. Se puede inyectar en el futuro si se materializa.
};

export async function computeRecommendations(
  merchantId: string,
  opts: { fetcher?: DataFetcher; now?: number; fresh?: boolean } = {}
): Promise<RecommendationsPayload> {
  const fetcher = opts.fetcher ?? defaultFetcher;
  const now = opts.now ?? Date.now();

  const transactions = await fetcher.transactions(merchantId);
  const txHash = hashTransactions(transactions);

  if (!opts.fresh) {
    const hit = cache.get(merchantId);
    if (hit && hit.expiresAt > now && hit.txHash === txHash) {
      return hit.payload;
    }
  }

  if (transactions.length === 0) {
    const empty: RecommendationsPayload = { recommendations: [], kpi_explanations: [] };
    cache.set(merchantId, { expiresAt: now + TTL_MS, payload: empty, txHash });
    return empty;
  }

  const [programs, customers] = await Promise.all([
    fetcher.programs(merchantId),
    fetcher.customers ? fetcher.customers(merchantId) : Promise.resolve<Customer[]>([]),
  ]);

  const signals = detectAll({ transactions, programs, customers, now });
  if (signals.length === 0) {
    const empty: RecommendationsPayload = { recommendations: [], kpi_explanations: [] };
    cache.set(merchantId, { expiresAt: now + TTL_MS, payload: empty, txHash });
    return empty;
  }

  const llmOut = await generateRecommendations(signals);
  const payload: RecommendationsPayload = {
    recommendations: sortAndCap(llmOut.recommendations),
    kpi_explanations: llmOut.kpi_explanations,
  };

  cache.set(merchantId, { expiresAt: now + TTL_MS, payload, txHash });
  return payload;
}

export type { RecommendationsPayload } from './types';
