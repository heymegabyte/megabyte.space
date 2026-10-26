# Paperclip Absorption — feature decomposition (loop: "Absorb the features of Paperclip (swarml.ink)")

Source: **Paperclip** (`github.com/PaperclipAI/paperclip`, MIT, self-host) — the agent-fleet
*management/governance plane*. Live estate instance: **swarml.ink** (up, dynamic, Access-fronted).
Much of Paperclip's ORCHESTRATION feature set is already absorbed into our **doctrine**
(`~/.agentskills/rules/paperclip-openclaw-fleet-doctrine.md`) and is Paperclip's *own* job (we RUN
it). So "absorb into megabyte.space" = make the OS **product surfaces** reflect Paperclip-style
governance. The prime surface is the **Approval Inbox** (`inbox.megabyte.space`) — the estate's
human-oversight queue. Drain policy: one verified slice per fire (per `split-work-into-ledger`).

## Paperclip's feature model (what we're absorbing)
Cases/task assignment · org chart + roles · per-agent/per-project **budgets + cost tracking** ·
**approval / review gates** · **watchdog escalation** of stalls · scheduled **routines** · heartbeats ·
the GitHub-issue → assign → **verify** (checks it didn't write pass) → merge pipeline · blocked-by
sequencing · priority triage.

## OS absorption slices (ranked; ✅ shipped · ⏸ queued · dedicated)
| # | Slice (Paperclip feature → OS) | Status |
|---|---|---|
| 1 | **Governance summary + watchdog escalation** on the Approval Inbox — a "needs-you" dashboard (awaiting · ready · drafts · stalled>14d chips) + an escalation banner when items stall. | ✅ SHIPPED (`a738785f`) — verified: "30 awaiting · 29 ready · 1 draft" + stalled chip + escalate banner; CSP intact. |
| 2 | **Cases = issues, not just PRs** — include org issues labeled `needs-approval`/`needs-decision`/`blocked` as approval cards (Paperclip cases span issues). Extend the search query + render issue cards. | ⏸ queued (clean — bounded fetch+render extension). |
| 3 | **Priority triage sort** — sort/badge cards by a priority label (`p0`/`urgent`/…), Paperclip's triage ordering. Cheap, label-based (data already fetched). | ⏸ queued (clean). |
| 4 | **Blocked-by surfacing** — a `blocked`-label section + the blocker reference (Paperclip's `blockedByIssueIds`). Partially derivable from labels. | ⏸ queued (clean). |
| 5 | **Verify gate (CI + review state)** — per-PR `statusCheckRollup` + `reviewDecision` ("ready to approve" vs "checks failing / review required") — Paperclip's core done-criteria. Needs a GraphQL rewrite of the fetch (one call for all PRs incl. checks+review). | dedicated. |
| 6 | **Assignee / reviewer (org chart)** — show each case's assignee + requested reviewers (who owns it). GraphQL / per-PR detail. | dedicated. |
| 7 | **In-surface approval ACTIONS** — approve / request-changes / merge buttons (Paperclip's one-click gate). Needs GITHUB_TOKEN **write** + CSRF + confirm — careful. | dedicated (write auth). |
| 8 | **Per-project cost/budget strip** — Paperclip tracks per-agent/per-project cost. Needs a cost feed (clawo runs / gateway usage-cost) — not in GitHub data. | dedicated (needs cost feed). |
| 9 | **Routines status** — surface the estate's scheduled routines/crons (fleet-health, triage) + last-run. Needs a routines feed. | dedicated (needs feed). |

## Notes
- The inbox is Access-gated (confirmed via CF Browser Run 2026-10-26) + CSP-hardened + rate-limited is N/A
  (it's a read surface; no LLM/abuse path). Slices 2–4 are clean single-worker edits using the existing
  GitHub search; 5–9 need a richer data source (GraphQL / cost / routines feed) → dedicated sessions.
- Fire log: slice #1 shipped 2026-10-26 (`a738785f`).
