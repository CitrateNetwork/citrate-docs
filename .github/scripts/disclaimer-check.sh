#!/usr/bin/env bash
# disclaimer-check.sh — REM-03
#
# Enforces that compliance-framework claim phrases on public surfaces
# (CMMC L2, FedRAMP, FIPS 140-3, ITAR-controlled) appear ONLY in
# contexts that include the appropriate disclaimer.
#
# Why: per the 2026-05-19 federation-split audit, citrate's actual
# posture on these frameworks is "in progress / not yet certified".
# Public claims that elide that nuance create both a compliance risk
# (assessors will challenge) and an honesty risk (customers may
# mis-rely). The audit found content was clean at time of scan but
# called for an automated enforcement gate (F-03 → REM-03). This is
# that gate.
#
# Behavior:
#   Scans Markdown / MDX / HTML / TS(X) / JS(X) files for the
#   following CLAIM patterns:
#     - "CMMC Level 2", "CMMC L2"
#     - "FedRAMP authorized", "FedRAMP authorization", "FedRAMP-authorized"
#     - "FIPS 140-3 certified", "FIPS 140-3 validated"
#   For each hit, requires a DISCLAIMER token in the SAME FILE:
#     - "in progress" | "not yet" | "self-attest" | "phase-1" |
#       "T+12" | "T+24" | "sponsor" | "post-remediation" |
#       "remediation" | "in active remediation" | "voluntary"
#   Exits 0 if every claim has at least one same-file disclaimer.
#   Exits 1 if any claim is found without a disclaimer (BARE CLAIM).
#
# False-positive note: a single-file scope is coarse. A doc that
# names CMMC L2 deep in the document body and adds a disclaimer in
# the footer will pass. This is intentional — perfectionist proximity
# checking would create more noise than signal. The audit-grade rule
# is "if a doc mentions L2, it must also note that L2 is not yet
# certified somewhere in the same doc."

set -euo pipefail

# Exclusion list — files where claim-phrases legitimately appear
# without inline disclaimers (e.g., a glossary, an audit document
# that quotes claims under review, the audit folder itself).
EXCLUDES=(
  './node_modules/'
  './.next/'
  './.git/'
  './out/'
  './dist/'
  './build/'
  './citrate-agentile-archive/audits/'
  '/disclaimer-check'
  '/CHANGELOG'
)

EXCLUDE_PATTERN=$(printf '%s\n' "${EXCLUDES[@]}" | paste -sd'|' -)

CLAIM_PATTERN='(CMMC.*Level.*2|CMMC.*L2|FedRAMP.*[Aa]uthoriz|FedRAMP-[Aa]uthoriz|FIPS.*140-?3.*(certif|validat))'
DISCLAIMER_PATTERN='(in progress|not yet|self-attest|phase-1|T\+12|T\+24|sponsor|post-remediation|remediation|active remediation|voluntary|self-assessment)'

bare_count=0
total_claims=0

while IFS= read -r -d '' file; do
  # Skip excluded paths
  if echo "$file" | grep -qE "$EXCLUDE_PATTERN"; then
    continue
  fi

  # Check if file contains any claim
  if ! grep -qiE "$CLAIM_PATTERN" "$file" 2>/dev/null; then
    continue
  fi

  total_claims=$((total_claims + 1))

  # Check if file ALSO contains a disclaimer
  if grep -qiE "$DISCLAIMER_PATTERN" "$file" 2>/dev/null; then
    echo "  OK: $file (claim + disclaimer co-occur)"
  else
    echo "  BARE CLAIM (no disclaimer in same file): $file"
    grep -niE "$CLAIM_PATTERN" "$file" | sed 's/^/    /'
    bare_count=$((bare_count + 1))
  fi
done < <(find . -type f \( \
    -name '*.md' -o -name '*.mdx' -o -name '*.html' \
    -o -name '*.txt' \
    -o -name '*.ts' -o -name '*.tsx' \
    -o -name '*.js' -o -name '*.jsx' \
    -o -name '*.mjs' \
  \) -print0 2>/dev/null)

echo
echo "Summary: $total_claims files with claim phrases; $bare_count without same-file disclaimer."

if [ "$bare_count" -gt 0 ]; then
  echo
  echo "FAIL: $bare_count file(s) contain a compliance-framework claim"
  echo "without an accompanying disclaimer in the same file."
  echo
  echo "Acceptable disclaimer patterns (case-insensitive, anywhere in the file):"
  echo "  in progress | not yet | self-attest | phase-1 | T+12 | T+24"
  echo "  sponsor | post-remediation | remediation | voluntary | self-assessment"
  echo
  echo "If a hit is genuinely a legitimate bare reference (e.g., quoting"
  echo "an external framework name in a glossary), add the path to the"
  echo "EXCLUDES array in this script."
  exit 1
fi

echo "PASS: all compliance-framework claims co-occur with a disclaimer."
exit 0
