#!/usr/bin/env bash
# CC-0 tripwire (planset 2026-07-27-canonicalization-conversion, WS-1 / D-CC-2 / D-CC-3).
# Fails if a retired identity vendor (CLEAR / Sumsub) or the retired absolute executor
# throughput figure (773K tx/s) survives on a PUBLIC content surface.
#
# Scope: content/**/*.md sources (NOT _generated, which is derived) + gradient_papers_v3.
# Canonical identity language is "Citrate's in-house verification (VERI)". Canonical
# throughput is "5,000 TPS sustained, 10,000 ceiling"; the parallel executor result is
# expressed as a SPEEDUP (2.0-2.4x), never as an absolute scrapeable tx/s.
#
# Allowlist (tracked, not hidden):
#   - REGISTRY/** — internal rewrite-tracking registry, references vendors as canon history.
# (The former content/apps/district-registration.md exception was retired once CC-0b migrated
#  the app off CLEAR to in-house VERI; the page is now scanned like every other surface.)
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0

# 1) Retired identity vendors on public content (whole-word CLEAR, case-sensitive; + Sumsub)
vendor_hits=$(grep -rnE '\bCLEAR\b|Sumsub' content gradient_papers_v3 2>/dev/null \
  | grep -vE 'cleartext' \
  | grep -vE '/_generated/')
if [ -n "$vendor_hits" ]; then
  echo "FAIL: retired identity vendor (CLEAR/Sumsub) on a public surface:"
  echo "$vendor_hits"
  fail=1
fi

# 2) Retired absolute executor throughput (773,000 / 773K / 773 tx) — the "sold at 773k" figure.
#    Matches the number-as-throughput, not the contract address 0x46773aeC... in gradient No3.
tps_hits=$(grep -rnE '773[,K]|773[[:space:]]*tx' content gradient_papers_v3 2>/dev/null \
  | grep -vE '/_generated/')
if [ -n "$tps_hits" ]; then
  echo "FAIL: retired absolute executor throughput figure (773K) on a public surface:"
  echo "$tps_hits"
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "PASS: no CLEAR/Sumsub vendor references and no 773K throughput on any public content surface."
fi
exit "$fail"