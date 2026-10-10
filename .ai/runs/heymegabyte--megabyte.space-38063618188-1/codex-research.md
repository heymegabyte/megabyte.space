# Independent candidate adapter review — fire-304

Reviewed official `cloudflare/cloudflare-os` commit
`7ec49d8c865917c7be0401938eadc7218ed9d398` from a direct Git fetch, while retaining
fork gitlink `1739f1915af71f12c4bb3802458502c6453ba450`. No candidate checkout,
pointer change, production mutation or runtime acceptance occurred.

## Findings

1. Root workspace currently includes only workshop-shared and error-reporting from
   the fork. Official workshop-shared now requires catalog workers-types; the root
   catalog lacks that entry. Official root also includes `scripts` as workspace
   package `@gadgets/scripts`, consumed by config and build tooling. Review the
   dependency closure of each starter-imported package before adding workspace paths.
2. Shared versions differ: capnweb ^0.11.1→^0.12.0; capnweb-validate 0.2.4→0.3.0;
   test pool ^0.20.2→^0.22.0; vite-plus ^0.2.8→^1.0.0; vitest ^4.1.10→^4.1.11;
   wrangler ^4.119.0→^4.147.0. The official override is `vite@*`, preserving
   Vite Plus's aliased core, whereas starter uses blanket `vite`. Align catalogs,
   overrides, supply-chain policy and both lockfiles together, not just versions.
3. Official `cloudflare.config.ts` is authoritative and generated `wrangler.jsonc`
   remains a supported consumer artifact. Starter reads those JSONC files directly.
   Run candidate `configs:check` before deriving deployment configs. Keep candidate
   compatibility date/flags, complete migrations, entrypoints and build stanzas.
4. Starter buildCommands invokes direct `vp run`; official root uses
   `scripts/vp/run.ts` with concurrency limits and termination relay. Official tasks
   also use `@gadgets/scripts` imports. Rehearse the full graph and configurator
   rebuilds under the candidate toolchain; old build-command tests are insufficient.
5. Starter injects `AUTH`→`megabyte-auth`, BA_GATE, BETTER_AUTH and BA_ALLOWED_EMAILS.
   Those belong to the legacy stack. Fresh Access configs should omit these hooks,
   retain native issuer/audience/admin controls and use new worker/storage identities.
   Source removal does not prove Access allow/deny/admin enforcement.
6. Legacy starter tests expect all-navigation worker-first routing. Official router
   config has API, blueprint-screenshot and gatekeeper prefixes. Derive routing from
   the target design and prove HTML authentication before choosing any routing rewrite.
7. Official release manifest is version 1, with a closed binding-placeholder contract,
   full migrations and fail-closed unknown top-level config keys. It is not a drop-in
   substitute for this starter's deploy flow. Choose either local starter builds or
   immutable release artifact rendering explicitly; do not mix guessed templates.

Source blob IDs and selected exact source contracts are in compatibility-evidence.json
and candidate-source-contracts.txt. Independent adversarial review confirmed catalog,
legacy-auth, routing and migration gaps. It also identified that the current
check-submodule-resolvable gate equates resolvability with a remote ref tip: reachable
ancestor pins can be cloneable. This needs a separate real-Git regression and fix;
never bump a reviewed pin merely to satisfy that heuristic.

## Rehearsal acceptance (bounded next fire)

After candidate/provenance selection, prepare a run-local candidate source directory
without changing the production gitlink. Map workspace dependency closure, align
catalog/overrides and locks in the rehearsal only, then frozen-install both workspaces.
Run candidate configs:check, starter script typecheck/tests, complete worker/frontend
builds and six Worker dry-runs. Inspect resulting configs for no legacy auth hooks,
new resource identities, native Access configuration, no backend public routes,
correct static/API routing and unchanged candidate migration history. Deploy only
with the concrete account/host/identity/Access/resource decisions recorded; authenticated
protected-eval journeys and visual inspection remain separate acceptance gates.

## This-fire evidence

Root frozen install succeeded (corepack pnpm 11.17.0), without tracked lock drift.
Deployment/lease/clean-tree tests passed 46/46. These exercise retained-pin behavior,
not the candidate. check-deploy-state reports retained pin != receipt 80b7209e;
preserve the receipt. Main contains both last successful result commits. Retained
tracked trees are clean; older unpublished fire-273 bookkeeping is already represented
in current backlog entries, so it was not replayed. Missing provider-policy path was
resolved to the canonical shared skills repository policy, without editing host state.
