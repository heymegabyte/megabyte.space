# fire-366 — candidate core configuration serialization

Mode: offline research/regression; no upgrade or production operation.
Root base: 7d3088eb5b0bbfb779497af989856267793dfcdd.
Active gitlink: 240899ec34e822a0afa695e3c7b48a41c2db9c4c (unchanged).
Candidate: 2726e932a3fbfcfffa04ee093a881604009f2034.

## Recovery and provenance

Bounded origin/main fetch and GitHub Actions list succeeded. Prior failed run
42320764130 retained original result 3263c25d; its original commit is not an
ancestor of origin/main, but its actual changes were already recovered as
cf8d8d7b and 9abf6782 in published base 7d3088eb. No duplicate recovery needed.
Worktree list and both prior failed/success receipts were inspected read-only.
The canonical main worktree is independently ahead/different; publication remains
with the outer runner, which must reconcile actual ancestry.

All four candidate Wrangler snapshots were copied verbatim with git show from the
exact object in retained fire-363 cloudflare-os, after verifying its own .git and
top-level identity. candidate-source.json records source paths and SHA-256 values.
Independent review verified these bytes against the retained object. This proves
local object provenance, not current remote fetchability or newest-release status.
These are test input snapshots, not hand-edited generated deployment adapters.

## Executed scope

The new deployment regression substitutes candidate Router, Workshop, Context and
Scheduler together, keeping wrapper-owned custom Gatekeeper and Error Reporter
bases. It generates all output, serializes it to a temporary JSON file, reopens it,
and checks explicitly required runtime fields, Router assets, Context migrations,
Scheduler migrations and Text rules, Workshop migrations/Browser/loader/version
metadata, and nonmutation of every input. Context KV/Artifacts replacements and
legacy auth injection/missing Web Search are characterized separately.

Deployment tests pass 28/28; complete root script suite passes 254/254; script
typechecking passes. Frozen root offline install with pnpm 11.17.0 and
--ignore-scripts exits 0 (27s). This is not lifecycle or fork-install acceptance.
No full fork install/full wrapper or candidate executable build was attempted.

## Release wiring review

The candidate base files contain no Workshop vars/services; absence there does
not mean absence from a release. Candidate scripts/release/manifest-lib.ts
(buildWorkerEntry) adds WORKERS_AI and installed Gatekeeper expansion; deployment
instance vars are injected separately by the deploy service. It preinstalls
Context, Scheduler and Web Search. The wrapper independently supplies Workers AI,
Context sharing-domain RPC props and its fixed extras, but omits Web Search.
Adding it requires capability/billing and isolated acceptance, not a blind binding.

Candidate packages/router/src/index.ts routes /api/* to Workshop and scans only
GATEKEEPER_* bindings. It does not consume AUTH/BA_GATE/BETTER_AUTH. Its asset
policy handles selected API prefixes rather than every HTML navigation. Thus a
candidate pointer move cannot preserve the legacy Better Auth force-login contract
through config injection alone. Fresh apex must use its approved Access/native
identity and separate resources; legacy demo must retain its functioning fork.
This is a source-confirmed compatibility boundary, not a discovered live incident.

Context Artifacts is optional and default-off in both candidate and wrapper.
An enabled namespace is not proof of account access or Git collection continuity.
Workshop KV/R2 replacement retains binding names but replaces preview/resource
identities; that is not proof of data reuse or isolation. Scheduler Text rules
survive, but generated/app.txt inclusion and schedule execution require builds.
Candidate model seed, audit floor and notification installation inputs are absent
from wrapper vars; secret provisioning and default behavior remain separate gates.

## Execution and limits

OpenCode direct DeepSeek test delegation timed out after 120 seconds with no edits;
parent completed the bounded regression. Independent cr Codex subscription review
exited 0 read-only; its comment about the old mixed-base test predates this run's
new test and is superseded only for offline four-core serialization coverage.
Router/data/Artifacts/bundle findings remain applicable. The skill router selected
no extra skills; operating-system and repository operator guidance were consulted.

No pin, deployment config, receipt, production, credentials, scheduler, namespace,
visual scores or browser/native acceptance changed. No runtime migration acceptance
is claimed. Next: deliberate fresh-vs-legacy wiring review, candidate build/export
and pinned Wrangler dry run, then approved isolated namespace/data acceptance.

Loop improvement: require both exact base preservation and review of release-service
injected wiring; a passing base serialization check cannot attest either identity
compatibility or the installed ambient capability set.
