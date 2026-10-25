# Targeted independent review and convergence

Reviewer: native Codex subagent upstream_review; read-only source review, no inference,
install, build, deployment or pin modification. Candidate bd10b0ec; wrapper d4fb1a8a.

- Web Search cannot simply join EXTRA_GATEKEEPERS: the wrapper invokes
  build:configurator for each extra, but candidate gatekeeper-websearch/package.json
  has build=tsc and no configurator task. An explicit build/deploy path is required.
- Candidate gatekeeper-websearch/src/search.ts selects CF_AI_GATEWAY or default for
  its own AI.websearch calls (ceramic provider). Workshop-only gateway vars do not
  configure that Worker. Prove intended search gateway/account and audited failure behavior.
- Wrapper scripts/deploy.ts replaces router/backend service arrays. Upstream manifest
  preinstall does not populate those arrays for this wrapper.
- Candidate router reads version metadata, while its Wrangler config does not declare
  it; installer injection is expected. Check router metadata/release tags as well as
  backend metadata before crediting update detection.
- Candidate router omits fork Better Auth forwarding/anonymous HTML gate while wrapper
  still sets AUTH/BA_GATE/BETTER_AUTH. Reviewer requested preservation/regression checks.
  Convergence: ADR 0002 intentionally removes legacy auth hooks from the FRESH apex,
  so do not preserve them blindly. Keep the legacy demo build intact; remove those
  hooks only from the separately prepared fresh wrapper, proving Access/native auth
  and negative cases there. No direct fork-to-official in-place replacement is authorized.

These findings supplement the primary research. Inventory completeness remains distinct
from reviewed coverage. Earlier session, concurrency, revocation and isolation acceptance
is not discharged by this review.
