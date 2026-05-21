import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handle } from 'hono/aws-lambda';
import { health } from './routes/health';
import { merchants } from './routes/merchants';
import { auth } from './routes/auth';
import { programs } from './routes/programs';
import { publicRoutes } from './routes/public';
import { cards } from './routes/cards';
import { activity } from './routes/activity';
import { wallet } from './routes/wallet';
import { billing } from './routes/billing';
import { sales } from './routes/sales';

const app = new Hono();

app.use('*', cors({
  origin: '*', // TODO: en prod restringir a dominios known
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
}));

app.get('/', (c) => c.json({ name: 'integra-loyalty-api', env: process.env.ENV ?? 'unknown' }));

app.route('/health', health);
app.route('/auth', auth);
app.route('/merchants', merchants);
app.route('/programs', programs);
app.route('/cards', cards); // GET /cards/:id público; /lookup, /:id/stamp, /:id/redeem con auth
app.route('/activity', activity);
app.route('/billing', billing); // checkout/status (auth) + webhook (público, raw body)
app.route('/admin/sales', sales); // consola interna Sales Org (sales_admin / sales_rep / integra_admin)
app.route('/v1', wallet); // PassKit Web Service de Apple (Apple agrega /v1 a webServiceURL)
app.route('/', publicRoutes); // /m/:slug, /m/:slug/customers

app.notFound((c) => c.json({ error: 'not_found', path: c.req.path }, 404));
app.onError((err, c) => {
  console.error('unhandled', err);
  return c.json({ error: 'internal_error', message: err.message }, 500);
});

export const handler = handle(app);
