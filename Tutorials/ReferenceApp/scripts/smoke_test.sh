#!/usr/bin/env bash
# =============================================================================
# Citrate Reference dApp — E2E Smoke Test
#
# Deploys the ModelNFT contract to a running devnet, mints 3 test models,
# and verifies on-chain state using cast.
#
# Prerequisites:
#   - Citrate devnet running on localhost:8545
#   - Foundry installed (forge, cast)
#
# Usage:
#   bash scripts/smoke_test.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$SCRIPT_DIR/../contracts"
RPC_URL="${RPC_URL:-http://localhost:8545}"
PRIVATE_KEY="${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
MINT_FEE="0.01ether"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}PASS${NC} $1"; }
fail() { echo -e "${RED}FAIL${NC} $1"; exit 1; }
info() { echo -e "${YELLOW}INFO${NC} $1"; }

echo "============================================"
echo " Citrate Model NFT — Smoke Test"
echo "============================================"
echo ""

# ── Step 1: Check RPC connectivity ──────────────────────────────────────────
info "Checking RPC connectivity at $RPC_URL ..."
BLOCK_NUM=$(cast block-number --rpc-url "$RPC_URL" 2>/dev/null) || fail "Cannot connect to RPC at $RPC_URL. Is devnet running?"
pass "Connected to devnet (block $BLOCK_NUM)"

# ── Step 2: Build contracts ─────────────────────────────────────────────────
info "Building contracts..."
cd "$CONTRACTS_DIR"
forge build --quiet || fail "forge build failed"
pass "Contracts compiled"

# ── Step 3: Deploy via Foundry script ───────────────────────────────────────
info "Deploying ModelNFT..."
DEPLOY_OUTPUT=$(forge script script/Deploy.s.sol \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast 2>&1) || fail "Deployment failed"

# Extract contract address from output
CONTRACT=$(echo "$DEPLOY_OUTPUT" | grep -oE '0x[0-9a-fA-F]{40}' | head -1)
if [ -z "$CONTRACT" ]; then
  fail "Could not extract contract address from deployment output"
fi
pass "Deployed at $CONTRACT"

# ── Step 4: Verify initial state ────────────────────────────────────────────
info "Verifying initial state..."
SUPPLY=$(cast call "$CONTRACT" "totalSupply()" --rpc-url "$RPC_URL" | cast to-dec 2>/dev/null)
[ "$SUPPLY" = "0" ] && pass "Initial totalSupply = 0" || fail "Expected totalSupply 0, got $SUPPLY"

FEE=$(cast call "$CONTRACT" "mintFee()" --rpc-url "$RPC_URL" | cast to-dec 2>/dev/null)
pass "Mint fee = $FEE wei"

# ── Step 5: Mint 3 test models ──────────────────────────────────────────────
info "Minting model 1: ResNet-50 (PyTorch)..."
HASH1="0x$(echo -n 'resnet50-smoke-test' | shasum -a 256 | cut -d' ' -f1)"
TX1=$(cast send "$CONTRACT" \
  "mintModel(string,string,string,bytes32,uint256)" \
  "ResNet-50" "PyTorch" "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG" \
  "$HASH1" 104857600 \
  --value "$MINT_FEE" \
  --private-key "$PRIVATE_KEY" \
  --rpc-url "$RPC_URL" 2>&1) || fail "Mint 1 failed"
pass "Minted model 1"

info "Minting model 2: BERT-Base (ONNX)..."
HASH2="0x$(echo -n 'bert-base-smoke-test' | shasum -a 256 | cut -d' ' -f1)"
TX2=$(cast send "$CONTRACT" \
  "mintModel(string,string,string,bytes32,uint256)" \
  "BERT-Base" "ONNX" "QmPZ9gcCEpqKTo6aq61g2nXGUhM4iCL3ewB6LDXZCtioEB" \
  "$HASH2" 440401920 \
  --value "$MINT_FEE" \
  --private-key "$PRIVATE_KEY" \
  --rpc-url "$RPC_URL" 2>&1) || fail "Mint 2 failed"
pass "Minted model 2"

info "Minting model 3: Whisper-Small (CoreML)..."
HASH3="0x$(echo -n 'whisper-small-smoke-test' | shasum -a 256 | cut -d' ' -f1)"
TX3=$(cast send "$CONTRACT" \
  "mintModel(string,string,string,bytes32,uint256)" \
  "Whisper-Small" "CoreML" "QmRf22bZar3WKmojipms22PkXH1MZGmvsqzQtuSvQE3uhm" \
  "$HASH3" 967000000 \
  --value "$MINT_FEE" \
  --private-key "$PRIVATE_KEY" \
  --rpc-url "$RPC_URL" 2>&1) || fail "Mint 3 failed"
pass "Minted model 3"

# ── Step 6: Verify final state ──────────────────────────────────────────────
info "Verifying on-chain state..."

SUPPLY=$(cast call "$CONTRACT" "totalSupply()" --rpc-url "$RPC_URL" | cast to-dec 2>/dev/null)
[ "$SUPPLY" = "3" ] && pass "totalSupply = 3" || fail "Expected totalSupply 3, got $SUPPLY"

# Verify token URI is non-empty
URI=$(cast call "$CONTRACT" "tokenURI(uint256)" 1 --rpc-url "$RPC_URL" 2>/dev/null)
[ -n "$URI" ] && pass "tokenURI(1) returns data" || fail "tokenURI(1) is empty"

# Verify model info round-trip
MODEL_INFO=$(cast call "$CONTRACT" "getModelInfo(uint256)" 1 --rpc-url "$RPC_URL" 2>/dev/null)
[ -n "$MODEL_INFO" ] && pass "getModelInfo(1) returns data" || fail "getModelInfo(1) is empty"

echo ""
echo "============================================"
echo -e " ${GREEN}All smoke tests passed${NC}"
echo "============================================"
echo ""
echo "Contract: $CONTRACT"
echo "Models minted: 3"
echo "Network: $RPC_URL"
