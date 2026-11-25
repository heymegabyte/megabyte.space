# Worker bundle and source-map review

Official main advanced from `b355717f` to `73919572bc1e70c3b51c0b36627d81ef06f3c65e`.
GitHub's comparison reports seven commits and caps the file list at 300. The
official releases endpoint returned an empty list. This review covers the
bundling change in [#1284](https://github.com/cloudflare/cloudflare-os/commit/559bfd5133838e47182e649d995b84e9c26d0ba5).
The other six commits cover attachment limits and storage warnings, the
Gatekeeper simulation store, action-file streaming, Docs table edits and
simulation, image file results, and Sheets/Slides simulation.

- Official `scripts/worker-config.ts` sets `minify` and `upload_source_maps`
  for generated Wrangler configs. The release builder separately scans ESM
  modules for characters above U+00FF that can widen V8's source storage.
  Text modules are outside that check. Legal comments and regular expression
  literals can survive minification and trigger the release rejection.
- Official `scripts/release/AGENTS.md` records that the release collector
  drops `.map` files. To recover a release stack, rebuild with the exact
  inputs and compare the emitted module SHA-256 with the manifest before
  using the reconstructed map. A preview build using Wrangler's upload
  option has a different delivery path.
- The starter's `scripts/deploy.ts` reads each base Wrangler config and
  overlays deployment values before invoking Wrangler. The six named base
  configs include two wrapper-owned files, for the custom Gatekeeper and
  optional error reporter. Extra Gatekeepers also get separate generated
  configs. Verify the final options for each affected Worker and run the
  release ESM scan separately when assessing the official release path.
- An isolated deployment rehearsal should capture the effective config,
  artifact digests, map delivery and observed Worker version. Symbolicate
  a known benign error against that version. If rebuilding a map, require
  a matching module digest before interpreting any stack positions.
