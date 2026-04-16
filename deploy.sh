#!/usr/bin/env bash
set -euo pipefail

# ── cajú deploy script ────────────────────────────────────────────────────────
# Uso: ./deploy.sh [--prod] [--preview]
# Requiere: Vercel CLI instalado (npm i -g vercel)

MODE="${1:---preview}"
PROJECT_NAME="caju"

echo ""
echo "⚡ cajú deploy"
echo "──────────────"

# 1. Type check
echo "→ type check..."
npm run type-check

# 2. Build local para verificar antes de pushear
echo "→ build..."
npm run build

# 3. Deploy a Vercel
if [[ "$MODE" == "--prod" ]]; then
  echo "→ deploying to PRODUCTION..."
  vercel deploy --prod --name "$PROJECT_NAME"
else
  echo "→ deploying preview..."
  vercel deploy --name "$PROJECT_NAME"
fi

echo ""
echo "✓ deploy completo"
