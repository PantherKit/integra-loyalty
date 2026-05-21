/**
 * Sales-AI orchestrator. Combina rules + LLM wording + cache para producir
 * la lista de prioridades del día por sales_rep.
 *
 * Cache: TTL 24h, key = repId. Implementación in-memory para esta primera
 * versión (TODO ticket de follow-up: persistir en DynamoDB para sobrevivir
 * a cold-starts del Lambda).
 */

import { countCardsByTenant } from '../repositories/card';
import { listMerchantsByRep } from '../repositories/merchant';
import { getTenant } from '../repositories/tenant';
import { classify, Signal } from './rules';
import { generateReason } from './llm';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  expiresAt: number;
  data: Priority[];
}

const cache = new Map<string, CacheEntry>();

export interface Priority {
  merchantId: string;
  name: string;
  score: number;
  signal: Signal;
  reason: string;
}

export async function computePriorities(
  repId: string,
  opts: { fresh?: boolean } = {}
): Promise<Priority[]> {
  if (!opts.fresh) {
    const hit = cache.get(repId);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.data;
    }
  }

  const merchants = await listMerchantsByRep(repId);
  const out: Priority[] = [];

  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  for (const merchant of merchants) {
    const tenant = await getTenant(merchant.tenantId);
    const [cardsCount, cardsLast30d] = await Promise.all([
      countCardsByTenant(merchant.tenantId),
      countCardsByTenant(merchant.tenantId, { sinceIso }),
    ]);
    const cls = classify({ merchant, tenant, cardsCount, cardsLast30d });
    if (cls.signal === null) continue;
    const reason = await generateReason({
      signal: cls.signal,
      merchant: { name: merchant.name, industry: merchant.industry },
      cardsCount,
      cardsLast30d,
    });
    out.push({
      merchantId: merchant.tenantId,
      name: merchant.name,
      score: cls.score,
      signal: cls.signal,
      reason,
    });
  }

  out.sort((a, b) => b.score - a.score);
  cache.set(repId, { expiresAt: Date.now() + CACHE_TTL_MS, data: out });
  return out;
}

/** Utilidad para tests — limpia el cache global. */
export function clearPrioritiesCache() {
  cache.clear();
}
