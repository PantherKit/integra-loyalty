import { describe, it, expect, beforeAll } from 'vitest';
import { createHmac } from 'node:crypto';
import { passAuthToken } from './applePass';

/**
 * Tests del token de autenticación del PassKit Web Service.
 * Forzamos PASS_AUTH_SECRET para no depender de la carga de certs.
 */
const SECRET = 'test-pass-auth-secret';

beforeAll(() => {
  process.env.PASS_AUTH_SECRET = SECRET;
});

describe('passAuthToken', () => {
  it('es determinístico para el mismo cardId', async () => {
    const a = await passAuthToken('card-aaa');
    const b = await passAuthToken('card-aaa');
    expect(a).toBe(b);
  });

  it('coincide con HMAC-SHA256(secret, cardId) en hex', async () => {
    const expected = createHmac('sha256', SECRET).update('card-xyz').digest('hex');
    expect(await passAuthToken('card-xyz')).toBe(expected);
  });

  it('es distinto por cardId', async () => {
    const a = await passAuthToken('card-1');
    const b = await passAuthToken('card-2');
    expect(a).not.toBe(b);
  });

  it('devuelve hex de 64 chars (sha256)', async () => {
    const t = await passAuthToken('any');
    expect(t).toMatch(/^[0-9a-f]{64}$/);
  });
});
