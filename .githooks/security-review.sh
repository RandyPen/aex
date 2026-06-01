#!/usr/bin/env bash
#
# Security reviewer. Reads a git diff on stdin, asks Claude (headless) to flag
# security issues only, and signals the result via exit code.
#
#   exit 0  -> no blocking security issues (allow the commit)
#   exit 1  -> security issue found (block the commit); details on stderr
#
# Shared by the pre-commit hook. Fails open (exit 0) if the `claude` CLI is
# unavailable or returns nothing, so the review never wedges your ability to
# commit — it is a best-effort local gate, not a hard enforcement boundary.

set -euo pipefail

# Model used for the review. Sonnet keeps per-commit latency/cost low; set
# COMMIT_REVIEW_MODEL=claude-opus-4-8 for a stricter (slower) review.
REVIEW_MODEL="${COMMIT_REVIEW_MODEL:-claude-sonnet-4-6}"

if ! command -v claude >/dev/null 2>&1; then
  echo "security-review: 'claude' CLI not found — skipping (fail-open)" >&2
  exit 0
fi

diff="$(cat)"

# Nothing staged / empty diff -> nothing to review.
if [ -z "${diff//[$'\t\r\n ']/}" ]; then
  exit 0
fi

read -r -d '' instructions <<'EOF' || true
You are a security reviewer gating a git commit. Review ONLY the diff below for
genuine security problems:
  - leaked secrets, API keys, tokens, passwords, private keys
  - injection (SQL/command/template), unsafe eval/deserialization
  - authentication / authorization bypasses
  - unsafe handling of untrusted input, SSRF, path traversal
  - accidental exposure of sensitive data (PII, internal endpoints)

Ignore style, naming, performance, and non-security concerns. Be conservative:
only block on a concrete, defensible security issue you can point to in the diff.

Respond with EXACTLY ONE LINE, nothing else, in one of these two forms:
  PASS: <short reason>
  BLOCK: <file/location> — <the specific issue>

Diff to review:
EOF

verdict="$(printf '%s\n%s\n' "$instructions" "$diff" \
  | claude -p --model "$REVIEW_MODEL" 2>/dev/null || true)"

if [ -z "${verdict//[$'\t\r\n ']/}" ]; then
  echo "security-review: no response from claude — skipping (fail-open)" >&2
  exit 0
fi

echo "── commit security review ──" >&2
echo "$verdict" >&2
echo "────────────────────────────" >&2

if printf '%s' "$verdict" | grep -qiE '(^|[^A-Za-z])BLOCK:'; then
  exit 1
fi
exit 0
