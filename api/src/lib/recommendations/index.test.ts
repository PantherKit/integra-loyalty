import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests del orchestrator. Mockeamos repos + secrets manager para evitar
 * cualquier llamada externa. El test (d) cubre el path "sin secreto":
 * el cliente Anthropic queda nulo y el endpoint devuelve copy de fallback.
 */

const sendMock = vi.fn();
vi.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: vi.fn().mockImplementation(() => ({ send: sendMock })),
  GetSecretValueCommand: vi.fn().mockImplementation((args) => ({ args })),
}));

const txRepo = { listRecentTransactions: vi.fn() };
const programRepo = { listProgramsByTenant: vi.fn() };
vi.mock('../repositories/transaction', () => txRepo);
vi.mock('../repositories/program', () => programRepo);

const DAY = 24 * 60 * 60 * 1000;

beforeEach(async () => {
  sendMock.mockReset();
  txRepo.listRecentTransactions.mockReset();
  programRepo.listProgramsByTenant.mockReset();
  const llmMod = await import('./llm');
  llmMod.__setAnthropicClientForTests(null);
  llmMod.__resetSecretCacheForTests();
  const orchMod = await import('./index');
  orchMod.__clearRecommendationsCache();
});

function buildStaleTransactions(now: number) {
  // Una tarjeta completa hace 20 días → dispara stale_redemption
  return [
    {
      type: 'TRANSACTION',
      tenantId: 't-1',
      transactionId: 'tx-1',
      kind: 'stamp',
      cardId: 'card-1',
      customerId: 'cust-1',
      customerPhone: '+5215555555555',
      programId: 'prog-1',
      programName: 'Café',
      amount: 1,
      stampsBefore: 6,
      stampsAfter: 7,
      performedByUserId: 'u-1',
      createdAt: new Date(now - 20 * DAY).toISOString(),
    },
  ];
}

describe('computeRecommendations — sin secreto Anthropic', () => {
  it('devuelve payload vacío cuando el secret no existe (modo no configurado)', async () => {
    sendMock.mockRejectedValue(new Error('ResourceNotFoundException'));
    const now = Date.parse('2026-05-01T12:00:00Z');
    const transactions = buildStaleTransactions(now);
    txRepo.listRecentTransactions.mockResolvedValueOnce(transactions);
    programRepo.listProgramsByTenant.mockResolvedValueOnce([
      { type: 'PROGRAM', programId: 'prog-1', stampsRequired: 7 } as any,
    ]);

    const { computeRecommendations } = await import('./index');
    const payload = await computeRecommendations('merchant-1', { now });

    // Sin llave Anthropic: ningún card, ninguna explicación KPI.
    expect(payload.recommendations).toEqual([]);
    expect(payload.kpi_explanations).toEqual([]);
  });

  it('payload vacío cuando no hay transactions', async () => {
    txRepo.listRecentTransactions.mockResolvedValueOnce([]);
    const { computeRecommendations } = await import('./index');
    const payload = await computeRecommendations('merchant-2', { now: Date.now() });
    expect(payload.recommendations).toEqual([]);
    expect(payload.kpi_explanations).toEqual([]);
    // No debió llamar a programs/customers
    expect(programRepo.listProgramsByTenant).not.toHaveBeenCalled();
  });
});

