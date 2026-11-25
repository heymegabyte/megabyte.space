# Official Cloudflare OS attachment and storage review

GitHub's comparison of `266dffed..b355717f54c7c35a360107a8bee64976da7fc3c8`
reported six commits and 52 changed paths, below the comparison file cap. Source
review focused on the attachment/quotas increment (#1230), with the other five
changes inventoried for follow-up. This was a comparison of official sources,
separate from checkout and build verification of the starter's existing fork.

- Workspace Git storage, chat attachment admission, model request replay, and
  client history hydration enforce different limits. The storage limit is 100 MiB
  per attachment. Model image/PDF replay sets 7 MiB per item, 10 MiB per message,
  20 MiB and 20 items per request, and a 30 MiB replay-read ceiling. Client history
  hydration separately uses an 8 MiB inline page budget. Acceptance must measure
  each boundary separately.
- A first failed request with HTTP 400/413 can record all eligible unanswered
  attachment IDs for workspace-path fallback on retry. Compare provider-neutral
  admission and retry with the attachment still reachable, and verify what happens
  when a 400 has a cause unrelated to the attachments.
- Storage warnings start at 7 GB of SQLite usage. Projected large-file admission
  guards 8 GB and new agent turns stop at 9.5 GB. Rehearse streamed writes
  concurrently near quota, verify cancelled or rejected uploads against durable
  storage, and confirm a refused turn can still persist its error.
- The five other changes cover model catalog visibility, current-epoch chat rows,
  display-row cleanup after context construction, pinned worktree reads in generated
  views, and protected-resource list ordering and deduplication. Those changes
  remain open for review.

Decision: backlog exact-candidate rehearsal. Production, provider and browser
acceptance remain open.
