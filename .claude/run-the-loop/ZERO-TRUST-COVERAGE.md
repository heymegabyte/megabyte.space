# Zero-Trust coverage audit (estate idea #12)

Audited 2026-10-26 via the CF Access API (`GET /accounts/{acct}/access/apps`, policy *decisions*, so
it's independent of whether the audit host is WARP-enrolled). **51 Access apps.** Conclusion:
**coverage is comprehensive — no internal admin tool is unintentionally wide-open.**

## Posture

- **Default-deny catch-all:** `*.megabyte.space` **Base App SSO** carries an `allow` policy (SSO
  required) over the whole wildcard. So any `*.megabyte.space` host WITHOUT a more-specific `bypass`
  is SSO-gated by default — including services with no app of their own (coolify, grafana, postiz,
  wordpress, blog).
- **Per-service apps (granular `allow`, some + `non_identity` service-token):** docker, monitor,
  media, comfy, llm, nocodb, metabase/bi, rowy, logstash, changedetection, opnsense, pbs, pulse,
  openclaw, the SSH apps (proxmox/coolify/ubuntu), os.megabyte.space, + the internal random-hostname
  variants. These refine the wildcard; they don't weaken it.
- **Intentional public surfaces = explicit `bypass` (by design, not a gap):**
  - `authentik.megabyte.space` — the IdP itself (must be reachable to authenticate).
  - `*.megabyte.space/api*`, `traces.projectsites.dev/api/public`, `llm.megabyte.space/v1`,
    `oneprompt.site/v1` — programmatic APIs, each key/master-key gated at the app layer.
  - Public product surfaces: `sites`/`sites-staging`/`bolt`.megabyte.space, `instantidle.com`, etc.

## Internal-service coverage

| Service | Host | Gating |
|---|---|---|
| Dozzle / Beszel / Immich / ComfyUI / LiteLLM | docker/monitor/media/comfy/llm.megabyte.space | ✅ own Access app (`allow`) |
| NocoDB | nocodb.megabyte.space | ✅ own app (`allow`,`non_identity`) |
| Coolify PaaS panel | coolify.megabyte.space | ✅ wildcard `*.megabyte.space` SSO (no bypass) |
| Grafana | grafana.megabyte.space | ✅ wildcard SSO |
| Postiz | postiz.megabyte.space | ✅ wildcard SSO |
| WordPress / blog | wordpress/blog.megabyte.space | ✅ wildcard SSO (+ app-level login) |
| Authentik (IdP) | authentik.megabyte.space | ⚪ public by design (`bypass`) |
| Healthchecks | health.megabyte.space | ⚪ public by design (app auth + cron ping endpoints must be reachable) — see follow-up |

## Follow-ups (the rest of #12)

1. **Deny-path verification (un-WARP'd).** The audit host is WARP-enrolled, so an unauthenticated
   `curl` can't prove the wildcard actually DENIES an outside visitor. Confirm via a **Cloudflare
   Browser Run** request (no WARP, no Access cookie) that coolify/grafana/postiz 302 to
   `*.cloudflareaccess.com`, and that health.megabyte.space's `/ping/*` path is intentionally
   reachable while its UI/login posture is as intended.
2. **Secret-rotation calendar.** Build `~/.claude/rules/secret-rotation-calendar.md` entries for the
   load-bearing secrets (CF global key, Coolify token, SES, Healthchecks, DeepSeek) on a ≤90-day
   cadence (`vendor-risk-tiering` / `secret-provisioning`).
3. **No-key-leak check.** Confirm no `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` leaks into agent-fleet envs
   (`scripts/check-provider-policy.mjs`).

_No Access policy was mutated — coverage analysis found nothing wide-open to close. Fabricating a
change would be churn; the value here is the verified posture + the deny-path follow-up._
