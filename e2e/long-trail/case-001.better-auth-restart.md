# Case 001 — Better Auth restart, revision 2

Prepared fire-292 (2026-10-09) against pinned fork `91a6d443`. **Plan only; no browser action executed.**

- **caseId:** case-001
- **planRevision:** 2
- **status:** blocked — approved `BA_E2E_EMAIL` / `BA_E2E_PASSWORD` unavailable
- **lastCompletedAction:** 0 (revision 2 only)
- **lease:** unclaimed; claim at execution with actual run ID, `ltt-case-001-` resource prefix and fresh heartbeat. Do not overwrite the historical revision-1 lease merely to prepare this plan.
- **Historical evidence:** [revision 1](case-001.estate-path.md) retains action 26 and pending 8/12/24. Those hero/hover/timeline checks are retired-surface evidence, not mapped to this new plan or marked passed. Re-run only if the marketing surface is actually restored.

## Execution and evidence contract

Current apex anonymous HTML renders inline Better Auth login; `/signin` is a supported entry route.
The old apex→os→Access OTP flow, analytics endpoint and health/CSP expectations are not acceptance
assertions for this revision. The authoritative request boundaries are in
[ARCHITECTURE.md](../../.claude/run-the-loop/ARCHITECTURE.md). No auth-policy or killswitch changes.

Use approved test credentials through the broker without logging values. Require an authorized,
recoverable test gadget, opportunity and connection fixture; never rename arbitrary user data.
Read the current source/deployed revision before execution. The pin is preparation context, not live
publication evidence. Browser provider/session and deployment revision remain unknown until observed.
Use local Playwright Chromium as an honestly recorded fallback when the preferred provider is unavailable;
no Browser Harness, local AI Gateway compute or paid OpenAI/Anthropic fallback.

After the first load, use real UI/keyboard/history and explicit same-route reloads only. Each numbered
row is an evidence checkpoint, not a claim that inspection alone is a UI action. Count actual clicks,
keystrokes and navigations separately; add bounded actions when needed to meet the long-trail bar.
Capture every meaningful view at `e2e/screenshots/case-001/r2/<run-id>/NN-state.png`, with state key,
breadcrumb, previous state, actual action count, console errors and failed requests. Capture screenshots
before secret entry or redact fields. Never save credentials, cookies, authorization headers or private
request bodies. Report unexpected console errors/failed requests immediately, including auth transients;
expected failures require a narrowly documented reason. Perform axe at meaningful transitions and a real
vision review via an authorized provider; missing vision access blocks visual acceptance, never invent a score.

Fixtures missing → blocked/skipped **interaction coverage**, not passed mutations. A changed `aria-sort`
alone is not sorting proof. A rendered sample panel is not durable data proof. Require successful
fresh authenticated backend reads tied to the fixture identity; independent reauthentication excludes
browser cache/localStorage as the persistence explanation. Preserve mutation IDs/original values in
private sanitized cleanup records; execute restoration in finally even on failed assertions, and
report failed restoration as unresolved before another run touches the same resource.

Use `journey-deep.mjs`, `journey-os-nav.mjs`, `verify-gadget-rename.mjs` and `verify-pulse-persist.mjs`
as selector/behavior references only. Their direct route loads, swallowed waits, synthetic events,
empty-fixture shortcuts and limited screenshots do not fulfill this case automatically.
When a defect appears: retain RED evidence → targeted regression → fix → GREEN → replay the exact
breadcrumb → continue. No deliberate destructive error or external email/SMS is part of this plan.

## Restart checkpoints (60)

