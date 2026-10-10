# Fire-305 independent provenance-gate review

The committed gitlink may be an ancestor of every advertised remote ref tip and still be fetchable. A ref-tip-only test conflates recency and availability, and advising a gitlink advance can bypass reviewed-pin discipline. Reproduced the false negative with a real local remote, two commits and an uninitialized parent submodule: old gate failed the ancestor fixture while absent/unreachable sources correctly failed.

The corrected gate reads HEAD metadata, verifies a 160000 gitlink, fetches the exact SHA from the declared source into a disposable bare object store and verifies FETCH_HEAD's commit identity. It neither consults the existing checkout nor changes the pin. Git uses argument arrays; errors omit raw stderr and credential-bearing URLs. Each Git operation has a two-minute timeout and terminal prompts disabled. Relative remote URLs currently fail closed rather than guessing their resolution.

Independent adversarial review identified inherited Git repository/object environment and working-metadata bypasses; both were fixed with regressions. Test integration now includes .test.mjs in the root script suite. Live exact-source verification passed for unchanged fork pin 1739f191.

Recovery: GitHub Actions and local failed receipts were inspected. Failed retained result commits are ancestors of origin/main except 8770b90e. Its source/research commits are patch-equivalent on main; its remaining diff is historical fire-273 bookkeeping, already documented by later recovery runs. Retained tree is clean; no duplicate cherry-pick or deletion.

Scope: verifier-only reliability slice under ADR 0002. No product build, browser journey, authenticated storage reconciliation, visual scoring or deployment is credited. Candidate adapter rehearsal and migration acceptance remain open.

Official `cr --provider codex exec --sandbox read-only` subscription review found another provenance bypass: global/system Git `url.*.insteadOf` rewrites. The gate now checks Git's effective URL before fetching and fails if it differs from the declared source, preserving authentication configuration. A real Git fixture with an unavailable HTTPS source rewritten to a local repository fails closed. Final script suite: 115/115 passed, including nine provenance fixtures.
