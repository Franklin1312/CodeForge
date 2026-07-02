#!/usr/bin/env bash
# Generates RS256 keypair for JWT signing
# Run once: bash scripts/gen-keys.sh
# Then paste the output into your .env file

set -e

echo "🔑 Generating RS256 keypair for JWT..."

KEYS_DIR="./keys"
mkdir -p "$KEYS_DIR"

# Generate 2048-bit RSA private key
openssl genrsa -out "$KEYS_DIR/private.pem" 2048 2>/dev/null

# Extract public key
openssl rsa -in "$KEYS_DIR/private.pem" -pubout -out "$KEYS_DIR/public.pem" 2>/dev/null

echo ""
echo "✅ Keys generated in $KEYS_DIR/"
echo ""
echo "─── Add these to your .env file ────────────────────────"
echo ""
echo "JWT_PRIVATE_KEY=\"$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' "$KEYS_DIR/private.pem")\""
echo ""
echo "JWT_PUBLIC_KEY=\"$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' "$KEYS_DIR/public.pem")\""
echo ""
echo "⚠️  The keys/ directory is in .gitignore. Never commit PEM files."
