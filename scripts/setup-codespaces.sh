#!/usr/bin/env bash
# scripts/setup-codespaces.sh
# Run this once after opening the project in GitHub Codespaces.
# Usage: bash scripts/setup-codespaces.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "🚀 CodeForge — Codespaces Setup"
echo "================================"
echo ""

# ── 1. Set env vars for Codespaces ──────────────────────────────────
echo "📝 Configuring environment..."
# Switch to real Redis and real Docker judge
sed -i 's/^REDIS_MOCK=true/REDIS_MOCK=false/' .env
sed -i 's/^JUDGE_MOCK=true/JUDGE_MOCK=false/' .env
echo -e "${GREEN}  ✅ REDIS_MOCK=false, JUDGE_MOCK=false${NC}"

# ── 2. Start Redis ───────────────────────────────────────────────────
echo ""
echo "🔴 Starting Redis..."
if command -v redis-server &> /dev/null; then
  redis-server --daemonize yes --appendonly yes --loglevel warning
  sleep 1
  if redis-cli ping | grep -q PONG; then
    echo -e "${GREEN}  ✅ Redis is running on port 6379${NC}"
  else
    echo -e "${RED}  ❌ Redis failed to start${NC}"
  fi
else
  echo -e "${YELLOW}  ⚠️  redis-server not found. Install via: sudo apt-get install -y redis-server${NC}"
fi

# ── 3. Pull judge Docker images ──────────────────────────────────────
echo ""
echo "🐳 Pulling judge Docker images (this takes a few minutes)..."
if command -v docker &> /dev/null; then
  bash scripts/pull-judge-images.sh
else
  echo -e "${RED}  ❌ Docker not found. Make sure Docker-in-Docker is enabled.${NC}"
  exit 1
fi

# ── 4. Install dependencies ──────────────────────────────────────────
echo ""
echo "📦 Installing dependencies..."
npm install --prefix backend --silent
npm install --prefix frontend --silent
echo -e "${GREEN}  ✅ Dependencies installed${NC}"

# ── 5. Seed database ─────────────────────────────────────────────────
echo ""
echo "🌱 Seeding database..."
node scripts/seed.js && echo -e "${GREEN}  ✅ Database seeded${NC}" || echo -e "${YELLOW}  ⚠️  Seed skipped (may already be seeded)${NC}"

# ── Done ─────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════"
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Start backend:  cd backend && npm run dev"
echo "  2. Start frontend: cd frontend && npm run dev"
echo "  3. Open:           http://localhost:5173"
echo ""
echo "Admin login:  admin@codeforge.dev / Admin123"
echo "Judge mode:   🐳 Real Docker sandbox"
echo ""
