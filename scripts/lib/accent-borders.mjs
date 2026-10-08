/**
 * Prod regression net for the surfaceAccent row-border (cloudflare-os/packages/workshop-frontend/src/
 * surfaceAccent.ts). Counts the colored left-border accent classes that actually RENDER inside a
 * surface's row list, so a verifier can prove the attention rows — errors / warnings / a paused
 * consumer / a stale secret / a near-limit store — carry their border in PROD.
 *
 * WHY a prod net when the mapping is already unit-tested: the per-status → RowAccent mapping is proven
 * in surfaceAccent.test.ts + each surface's *.test.ts, but a CLASS NAME can silently drift (a rename) or
 * get purged by the Tailwind build and no unit test would catch it — only a live DOM read does. Shared
 * across all six accent surfaces (Logs / Domains / Queues / Compute / Secrets / Storage) so the net can't
 * drift per-verifier. The accent class sits on the row element itself (a flat <li>, e.g. logs/domains/
 * secrets) OR on a child <button> (master-detail, e.g. compute/storage/queues), so we count matches
 * anywhere in the section subtree. (fire-245.)
 */

/** The three attention-tier accent border classes (none/transparent is quiet and never counted). */
export const ACCENT_CLASSES = {
  danger: 'border-l-kumo-danger',
  warning: 'border-l-kumo-warning',
  muted: 'border-l-kumo-inactive',
}

/**
 * Count the rendered accent borders within `sectionSelector` (e.g. `section[aria-label="Workers"]`).
 * Returns `{ danger, warning, muted }`. Resolves to all-zero (never throws) if the section is absent,
 * so a verifier's own assertion — not an exception — reports the miss.
 */
export async function countAccentBorders(page, sectionSelector) {
  return page
    .evaluate(
      ({ sel, classes }) => {
        const root = document.querySelector(sel) || document.body
        const count = (cls) => root.querySelectorAll(`[class*="${cls}"]`).length
        return {
          danger: count(classes.danger),
          warning: count(classes.warning),
          muted: count(classes.muted),
        }
      },
      { sel: sectionSelector, classes: ACCENT_CLASSES },
    )
    .catch(() => ({ danger: 0, warning: 0, muted: 0 }))
}
