#!/usr/bin/env bash
# pnpm dev:up — un solo comando para tener todo local corriendo.
# Orden: docker DDB Local → wait → create table → seed → api + web en paralelo.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "==> 1/5 docker compose up -d (DynamoDB Local)"
docker compose up -d

echo "==> 2/5 esperando a DynamoDB Local en :8000"
for i in {1..30}; do
  # DDB Local devuelve 400 a GET / by design — eso significa "vivo"
  code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8000 2>/dev/null || echo "000")
  if [ "$code" = "400" ]; then
    echo "    listo en ${i} intento(s)"
    break
  fi
  sleep 0.5
done

echo "==> 3/5 creando tabla (idempotente)"
( cd api && npx tsx scripts/dev/create-table.ts )

echo "==> 4/5 seed de users (super_admin + sales_admin)"
( cd api && npx tsx scripts/dev/seed.ts )

echo "==> 5/5 levantando api (:3002) + web (:3001) en paralelo"
echo ""
echo "----------------------------------------------------------------------"
echo "  todo arriba. abre:"
echo "    http://localhost:3001/dev   ← elige rol y entra"
echo ""
echo "  users disponibles:"
echo "    · super_admin@integra.local  (role=integra_admin)"
echo "    · sales_admin@integra.local  (role=sales_admin)"
echo ""
echo "  para parar todo: Ctrl+C  +  'pnpm dev:down'"
echo "----------------------------------------------------------------------"
echo ""

# concurrently maneja Ctrl+C limpio en ambos procesos.
# Las env vars del api se setean inline porque algunos módulos (aws-jwt-verify)
# corren validación al import — los process.env=... dentro del local.ts llegan
# tarde por el hoisting de ESM imports.
exec npx concurrently \
  --names "api,web" \
  --prefix-colors "blue,green" \
  --kill-others \
  "cd api && ENV=dev ALLOW_HEADER_AUTH=true TABLE_NAME=integra-loyalty-dev DDB_ENDPOINT=http://localhost:8000 AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local AWS_REGION=us-east-1 COGNITO_USER_POOL_ID=us-east-1_localdummy COGNITO_CLIENT_ID=localdummyclient npx tsx src/local.ts" \
  "cd web && NEXT_PUBLIC_API_URL=http://localhost:3002 pnpm dev"
