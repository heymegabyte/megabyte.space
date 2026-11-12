# Retained terminal evidence assessment

Assigned snapshot: `7a683ded42f5724a0b96d37ee4cbd465958ea616`; bounded fetch and merge-base confirm it is in origin/main. No relevant source difference from origin/main was observed. GitHub records run 43146093962 as failed; that run conclusion is distinct from its subprocess results.

The retained `wrapper-terminal.json` reports exitCode 0 for `NODE_OPTIONS=--max-old-space-size=1280 timeout 1500 pnpm check`, ended at 2026-11-12T03:17:54.404628+00:00, and an empty remainingGeneratedConfigs list. Its wrapper log ends in Router dry-run output. Its earlier agent-report still says INCOMPLETE. Credit the terminal receipt as recovered historical check evidence, not a fresh run or overall fleet success.

Read-only retained fork inspection found independent HEAD `240899ec34e822a0afa695e3c7b48a41c2db9c4c` and clean status. Retained root lock checksum matches assigned root: `ded21717b5e5923ea0a570edef48a1dd7e0b087afaa8081ab3535403ef4a991f`. No unpublished tracked source was found to salvage; the retained untracked research artifact remains untouched.

Fresh recovery/bookkeeping tests: 23 passed. The broader attempt including deploy.test.ts failed at import because this assigned checkout lacks installed jsonc-parser; it does not contradict the historical installed-workspace check. No source/build/deploy acceptance was inferred from receipt equality. No pin, production configuration, generated adapter or visual score changed.
