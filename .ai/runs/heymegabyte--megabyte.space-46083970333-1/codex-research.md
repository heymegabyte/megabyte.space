# Cloudflare OS source review for fire-397

Official main advertised `062d82c4d38dbce1382045adb77064ec84bf085a`. An exact
Git fetch from the official remote and the GitHub comparison both yielded two
commits after `73919572`. Git counted 11 paths, all under
`packages/gatekeeper-google`, with 384 insertions and 73 deletions. The range
contains zero package-manifest, lockfile, Wrangler or release-file changes.

- `d1c2c5b9` adds on-demand Docs run decoding, a position-independent content
  identifier, and selected list lookup. An isolated rehearsal should compare
  moved runs under differing list context and preceding footnote counts. The
  caller supplies the first index and preceding footnote count to the decoder.
  Compare selective output with full-tab output and verify reader behavior after
  walk advancement and for an unreadable stored run.
- `062d82c4` makes the caller's wait interruptible during token acquisition and
  retry backoff. The token provider can still finish work after the caller
  aborts. Refused response-body cleanup is asynchronous. Gmail's opening
  timeout and the BigQuery picker probe rely on this common path. The upstream
  auth-retry tests cover initial, refreshed and reloaded token waits, retry
  pauses, and stalled or failed body cancellation. Rehearse cancellation with
  a shared mint and two callers, one aborting and the survivor completing.
  Verify the aborted caller sends no subsequent vendor request. Exercise a slow
  Gmail body after an on-time open and the BigQuery timeout through response parsing.

The wrapper gitlink remains `c3973908df0a7e6f0533497fcfa61f885e47f67a`.
GitHub main contained the previous wrapper compatibility repair at the start
of this run. Its historical run 46025408515 log reaches Workshop frontend
`tsc` and records errors starting in `AdminPage.tsx`, including unresolved
`AdminSettingsView`, followed by RPC contract errors such as missing
`listGadgets`. The retained log has no terminal exit receipt. This review
did not rebuild Workshop or run the upstream candidate fixtures.
