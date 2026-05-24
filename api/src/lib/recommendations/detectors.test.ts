import { describe, it, expect } from 'vitest';
import { churnAtRisk, slowDay, staleRedemption, detectAll } from './detectors';
import type { Transaction, Customer, LoyaltyProgram } from '../entities';

const DAY = 24 * 60 * 60 * 1000;

/** Helper para construir una Transaction con defaults razonables. */
function tx(over: Partial<Transaction> & { createdAt: string }): Transaction {
  return {
    type: 'TRANSACTION',
    tenantId: 't-1',
    transactionId: over.transactionId ?? Math.random().toString(36).slice(2),
    kind: 'stamp',
    cardId: over.cardId ?? 'card-A',
    customerId: over.customerId ?? 'cust-A',
    customerPhone: over.customerPhone ?? '+5215555555555',
    programId: over.programId ?? 'prog-1',
    programName: 'Test',
    amount: 1,
    stampsBefore: 0,
    stampsAfter: over.stampsAfter ?? 1,
    performedByUserId: 'u-1',
    ...over,
  };
}

describe('churnAtRisk', () => {
  it('detecta cliente semanal que lleva > 2.5x sin volver', () => {
    const now = Date.parse('2026-05-01T12:00:00Z');
    // 4 visitas espaciadas ~7 días, última hace 25 días
    const transactions = [
      tx({ createdAt: new Date(now - 25 * DAY).toISOString(), stampsAfter: 4 }),
      tx({ createdAt: new Date(now - 32 * DAY).toISOString(), stampsAfter: 3 }),
      tx({ createdAt: new Date(now - 39 * DAY).toISOString(), stampsAfter: 2 }),
      tx({ createdAt: new Date(now - 46 * DAY).toISOString(), stampsAfter: 1 }),
    ];
    const customers: Customer[] = [
      {
        type: 'CUSTOMER',
        tenantId: 't-1',
        customerId: 'cust-A',
        phone: '+5215555555555',
        firstName: 'Ana',
        createdAt: new Date(now - 60 * DAY).toISOString(),
        updatedAt: new Date(now - 25 * DAY).toISOString(),
      },
    ];
    const sigs = churnAtRisk({ transactions, customers, now });
    expect(sigs).toHaveLength(1);
    expect(sigs[0].signal_type).toBe('churn_at_risk');
    expect(sigs[0].evidence.firstName).toBe('Ana');
    expect(sigs[0].suggested_cta.kind).toBe('whatsapp');
    expect(sigs[0].suggested_cta.target).toMatch(/^https:\/\/wa\.me\/5215555555555/);
  });

  it('no dispara con < 3 visitas (data insuficiente)', () => {
    const now = Date.parse('2026-05-01T12:00:00Z');
    const transactions = [
      tx({ createdAt: new Date(now - 25 * DAY).toISOString() }),
      tx({ createdAt: new Date(now - 32 * DAY).toISOString() }),
    ];
    expect(churnAtRisk({ transactions, now })).toEqual([]);
  });

  it('no dispara con cliente nuevo (intervalo medio > 7 días)', () => {
    const now = Date.parse('2026-05-01T12:00:00Z');
    const transactions = [
      tx({ createdAt: new Date(now - 5 * DAY).toISOString() }),
      tx({ createdAt: new Date(now - 25 * DAY).toISOString() }),
      tx({ createdAt: new Date(now - 50 * DAY).toISOString() }),
    ];
    expect(churnAtRisk({ transactions, now })).toEqual([]);
  });

  it('no dispara con cliente que volvió recientemente', () => {
    const now = Date.parse('2026-05-01T12:00:00Z');
    const transactions = [
      tx({ createdAt: new Date(now - 1 * DAY).toISOString() }),
      tx({ createdAt: new Date(now - 8 * DAY).toISOString() }),
      tx({ createdAt: new Date(now - 15 * DAY).toISOString() }),
    ];
    expect(churnAtRisk({ transactions, now })).toEqual([]);
  });
});

