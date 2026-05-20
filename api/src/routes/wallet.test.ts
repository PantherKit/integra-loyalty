import { describe, it, expect, beforeAll } from 'vitest';
import { wallet } from './wallet';

/**
 * El router debe responder 401 ANTES de tocar DB cuando falta el header
 * `Authorization: ApplePass <token>` (o está mal formado). isAuthorized()
 * corta antes de cualquier query, así que no se necesitan mocks de DDB.
 */
beforeAll(() => {
  process.env.PASS_AUTH_SECRET = 'test-pass-auth-secret';
});

describe('wallet router — auth ApplePass', () => {
  it('GET /passes/:passType/:serial responde 401 sin header Authorization', async () => {
    const res = await wallet.request('/passes/pass.ai.integragroup.lealtad/card-1');
    expect(res.status).toBe(401);
  });

  it('POST /devices/.../registrations/.../:serial responde 401 sin header', async () => {
    const res = await wallet.request(
      '/devices/dev-1/registrations/pass.ai.integragroup.lealtad/card-1',
      { method: 'POST', body: JSON.stringify({ pushToken: 'x' }) }
    );
    expect(res.status).toBe(401);
  });

  it('responde 401 con header mal formado (no ApplePass)', async () => {
    const res = await wallet.request('/passes/pass.ai.integragroup.lealtad/card-1', {
      headers: { Authorization: 'Bearer abc' },
    });
    expect(res.status).toBe(401);
  });

  it('POST /log responde 200 sin auth', async () => {
    const res = await wallet.request('/log', {
      method: 'POST',
      body: JSON.stringify({ logs: ['hello'] }),
    });
    expect(res.status).toBe(200);
  });
});
