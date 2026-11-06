# Independent subscription review

Provider: official Codex subscription through `cr --provider codex exec`.
Final response only; raw execution transcript remains outside the repository.

**Candidate acceptance remains blocked for ADR0002.** Targeted source review of `bd10b0ec…2726e932` only; no builds, tests, network checks, pin changes, edits, agents, or deployment. Checkout remains `240899ec`.

| Finding | Risk / required acceptance |
|---|---|
| **Current wrapper is still legacy deployment machinery.** `scripts/deploy.ts` injects `AUTH → megabyte-auth`, `BA_GATE`, `BETTER_AUTH`, and `BA_ALLOWED_EMAILS`. `deployment.jsonc` retains legacy Worker names and `https://os.megabyte.space` Context isolation. | Applying the candidate through this configuration would target legacy identities and retain fork-specific authentication assumptions. Fresh identities, isolated resources, and native authentication acceptance are prerequisites. |
| **Model policy is not preserved by provider ordering.** Candidate `packages/workshop-backend/src/ai-gateway.ts` orders providers by admin `providerOrder`, then `SUGGESTED_MODELS`; the first model becomes the default. | The deployment comment claiming OpenAI comes first because of its provider-list position is unreliable. Current OpenAI/Anthropic configuration also conflicts with ADR0002’s Workers AI baseline. Verify the actual default, enabled catalog, and billing policy. |
| **New policy variables are dropped.** `generateConfigs()` replaces `workshop.vars` wholesale. | Candidate `ADMIN_CONFIG_SEED`, `ADMIN_AUDIT_RETENTION_MIN_DAYS`, and notification installation vars have no wrapper configuration path. Dashboard vars will not survive this generator. Deliberate defaults or explicit forwarding must be accepted. |
| **Audit migration survives cloning, but needs verification.** Candidate `packages/workshop-backend/wrangler.jsonc` adds `v4 → AdminAuditDurableObject`; the wrapper preserves `migrations`, build configuration, and compatibility flags. | `src/admin-settings.ts` records settings changes before applying them; audit failure can block native branding/configuration. Require migration/build validation, successful setting audit, non-admin denial, retention enforcement, and injected audit-write failure coverage. |

Additional security acceptance seams:

- **Observers:** `gatekeeper-kit/src/observers.ts` introduces subresource scopes; `workshop-backend/src/observer-ledger.ts` enforces them alongside the legacy observer protocol. Omitted subresources receive no ledger check; `[]` declares no restrictions. Test incomplete provider dependencies, revoked/reconnected accounts, verifier failure, concurrent admission, gadget scope widening, and stale executions. Kernel checks are fresh, but GitHub’s `src/github.ts` explicitly caches provider ACL answers—do not promise immediate revocation.

- **Auto approvals / restricted fetch:** `src/auto-approval.ts` requires literal `autoApprovable: true`, an enabled rule, and no restricted-data latch; old missing verdicts fail closed. `src/web-fetch.ts` checks redirect destinations, exact trusted hosts, query strings, and encoded `cdn-cgi` paths. In `overseer.ts`, an explicitly approved URL removes host restrictions for its redirects. Accept that delegation explicitly; test restricted-mode activation during queued work and approval/rejection paths.

- **Microsoft:** `packages/gatekeeper-microsoft/` is absent from wrapper `EXTRA_GATEKEEPERS`, builds, and bindings. Record it as **unavailable**, rather than adding integration scope. If later enabled, review tenant restrictions, delegated permissions, callback routing, and access caps: documented defaults include SharePoint writes, Outlook sending, and calendar scheduling.

- **Git push:** `gatekeeper-github/src/github.ts` makes default/protected/unknown-branch pushes manual; missing historical `gatedBranch` also stays manual. Test protection/default-branch changes after queueing. The source explicitly acknowledges a repository rename/reuse race between name lookup and push.

- **Push notifications / unread:** `src/notification-service.ts` adds install-and-user ownership and `/v2` enrollment dependencies. Current wrapper does not supply required installation vars. Verify cross-user enrollment rejection and logout cancellation before claiming push support. `docs/user-unread-state.md` specifies **no historical backfill**; test duplicate delivery, eviction/retry, revoked membership, and read-state privacy.

**Evidence limit:** These are source-derived findings and acceptance requirements, not demonstrated runtime failures or a full audit. Candidate-specific checks and protected native-flow acceptance remain outstanding.