describe('slowDay', () => {
  it('detecta día con < 60% del promedio sobre >= 4 semanas', () => {
    // Construimos 35 días: el día con dow local 0 (domingo) queda con 0 stamps,
    // los demás con 3. Usamos getDay() para alinear con el detector (que también
    // usa la TZ local del runtime). Test es TZ-agnóstico — chequea que se
    // detectó al menos un slow_day, no cuál.
    const now = Date.parse('2026-05-01T12:00:00Z');
    const transactions: Transaction[] = [];
    for (let d = 0; d < 35; d++) {
      const date = new Date(now - d * DAY);
      const dow = date.getDay();
      const stamps = dow === 0 ? 0 : 3; // domingo (local) vacío
      for (let i = 0; i < stamps; i++) {
        transactions.push(
          tx({
            transactionId: `tx-${d}-${i}`,
            createdAt: date.toISOString(),
          })
        );
      }
    }
    transactions.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const sigs = slowDay({ transactions, now });
    expect(sigs).toHaveLength(1);
    expect(sigs[0].signal_type).toBe('slow_day');
    expect(sigs[0].evidence.dayOfWeek).toBe(0);
    expect(sigs[0].suggested_cta.kind).toBe('navigate');
    expect(sigs[0].suggested_cta.target).toBe('/dashboard/share/');
  });

  it('no dispara con < 28 días de data (insuficiente)', () => {
    const now = Date.parse('2026-05-01T12:00:00Z');
    const transactions = [
      tx({ createdAt: new Date(now - 1 * DAY).toISOString() }),
      tx({ createdAt: new Date(now - 10 * DAY).toISOString() }),
    ];
    expect(slowDay({ transactions, now })).toEqual([]);
  });

  it('no dispara cuando los días son parejos', () => {
    const now = Date.parse('2026-05-01T12:00:00Z');
    const transactions: Transaction[] = [];
    for (let d = 0; d < 35; d++) {
      const date = new Date(now - d * DAY);
      for (let i = 0; i < 3; i++) {
        transactions.push(tx({ transactionId: `tx-${d}-${i}`, createdAt: date.toISOString() }));
      }
    }
    transactions.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    expect(slowDay({ transactions, now })).toEqual([]);
  });
});

describe('staleRedemption', () => {
  it('detecta tarjeta completa hace > 14 días sin redeem', () => {
    const now = Date.parse('2026-05-01T12:00:00Z');
    const programs: LoyaltyProgram[] = [
      {
        type: 'PROGRAM',
        tenantId: 't-1',
        programId: 'prog-1',
        name: 'Café gratis',
        stampsRequired: 7,
        rewardType: 'free_item',
        rewardDetail: 'Café',
        status: 'active',
        createdAt: new Date(now - 90 * DAY).toISOString(),
        updatedAt: new Date(now - 90 * DAY).toISOString(),
      },
    ];
    const transactions = [
      tx({
        createdAt: new Date(now - 20 * DAY).toISOString(),
        cardId: 'card-A',
        stampsAfter: 7,
        kind: 'stamp',
      }),
    ];
    const sigs = staleRedemption({ transactions, programs, now });
    expect(sigs).toHaveLength(1);
    expect(sigs[0].signal_type).toBe('stale_redemption');
    expect(sigs[0].evidence.daysStale).toBeGreaterThanOrEqual(20);
    expect(sigs[0].suggested_cta.kind).toBe('navigate');
    expect(sigs[0].suggested_cta.target).toBe('/dashboard/give-stamp/');
  });

  it('no dispara si el último movimiento fue redeem (ya canjeó)', () => {
    const now = Date.parse('2026-05-01T12:00:00Z');
    const transactions = [
      tx({
        createdAt: new Date(now - 20 * DAY).toISOString(),
        cardId: 'card-A',
        stampsAfter: 0,
        kind: 'redeem',
      }),
      tx({
        createdAt: new Date(now - 21 * DAY).toISOString(),
        cardId: 'card-A',
        stampsAfter: 7,
        kind: 'stamp',
      }),
    ];
    expect(staleRedemption({ transactions, now })).toEqual([]);
  });

  it('no dispara con tarjeta incompleta', () => {
    const now = Date.parse('2026-05-01T12:00:00Z');
    const transactions = [
      tx({
        createdAt: new Date(now - 20 * DAY).toISOString(),
        cardId: 'card-A',
        stampsAfter: 3,
        kind: 'stamp',
      }),
    ];
    expect(staleRedemption({ transactions, now })).toEqual([]);
  });

  it('no dispara con tarjeta completa hace < 14 días', () => {
    const now = Date.parse('2026-05-01T12:00:00Z');
    const transactions = [
      tx({
        createdAt: new Date(now - 5 * DAY).toISOString(),
        cardId: 'card-A',
        stampsAfter: 7,
        kind: 'stamp',
      }),
    ];
    expect(staleRedemption({ transactions, now })).toEqual([]);
  });

  it('devuelve [] con array vacío sin lanzar', () => {
    expect(staleRedemption({ transactions: [], now: Date.now() })).toEqual([]);
  });
});

describe('detectAll', () => {
  it('combina las 3 fuentes y nunca lanza con data vacía', () => {
    expect(detectAll({ transactions: [] })).toEqual([]);
  });
});
