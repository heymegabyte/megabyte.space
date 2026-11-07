# fire-367 — recover candidate auth helper characterization

Mode: offline research/regression, no production or upgrade operation.
Assigned base: ad6e54247f60a5369bd7ea4fbfefc581db465f65.
Unchanged gitlink: 240899ec34e822a0afa695e3c7b48a41c2db9c4c.
Candidate: 2726e932a3fbfcfffa04ee093a881604009f2034.

## Recovery and provenance

Bounded origin/main fetch and Actions history succeeded. Previous run 42402339263
failed with unchanged base; its actual retained worktree has three untracked auth
fixtures, no new commit. Inspected these read-only and recovered the exact helper
and source manifest. Moved its six tests into scripts/candidate-auth.test.mjs so
normal root script discovery executes them; initial recovery changed only import/file URLs; review follow-up below expands assertions.
Retained source worktree 42293062320/cloudflare-os has its own Git top-level.
`git show 2726e932:packages/workshop-backend/src/auth/config.ts` and recovered bytes
both hash to 7506aed2be31fdc00d35a07e6d201efd22a9f83c9f4e3460dfce2e1150926651.
This establishes local object provenance, not remote candidate fetchability.
Prior published fixture commit bc5249cb is an ancestor of origin/main; no duplicate
cherry-pick. Canonical main is independently ahead; outer runner owns publication.

## Findings and acceptance boundary

Six helper tests establish default password enablement; exact lowercase `true`
plus a nonempty allowlist disables passwords; blank allowlists retain passwords.
Allowlist parsing trims/lowercases but preserves duplicates and does not verify
installed or auth-capable providers. Listing only an unavailable vendor can thus
make this helper report password-disabled; it does not prove a working replacement
login. Admin matching folds ASCII only, rejects Kelvin-sign impersonation, accepts
array/JSON-array bindings, and throws for malformed bindings.

The Access fixture deliberately shows the helper returns true even with Access
vars; it does NOT show Access deployments allow password login. Independent source
inspection of candidate server.ts login/createAccount shows CF_ACCESS_AUD rejection
BEFORE the helper check. Candidate access.ts requires issuer and audience and
verifies JWTs against remote JWKS. Those are source observations, not executed
Worker/JWT/provider/browser acceptance. No upstream security defect is claimed.
The wrapper injects CF_ACCESS_ISS, CF_ACCESS_AUD and ADMINS and builds frontend in
Access mode; fresh Access/native identity and legacy Better Auth remain separate
contracts. No flags, providers or Access policies were changed.

## Fresh verification

Exact pinned fork initialized and check-fork-workspace passed. Frozen root pnpm
11.17.0 offline install with --ignore-scripts passed; lifecycle/fork installation
is not credited. Focused recovered tests: 6/6. Root script suite: 260/260. Scripts
typecheck exited 0. No candidate build, full wrapper check, Wrangler dry run,
namespace/state migration, browser/native journey or visual acceptance ran.

DeepSeek bounded recovery delegation timed out without edits; parent recovered the
small exact files directly. First cr Codex review timed out waiting on input;
retry exited 0 with three characterization gaps. Tightened the snapshot digest/path
assertions, renamed Access-shaped helper test, and added parser/admin negative cases.
Reviewer could not resolve the candidate in the current fork; the independent
retained-object hash comparison above supplies that external provenance observation.
The test checks recorded bytes, not independent online provenance on every run. No paid API fallback.

Loop improvement: put recovered helper assertions in standard root discovery and
separate pure-helper output from earlier Access guards in actual call sites.
Next: execute candidate Access denial/allow and native enrollment on approved
isolated identities, with installed-provider resolution and rollback acceptance;
retain all full-wrapper, migration and release capability wiring gates.
