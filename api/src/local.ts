/**
 * Entry point para correr la API local con Node, apuntando a DDB Local.
 * NO se usa en producción (Lambda usa el handler en index.ts).
 *
 * Se activa ENV=dev + ALLOW_HEADER_AUTH=true, lo que permite que el middleware
 * `tenant` acepte headers x-tenant-id / x-user-id en vez de un JWT de Cognito.
 *
 * Uso: `pnpm dev:api` (desde api/) o `pnpm dev:up` (desde el root).
 */
process.env.ENV = process.env.ENV ?? "dev";
process.env.ALLOW_HEADER_AUTH = process.env.ALLOW_HEADER_AUTH ?? "true";
process.env.TABLE_NAME = process.env.TABLE_NAME ?? "integra-loyalty-dev";
process.env.AWS_REGION = process.env.AWS_REGION ?? "us-east-1";
// Apuntar el cliente de DDB a DynamoDB Local
process.env.DDB_ENDPOINT = process.env.DDB_ENDPOINT ?? "http://localhost:8000";
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID ?? "local";
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY ?? "local";
// Dummies para Cognito: aws-jwt-verify exige formato válido al construirse,
// aunque en modo dev local el verifier nunca se invoca (auth via headers).
process.env.COGNITO_USER_POOL_ID =
  process.env.COGNITO_USER_POOL_ID ?? "us-east-1_localdummy";
process.env.COGNITO_CLIENT_ID =
  process.env.COGNITO_CLIENT_ID ?? "localdummyclient";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { health } from "./routes/health";
import { merchants } from "./routes/merchants";
import { auth } from "./routes/auth";
import { programs } from "./routes/programs";
import { publicRoutes } from "./routes/public";
import { cards } from "./routes/cards";
import { activity } from "./routes/activity";
import { wallet } from "./routes/wallet";
import { billing } from "./routes/billing";
import { sales } from "./routes/sales";
import { dashboard } from "./routes/dashboard";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-tenant-id", "x-user-id"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

app.get("/", (c) =>
  c.json({ name: "integra-loyalty-api", env: process.env.ENV, mode: "local" })
);

app.route("/health", health);
app.route("/auth", auth);
app.route("/merchants", merchants);
app.route("/programs", programs);
app.route("/", publicRoutes);
app.route("/cards", cards);
app.route("/activity", activity);
app.route("/wallet", wallet);
app.route("/billing", billing);
app.route("/admin/sales", sales);
app.route("/dashboard", dashboard);

const port = Number(process.env.PORT ?? 3002);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`api local en http://localhost:${info.port}`);
  console.log(`  ENV=${process.env.ENV}  TABLE=${process.env.TABLE_NAME}`);
  console.log(`  DDB=${process.env.DDB_ENDPOINT}`);
  console.log(`  auth: header bypass activo (x-tenant-id + x-user-id)`);
});
