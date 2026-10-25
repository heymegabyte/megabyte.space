## fire-316 — recover provenance guard after publication conflict (2026-10-25)

- Slice `c307433a`: recovered missing implementation from retained `7fe32d3c`; direct file comparison and red regression prove main lacked the fix. Failed result `baa0faf5` is not an ancestor of fetched main. Four inspected retained worktrees are clean and untouched.
- Provenance regression failed before recovery (actual 0, expected 1); after recovery 21/21 tests passed. Fire-commit/bookkeeping tests 27/27 passed; independent reviewer reported no blocking findings and separately passed the provenance suite.
- Unchanged fork bb88b90e fetched from declared remote. Official upstream advertised bd10b0ec only; no candidate range review or adoption credited.
- Deployment not attempted: receipt still 80b7209e versus committed bb88b90e; actual live version unverified. No authenticated journey, storage reconciliation, full app build or visual pass; modifier scores unchanged. Migration acceptance remains open.
- Loop improvement: restored replacement-ref bypass protection lost to publication conflict. Next: verify outer publication; inventory live Worker versions; review complete intervening official upstream range. GitHub owns cadence; no watchdog or schedules changed.
