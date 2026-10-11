# Fire-309 convergence and adversarial review

Claude independently reviewed the exported exact patch and candidate source via official subscription `cr`; no candidate tests ran. Its first attempt was blocked by its noninteractive permission layer. The authorized native CLI retry completed; initial output is private and not treated as source evidence.

Both passes agree that concurrency is unproven and open-RPC expiry is the highest-priority runtime acceptance gap. Source shows authenticate() validates expiry at capability creation, while AuthenticatedApiImpl retains the user DO and delegates later operations without retaining/checking the Workshop token. This is strong evidence for a lifecycle gap, but actual socket behavior remains untested; do not claim an observed production exploit or runtime failure. Access open-session expiry predates this range and must be distinguished from newly minted Workshop device credentials.

Additional accepted review items: password-change/device-session revocation semantics, consumed-but-undelivered cleanup, valid-Access callback integration, gatekeeper token roundtrip, alarm-driven expiry and the claimed app-link's web fallback handling of ciphertext/query/referrer. These are acceptance tests/design questions, not permission to expand native product features in the legacy fork.

Concurrency depends on actual workerd scheduling and storage input/output gates; neither pass proves a double-redemption. Do not adopt a delete-before-hash suggestion literally: an invalid ticket must never consume a valid transfer. Prefer a proven serialized/atomic comparison-and-consumption design if a real Worker/DO test reproduces interleaving.

Convergence review: documentation/backlog changes only; no gitlink, production config, route, resource identity, deployment receipt or visual-score change. The exact diff inventory is uncapped and immutable refs are recorded. Source tests 20/20, committed-tree tests 9/9, lease/bookkeeping tests 25/25 pass. Full candidate install/build, native/authenticated journey and migration decisions remain open.
