#!/usr/bin/env bash
# scripts/pull-judge-images.sh
# Pre-pull all judge Docker images in priority order.
# Run this once during deployment or after cloning on a new machine.
# Usage: bash scripts/pull-judge-images.sh

set -e

IMAGES=(
  "python:3.12-alpine"
  "node:20-alpine"
  "gcc:13.2"
  "eclipse-temurin:21-jdk-alpine"
  "golang:1.22-alpine"
  "rust:1.78-alpine"
)

echo "🐳 Pulling CodeForge judge images..."
echo ""

FAILED=()

for image in "${IMAGES[@]}"; do
  echo "→ Pulling $image..."
  if docker pull "$image" 2>&1; then
    echo "  ✅ $image"
  else
    echo "  ❌ Failed: $image"
    FAILED+=("$image")
  fi
  echo ""
done

echo "─────────────────────────────────"
if [ ${#FAILED[@]} -eq 0 ]; then
  echo "✅ All images pulled successfully"
else
  echo "⚠️  Failed images:"
  for img in "${FAILED[@]}"; do
    echo "   - $img"
  done
  exit 1
fi

echo ""
echo "Total disk usage:"
docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" \
  python:3.12-alpine node:20-alpine gcc:13.2 \
  eclipse-temurin:21-jdk-alpine golang:1.22-alpine rust:1.78-alpine 2>/dev/null || true
