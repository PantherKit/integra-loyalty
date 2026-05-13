import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { health } from './routes/health';
import { merchants } from './routes/merchants';

const app = new Hono();

app.get('/', (c) => c.json({ name: 'integra-loyalty-api', env: process.env.ENV ?? 'unknown' }));

app.route('/health', health);
app.route('/merchants', merchants);

app.notFound((c) => c.json({ error: 'not_found', path: c.req.path }, 404));
app.onError((err, c) => {
  console.error('unhandled', err);
  return c.json({ error: 'internal_error', message: err.message }, 500);
});

export const handler = handle(app);
