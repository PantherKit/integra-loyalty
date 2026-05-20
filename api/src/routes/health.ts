import { Hono } from 'hono';

export const health = new Hono();

health.get('/', (c) =>
  c.json({
    status: 'ok',
    env: process.env.ENV ?? 'unknown',
    timestamp: new Date().toISOString(),
  })
);
