# Fire-290 independent source reconciliation

Before external reviewer conclusions: ARCHITECTURE.md incorrectly attributed apex ownership to
megabyte-home, sent human login through os.megabyte.space/Access, called the owned fork read-only,
and named the old gateway. Source truth: deployment.jsonc router customDomain=megabyte.space,
aiGateway.name=megabyte-space; pinned router serves inline login to anonymous HTML GET and forwards
/api/auth/* before /api; backend validates verified Better Auth email and allowlist before assigning
authenticated identity. Cookie presence at the HTML gate alone is not data authorization.

Prior failure recovery: git merge-base confirms 9ccb3640 (latest failed receipt result) is already
an ancestor of origin/main d96eae98. No cherry-pick or prior worktree cleanup is needed.
Both locked installs succeeded; fork remains 91a6d443. Fresh script tests: 96/96; script types green.
Anonymous live fetches: / and /signin return 200 with auth-submit; /api/auth/ok returns 200 with
ok:true. These are HTTP evidence, not browser, visual, SSO or persistence acceptance.
verify-prod exits 2 for missing BA E2E credentials; deployment key and DeepSeek key unavailable.
No new deployment, UI score or product completion claimed. GitHub owns cadence; no local scheduler.

Independent cr Codex subscription review identified anonymous RPC/screenshot distinctions,
Access-JWT precedence, the hardcoded public auth-validation fetch and OS Worker origin isolation.
All four incorporated after inspection. Auth D1 identity comes from packages/auth/wrangler.jsonc;
zone/Access state remains documented context, not freshly probed policy evidence.
