# Fire-291 independent fleet-contract review

Before delegated conclusions: the existing fleet orientation bullet correctly reserves publication
for the outer runner but later instructions still prescribe pull/rebase, push, deployment receipt
push, session cron and launchd watchdog activation. The fire-249 coexistence backlog item remains
open. A scoped fleet execution contract should override those instructions explicitly, without
changing interactive-session behavior or product runtime.

Recovery evidence: freshly fetched origin/main contains c95809af (fire-290), and that history
contains 9ccb3640, 8770b90e and e9b95de0 retained run results. No prior result needs cherry-picking.
Retained worktrees remain untouched. GitHub lists four prior failures despite those result commits
being present; receipt status alone does not determine publication.

Credentials: get-secret --exists reports deployment global key, BA E2E email/password and direct
DeepSeek unavailable. No paid API fallback. The fork initialized at unchanged 91a6d443.
Product runtime, auth policies, scheduler credentials and visual scores are outside this doc slice.

Review convergence: read-only recovery reviewer confirmed the contradictory legacy instructions.
Standing browser reviewer found case-001 still at fire-3/action 26 with retired Access assumptions;
its existing restart backlog item is refined, not duplicated. No browser actions or vision run.
Independent official cr Codex review rejected describing handoff as a neutral receipt: its stale
released-handoff phase is a watchdog trigger. Fleet contract now uses owner-checked release instead.
Fresh lease/bookkeeping tests 25/25 and full script suite 96/96 pass; script types pass.
verify-prod exits 2 for missing BA E2E credentials. No deployment or runtime change.
