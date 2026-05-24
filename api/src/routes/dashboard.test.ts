import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests del router /dashboard. Inyectamos un fake de requireTenant y
 * mockeamos el orchestrator para probar el contrato del endpoint sin
 * volver a ejercitar detectores/LLM (eso lo cubren los tests del módulo).
 */

const ctx = { tenantId: 'tenant-1', role: 'owner' };

vi.mock('../middleware/tenant', async () => {
  const actual = await vi.importActual<typeof import('../middleware/tenant')>(
    '../middleware/tenant'
  );
  return {
    ...actual,
    requireTenant: async (c: any, next: any) => {
      if (!ctx.tenantId) {
        return c.json({ error: 'unauthorized' }, 401);
      }
      c.set('tenantId', ctx.tenantId);
      c.set('userId', 'u-1');
      c.set('userEmail', 'u@local');
      c.set('userRole', ctx.role);
      await next();
    },
  };
});

const recsMock = vi.fn();
vi.mock('../lib/recommendations', () => ({
  computeRecommendations: recsMock,
}));

beforeEach(() => {
  recsMock.mockReset();
  ctx.tenantId = 'tenant-1';
  ctx.role = 'owner';
});

async function loadApp() {
  const mod = await import('./dashboard');
  return mod.dashboard;
}

describe('GET /dashboard/recommendations', () => {
  it('devuelve el payload del orquestador en el shape esperado', async () => {
    recsMock.mockResolvedValueOnce({
      recommendations: [
        {
          id: 's1',
          signal_type: 'stale_redemption',
          copy: 'Tienes una tarjeta completa esperando canje.',
          cta_label: 'Ir a canjear',
          cta_kind: 'navigate',
          cta_target: '/dashboard/give-stamp/',
          evidence: { daysStale: 20 },
        },
      ],
      kpi_explanations: [
        { kpi_id: 'premios_canjeados', text: 'Premios entregados a clientes.' },
      ],
    });

    const app = await loadApp();
    const res = await app.request('/recommendations');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.recommendations).toHaveLength(1);
    expect(body.recommendations[0].signal_type).toBe('stale_redemption');
    expect(body.kpi_explanations[0].kpi_id).toBe('premios_canjeados');
    expect(recsMock).toHaveBeenCalledWith('tenant-1');
  });

  it('devuelve payload vacío sin lanzar si el orquestador lanza', async () => {
    recsMock.mockRejectedValueOnce(new Error('boom'));
    const app = await loadApp();
    const res = await app.request('/recommendations');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body).toEqual({ recommendations: [], kpi_explanations: [] });
  });

  it('responde 401 cuando no hay tenant en el contexto', async () => {
    ctx.tenantId = '';
    const app = await loadApp();
    const res = await app.request('/recommendations');
    expect(res.status).toBe(401);
  });
});
