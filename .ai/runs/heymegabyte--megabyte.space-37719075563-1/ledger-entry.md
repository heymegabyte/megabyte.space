## fire-248 — isolated fleet verification repair

- Commit fb4cd0e0 fixes the observed uninitialized-submodule diagnostic: fork probes cannot borrow outer HEAD/porcelain; parent gitlink checks stay active and skipped checks are explicit. Regression RED before fix, GREEN after; independent adversarial review incorporated.
- Loop improvement: fleet-specific orient instruction preserves workspace isolation, pinned initialization, GitHub cadence and outer-runner publication.
- Tests: targeted Node tests 23/23 PASS; broader script tests 50 PASS / 1 load failure (missing jsonc-parser); git diff --check PASS. verify-prod exits 2 because BA E2E credentials are absent. Cloudflare and DeepSeek credentials also missing.
- No deployment, authenticated journey, UI visit or visual scoring this fire. Submodule pin unchanged at 85abc7c5. Product acceptance remains unmet; this bounded iteration records actual repair and external blockers.
- Recovery: no earlier failed receipts or retained project worktrees found; origin/main includes base 30d301af and prior fire-247 commits. Local commits await outer runner publication.
- Next: initialize pinned fork, install locked dependencies, rerun full gates and authenticated journey when credentials available. No local cron/watchdog armed; GitHub owns scheduling.
