# Validation of the published Cloudflare OS fork pin

The wrapper base `7ca157734763571a5ae9322e3756e17433a01ffd` pins
`c3973908df0a7e6f0533497fcfa61f885e47f67a`. The declared fork advertised
that SHA on `megabyte-os`. A clean checkout and an independent fetch by
SHA both succeeded. Official upstream main advertised
`73919572bc1e70c3b51c0b36627d81ef06f3c65e`, the candidate already recorded
in migration §45.

The fork Compare API reports 510 commits from the former pin `240899ec` and
returns 300 paths. The reviewed scope is the three files changed by the
tip commit relative to its parent `536fab1`, plus the workspace manifests
consumed at the pinned SHA.

## Frozen wrapper inputs

pnpm 11.17.0 rejected the root frozen install because
`@gadgets/error-reporting` now declares `@gadgets/scripts@workspace:*`.
The latter lives at `cloudflare-os/scripts`, outside the root workspace's
current package list. The pinned `@gadgets/workshop-shared` manifest also
adds dependencies and now reads `@cloudflare/workers-types` from the catalog.
The shared Cap'n Web catalog ranges are `^0.11.1` at the root and `^0.13.1`
in the fork. Workshop and wrapper can exchange RPC stubs, so verify the
resolved versions jointly before regenerating the root lockfile. Align
workspace membership and the required catalog entries, regenerate with
the pinned package manager, and run both frozen installs before
`pnpm check`. A full wrapper build did not start.

## Rolling backend upgrades

`SidebarWorkspaces` silently handles an asynchronous `TypeError` containing
`is not a function` and clears loading. `NotificationBridge` and
`UnreadStateBridge` return before logging or scheduling backoff when their
subscription rejects with the same matching error. The message substring
also matches failures thrown inside a supported method. Test those two
causes separately using the actual RPC transport so the test captures how
the error crosses that boundary.

Keep the frontend mounted while the backend changes versions. Check whether
the same API stub ever gets another subscription attempt, then exercise
stub replacement and visibility changes. Confirm the sidebar refreshes,
notification delivery resumes and unread state receives a fresh snapshot.
Include hidden native-badge views and ordinary transient failures. These
are source-review findings and outstanding acceptance checks.

The local deploy receipt still names `80b7209e`. Compare it with
authoritative per-Worker version and artifact evidence before drawing
conclusions about the currently deployed source.
