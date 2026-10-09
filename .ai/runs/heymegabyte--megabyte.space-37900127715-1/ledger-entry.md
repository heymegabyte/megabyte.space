## fire-291 — fleet recovery and publication contract (2026-10-09)

Slice e4e7480f makes fleet instructions override legacy session rebase/push/deploy-tail,
cron/watchdog and handoff directives. Closes the fire-249 coexistence item; incoming isolated
snapshot is preserved, outer runner publishes, retained results require main ancestry proof.
Independent recovery review and standing Long-Trail/Deep UI feasibility review were read-only.
Official cr Codex adversarial review found the handoff watchdog-trigger ambiguity; corrected to
owner-checked release. No security/runtime changes or fork movement (91a6d443).

Recovery: origin/main c95809af contains all four retained result tips; their trees are clean.
Prior GitHub failures are not publication evidence. No recovery duplication/deletion performed.
Fresh verification: full script suite 96/96, focused lease/bookkeeping 25/25, script types and
diff whitespace green; frozen root install passed. Recorded-deploy pin matches, not live proof.
verify-prod exits 2: missing BA_E2E_EMAIL/BA_E2E_PASSWORD. Cloudflare global deployment key and
DeepSeek key unavailable. No deployment, authenticated browser, SSO/persistence or vision evidence;
no matrix score/pass changes. Full product-loop acceptance remains blocked.

Next-wave discovery refines existing case-001 restart item: historical checkpoint action 26 still
expects retired Access topology; rewrite remaining plan against Better Auth before resuming.
Mandatory loop improvement is the explicit fleet execution override. GitHub owns cadence;
no local scheduler or credentials modified. Exactly one bounded fire; publication left to runner.