1. Open a fresh anonymous context at `https://megabyte.space` (the sole initial navigation); expect the inline login gate, not the retired marketing hero.
2. Inspect the settled login view; capture email/password controls, provider buttons and visible errors without recording secrets.
3. Tab through the login controls; require visible focus and logical order.
4. Use Shift+Tab to revisit the preceding control; verify focus remains visible.
5. Resize to 390×844; require all login controls reachable and no horizontal overflow.
6. Restore 1440×900; require the form remains usable.
7. Enable reduced motion; inspect the login view for usable static content.
8. Return to the original motion preference; capture the resulting view.
9. Fill the approved test account email using `input[type="email"]`; redact it in artifacts.
10. Fill its password using `input[type="password"]`; never capture the field value or request body.
11. Click `[data-testid="auth-submit"]`; require successful sign-in or a named failure, never swallow a timeout.
12. Wait for the application’s own redirect to `/`; capture the authenticated landing splash and click its visible `Enter the OS` button. Require visible `aside`, user identity and a successful authenticated backend operation. Use an already-onboarded test account; an onboarding wizard blocks this plan pending a separately grounded UI leg. A cookie or HTTP 200 alone is insufficient.
13. Inspect the settled shell; record visible rail labels and a sanitized state key.
14. Click sidebar Pulse; require `/pulse` and loaded cards or an honest settled empty state.
15. Expand a card’s Why disclosure; require its explanation. If no card exists, record this action as fixture-blocked.
16. Collapse that disclosure; require its collapsed state.
17. Open the command palette using the platform keyboard shortcut; require the visible Command palette dialog. Do not dispatch synthetic application events.
18. Fill the palette input with `connections`; require a matching result.
19. Click the matching result; require `/connections`, loaded table or an honest empty/error state.
20. Record connection row identities and current order from data rows, excluding colspan empty-state rows.
21. Fill `[role="searchbox"]` with a run-specific unmatched value; require zero data rows and visible empty-result feedback.
22. Clear the search; require the exact baseline identities restored.
23. Click a sortable table header; require `aria-sort` AND the corresponding actual row ordering. Fewer than two distinguishable rows blocks ordering coverage.
24. Click that header again; require the reversed comparator order for the same identities.
25. Click a `Manage in …` link for a test-owned connection; require its provider or gatekeeper page. Missing links are fixture-blocked, never a passed interaction.
26. Use browser Back; require Connections and restored loaded content.
27. Use browser Forward; require the same management route and content.
28. Open the command palette by keyboard from that management page; require the dialog.
29. Fill its input with `gadgets`; require a Gadgets result.
30. Click Gadgets; require `/gadgets` and loaded data rows.
31. Record a dedicated test gadget’s stable identity and original title; confirm the test account owns it. No dedicated fixture means the mutation leg is blocked.
32. Search for that gadget; require the exact stable identity, not an arbitrary first row.
33. Click the selected row’s Rename button; require its inline Rename textbox.
34. Fill a unique `ltt-case-001-<run-suffix>` title; record the intended change in the private cleanup record.
35. Press Enter; require that same identity displays the new title and the authenticated mutation succeeds.
36. Hard reload the current route; require the renamed identity/title after a fresh backend read. Record server-read evidence, not only optimistic DOM state.
37. Open Rename on that same identity; require the textbox.
38. Fill its original title; require the intended restoration value.
39. Press Enter; require the original title restored for the same identity.
40. Hard reload; require the original title from a fresh backend read and mark cleanup verified.
41. Clear the gadget search; require the loaded list.
42. Click the test gadget’s `Open …` link; require its focused workspace/editor and meaningful content.
43. Inspect its non-mutating workspace controls and settled editor; no agent prompt, compute launch or external message is authorized by this plan.
44. Use browser Back to the shell; require Gadgets with the same restored title.
45. Click sidebar Pulse; require loaded cards or a named empty/error state.
46. Record one test-owned opportunity’s stable identity and baseline state; require a fixture before mutation. Empty all-clear is valid UI but blocks this leg.
47. Click that opportunity’s Dismiss; require it removed and `[data-testid="pulse-undo-dismiss"]` visible. Keep context A alive without reload so Undo remains available.
48. In independent context B, start at apex, sign in through the same UI and click the visible `Enter the OS` splash button; require a fresh authenticated shell for the already-onboarded test account, with no copied storage/cookies or synthetic splash bypass.
49. In B, click sidebar Pulse; require that exact opportunity absent after an authenticated fresh server read. This is persistence evidence, not a localStorage check.
50. In A, click Undo; require the original opportunity restored. Cleanup must also run in finally if any earlier assertion fails.
51. Hard reload A; require that identity restored from the backend and mark cleanup verified.
52. Click a test opportunity’s Snooze control; require it hidden and Undo visible; record the identity for guaranteed cleanup.
53. Click Undo; require that same opportunity restored; verify restored server state before leaving the surface.
54. Record current theme label and stored preference; click `button[aria-label^="Theme:"]`; require a changed preference/label. System→light may retain the same resolved mode; inspect the complete cycle for both light and dark states without treating that as a failure.
55. Hard reload; require the selected theme preference persists (local preference evidence, not server mutation).
56. Use the theme button until the original preference is restored; verify label and stored preference.
57. Resize the authenticated shell to 390×844; exercise its reachable menu/navigation and require no horizontal overflow.
58. Restore desktop size; navigate by keyboard to a known rail destination and require visible focus and meaningful content.
59. Enable reduced motion and reload the current known route; require usable settled content and no unexpected animation; restore original preference.
60. Close context B, verify all recorded mutation baselines and cleanup states, then close A; reconcile screenshots, console/request evidence, skipped/blocked actions and the revision cursor. Mark done only if all acceptance gates pass.

## Resume and acceptance

Checkpoint revision 2 separately after each observed action, retaining per-action status and evidence
links; a highest-number cursor never fills earlier holes. Refresh the actual execution lease after each
meaningful step. Interrupted cleanup takes priority over advancing coverage. Fresh contexts must repeat
authentication and shell gates; do not reuse the historical service-token checkpoint as identity proof.

Acceptance remains open: 60–100 actual actions across at least six meaningful surfaces/states, screenshot
and real vision coverage, zero unexpected console errors, axe gates, backend persistence and verified
restoration. Real Google/GitHub OAuth login is a separate acceptance leg, not proven by password sign-in.
Unknown-route status testing belongs to the dedicated route verifier; do not invent a visible navigation
link to reach it here. No action, screenshot, production success or beautify increment is credited by
preparing this document.