describe('computeRecommendations — con cliente Anthropic mock', () => {
  it('devuelve N <= 3 cards con shape válida cuando el LLM responde JSON correcto', async () => {
    const fakeCreate = vi.fn().mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            recommendations: [
              { id: 's1', copy: 'Tu cliente Ana lleva 25 días sin volver, mándale un saludo.' },
            ],
            kpi_explanations: [
              { kpi_id: 'clientes_activos', text: 'Clientes que pasaron por mostrador.' },
            ],
          }),
        },
      ],
    });
    const llmMod = await import('./llm');
    llmMod.__setAnthropicClientForTests({ createMessage: fakeCreate });

    const now = Date.parse('2026-05-01T12:00:00Z');
    const transactions = buildStaleTransactions(now);
    txRepo.listRecentTransactions.mockResolvedValueOnce(transactions);
    programRepo.listProgramsByTenant.mockResolvedValueOnce([
      { type: 'PROGRAM', programId: 'prog-1', stampsRequired: 7 } as any,
    ]);

    const { computeRecommendations } = await import('./index');
    const payload = await computeRecommendations('merchant-3', { now });

    expect(fakeCreate).toHaveBeenCalledTimes(1);
    expect(payload.recommendations.length).toBeGreaterThan(0);
    expect(payload.recommendations.length).toBeLessThanOrEqual(3);
    for (const r of payload.recommendations) {
      expect(r.id).toBeTruthy();
      expect(['churn_at_risk', 'slow_day', 'stale_redemption']).toContain(r.signal_type);
      expect(r.copy.length).toBeLessThanOrEqual(140);
      expect(r.copy.length).toBeGreaterThan(0);
      expect(['navigate', 'whatsapp', 'dismiss']).toContain(r.cta_kind);
    }
    expect(payload.kpi_explanations[0]).toEqual({
      kpi_id: 'clientes_activos',
      text: 'Clientes que pasaron por mostrador.',
    });
  });

  it('fail-closed con JSON inválido → fallback genérico por signal_type', async () => {
    const fakeCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'no soy json {{{ broken' }],
    });
    const llmMod = await import('./llm');
    llmMod.__setAnthropicClientForTests({ createMessage: fakeCreate });

    const now = Date.parse('2026-05-01T12:00:00Z');
    txRepo.listRecentTransactions.mockResolvedValueOnce(buildStaleTransactions(now));
    programRepo.listProgramsByTenant.mockResolvedValueOnce([
      { type: 'PROGRAM', programId: 'prog-1', stampsRequired: 7 } as any,
    ]);

    const { computeRecommendations } = await import('./index');
    const payload = await computeRecommendations('merchant-4', { now });

    expect(payload.recommendations.length).toBeGreaterThan(0);
    for (const r of payload.recommendations) {
      expect(r.copy.length).toBeGreaterThan(0);
      expect(r.copy.length).toBeLessThanOrEqual(140);
    }
  });

  it('cero llamadas a Claude si signals=[] (transactions vacías)', async () => {
    const fakeCreate = vi.fn();
    const llmMod = await import('./llm');
    llmMod.__setAnthropicClientForTests({ createMessage: fakeCreate });

    txRepo.listRecentTransactions.mockResolvedValueOnce([]);
    const { computeRecommendations } = await import('./index');
    await computeRecommendations('merchant-5', { now: Date.now() });
    expect(fakeCreate).not.toHaveBeenCalled();
  });
});

describe('cache TTL + txHash', () => {
  it('HIT cuando misma data dentro del TTL', async () => {
    const fakeCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: '{"recommendations":[]}' }],
    });
    const llmMod = await import('./llm');
    llmMod.__setAnthropicClientForTests({ createMessage: fakeCreate });

    const now = Date.parse('2026-05-01T12:00:00Z');
    txRepo.listRecentTransactions.mockResolvedValue(buildStaleTransactions(now));
    programRepo.listProgramsByTenant.mockResolvedValue([
      { type: 'PROGRAM', programId: 'prog-1', stampsRequired: 7 } as any,
    ]);

    const { computeRecommendations } = await import('./index');
    await computeRecommendations('merchant-6', { now });
    await computeRecommendations('merchant-6', { now: now + 1000 });
    // programs solo se llama 1 vez (segunda es HIT)
    expect(programRepo.listProgramsByTenant).toHaveBeenCalledTimes(1);
  });

  it('MISS cuando cambia la data (tx nueva → distinto hash)', async () => {
    const fakeCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: '{"recommendations":[]}' }],
    });
    const llmMod = await import('./llm');
    llmMod.__setAnthropicClientForTests({ createMessage: fakeCreate });

    const now = Date.parse('2026-05-01T12:00:00Z');
    const baseTx = buildStaleTransactions(now);
    txRepo.listRecentTransactions.mockResolvedValueOnce(baseTx);
    programRepo.listProgramsByTenant.mockResolvedValueOnce([
      { type: 'PROGRAM', programId: 'prog-1', stampsRequired: 7 } as any,
    ]);

    const { computeRecommendations } = await import('./index');
    await computeRecommendations('merchant-7', { now });

    // Segunda llamada con una tx adicional → distinto hash → MISS
    const extra = [
      ...baseTx,
      { ...baseTx[0], transactionId: 'tx-new', createdAt: new Date(now - 1 * DAY).toISOString() },
    ];
    txRepo.listRecentTransactions.mockResolvedValueOnce(extra);
    programRepo.listProgramsByTenant.mockResolvedValueOnce([
      { type: 'PROGRAM', programId: 'prog-1', stampsRequired: 7 } as any,
    ]);
    await computeRecommendations('merchant-7', { now: now + 1000 });
    expect(programRepo.listProgramsByTenant).toHaveBeenCalledTimes(2);
  });
});
