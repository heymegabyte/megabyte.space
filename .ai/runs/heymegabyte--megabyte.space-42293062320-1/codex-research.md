# Fire-363 — candidate Worker configuration preservation

Reviewed official `2726e932a3fbfcfffa04ee093a881604009f2034`, fetched directly
from the official remote, against starter `d8829d9a`. This is targeted source
reasoning, not executed candidate configuration generation or migration acceptance.
The declared fork stays at `240899ec34e822a0afa695e3c7b48a41c2db9c4c`.

## Recovery and scope

Fetched origin/main contains d8829d9a and the preceding successful run results.
Recent Actions history and git worktree list were inspected. Failed receipts
41963669270 and 41810878270 were inspected; the retained 41963669270 collector
on disk has the same SHA-256 as the committed collector in this checkout
(a6db083d61c79f6a8cda32d7773be86c05b99255fd1914f9916f0fb60dd90505).
It was untracked in that retained HEAD, so a Git-show lookup cannot recover it;
the actual retained file is the evidence. No further salvage was necessary.
No other worktree was modified. The repository has no bin/skill-router.py.

## Configuration conclusions

- `scripts/deploy.ts:generateConfigs` structured-clones the Workshop base before
  applying `setCommon`. Neither function assigns or deletes `migrations`.
  Thus source reasoning predicts the candidate v0–v4 sequence survives, including
  v4/new_sqlite_classes/AdminAuditDurableObject. This has not been exercised with
  candidate inputs through the actual function in this run.
- Candidate `packages/workshop-backend/cloudflare.config.ts` explicitly says DOs
  use ctx.exports and need no durable_objects binding. The generated candidate
  wrangler.jsonc has the v4 migration without that binding; server.ts imports and
  exports AdminAuditDurableObject. Absence of an explicit binding is consequently
  not evidence of a missing audit namespace. Successful validated bundle export
  and runtime namespace access remain separate acceptance gates.
- Workshop browser/BROWSER, worker_loaders/LOADER, version_metadata/CF_VERSION_METADATA,
  compatibility date and compatibility flags also survive by clone-and-no-overwrite
  reasoning. This includes global_fetch_strictly_public. setCommon intentionally
  replaces deployment identity/routes and selected observability settings.
- Workshop vars, services, KV and R2 arrays are replaced, not merged. Resources
  use supplied identities or provisioning defaults. A future upstream addition in
  these arrays cannot be assumed to survive. Candidate comments explicitly leave
  service bindings and Workers AI to release wiring; inspect that release wiring
  separately rather than comparing only the base Wrangler file.
- Existing scheduler fixture asserts migration preservation; the deploy test file
  has no equivalent Workshop migration assertion. Existing tests use current
  checkout base files, so even a passing legacy suite cannot attest this official
  candidate. Do not edit the fork or add a redundant binding as a shortcut.

## Next acceptance and loop improvement

For a selected candidate, execute generation with its exact base files, reopen the
serialized generated Workshop config, and compare the complete migration sequence,
compatibility flags, Browser/loader/version bindings, and intentional replacement
arrays. Validate the built server exports and project-pinned Wrangler dry run.
Then exercise fresh namespace creation separately from isolated v3-to-v4 upgrade,
persistence, state separation and rollback. Generation equality cannot prove any
of those runtime properties. Preserve candidate policy-vars, release-preinstall,
native-client and full-wrapper acceptance gates from prior reviews.

Fresh dependency-free offline fixtures: 81/81 provenance; 36/36 fork/lease/bookkeeping.
Exact fork preflight passes. Deploy-state detector reports historical receipt mismatch
240899ec versus 80b7209e; this is not live source correlation and the receipt is preserved.
No frozen installs, generated-config execution, candidate build, full wrapper, browser,
native-client, authenticated storage reconciliation or production operation ran.
No UI visited, so visual scores remain unchanged. The cgroup memory limit is 2 GiB;
prior full-wrapper heap exhaustion remains relevant to planning a future measured run.
