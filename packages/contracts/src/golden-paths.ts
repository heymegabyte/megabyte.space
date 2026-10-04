import { GoldenPathSchema, type GoldenPath } from './orchestration'

// The Golden-Path registry (master directive §84-134): GP-001…050 as machine-readable product
// contracts. Each raw entry is `GoldenPathSchema.parse`d at module load, so an invalid/duplicate id
// or bad coverage value fails fast at import (never ships a malformed registry). Detailed
// steps/assertions/evidence/cleanup are intentionally left empty until each path is actually
// implemented — the registry CATALOGS the 50 contracts + tracks coverage; it does not fabricate
// test steps we can't yet verify. `coverage` defaults to 'pending'; mark 'partial'/'covered' + an
// `instance` script only when a real test exercises the path.

const M = ['megabyte']
const PS = ['projectsites']

type RawGoldenPath = {
  id: string
  title: string
  products: string[]
  coverage?: 'pending' | 'partial' | 'covered'
  instance?: string
}

const RAW: RawGoldenPath[] = [
  { id: 'GP-001', title: 'First-time Megabyte onboarding', products: M },
  { id: 'GP-002', title: 'Workspace bootstrap', products: M },
  { id: 'GP-003', title: 'Connect three Claude identities', products: M },
  { id: 'GP-004', title: 'Connect Codex + DeepSeek + MiniMax', products: M },
  { id: 'GP-005', title: 'One prompt, multiple independent agents', products: M },
  { id: 'GP-006', title: 'Thirty-worker fan-out', products: M },
  { id: 'GP-007', title: 'Continuous slot refill', products: M },
  { id: 'GP-008', title: 'Quota-aware routing', products: M },
  { id: 'GP-009', title: 'Provider failure', products: M },
  { id: 'GP-010', title: 'Worker crash recovery', products: M },
  { id: 'GP-011', title: 'Client disconnect', products: M },
  { id: 'GP-012', title: 'Global loop / project loop', products: M },
  { id: 'GP-013', title: 'Pause / resume / cancel', products: M },
  { id: 'GP-014', title: 'GitHub worktree isolation', products: M },
  { id: 'GP-015', title: 'Conflicted integration', products: M },
  { id: 'GP-016', title: 'ProjectSites site creation', products: PS },
  { id: 'GP-017', title: 'ProjectSites full editing journey', products: PS },
  { id: 'GP-018', title: 'ProjectSites database journey', products: PS },
  { id: 'GP-019', title: 'Bucket journey', products: PS },
  { id: 'GP-020', title: 'KV journey', products: PS },
  { id: 'GP-021', title: 'Durable Object inspection', products: PS },
  { id: 'GP-022', title: 'Preview → Promote', products: PS },
  { id: 'GP-023', title: 'Production favicon change', products: PS },
  { id: 'GP-024', title: 'Repository slug rename', products: PS },
  { id: 'GP-025', title: 'GitHub ownership transfer', products: PS },
  { id: 'GP-026', title: 'MCP tool approval', products: M },
  { id: 'GP-027', title: 'Code Mode composed operation', products: M },
  { id: 'GP-028', title: 'MCP App', products: M },
  { id: 'GP-029', title: 'Whole-site crawl', products: M },
  { id: 'GP-030', title: 'DataForSEO + crawl research', products: M },
  { id: 'GP-031', title: 'Continuous knowledge update', products: M },
  { id: 'GP-032', title: 'Access revocation', products: M },
  { id: 'GP-033', title: 'A2UI approval', products: M },
  { id: 'GP-034', title: 'Browser Run visual repair loop', products: M },
  { id: 'GP-035', title: 'Responsive deep journey', products: PS },
  // Keyboard core (Tab/Enter/Escape/⌘K/focus-visible/no-trap) covered by journey-keyboard.mjs;
  // Shift+Tab / right-click / hover / drag / back-forward still pending → 'partial'.
  { id: 'GP-036', title: 'Keyboard / odd interactions', products: M, coverage: 'partial', instance: 'scripts/journey-keyboard.mjs' },
  { id: 'GP-037', title: 'Loading / failure states', products: M },
  { id: 'GP-038', title: 'Computer backend routing', products: M },
  { id: 'GP-039', title: 'Computer fallback', products: M },
  { id: 'GP-040', title: 'Browser human takeover', products: M },
  { id: 'GP-041', title: 'Secrets attack', products: M },
  { id: 'GP-042', title: 'Cross-tenant isolation', products: M },
  { id: 'GP-043', title: 'Duplicate event / idempotency', products: M },
  { id: 'GP-044', title: 'Reboot / process recovery', products: M },
  { id: 'GP-045', title: 'Race three implementations', products: M },
  // The ⌘K command palette opens everywhere + navigates cross-surface (fire-82/86); the
  // "run a goal from the palette" action-launch is still pending → 'partial'.
  { id: 'GP-046', title: 'Command palette', products: M, coverage: 'partial', instance: 'scripts/journey-os-nav.mjs' },
  { id: 'GP-047', title: 'Data natural language', products: M },
  { id: 'GP-048', title: 'Deployment rollback', products: ['megabyte', 'projectsites'] },
  { id: 'GP-049', title: 'Full autonomous project run', products: M },
  { id: 'GP-050', title: 'Global portfolio run', products: M },
]

/** All 50 golden paths, validated at module load (fail-fast on a malformed/duplicate entry). */
export const GOLDEN_PATHS: GoldenPath[] = RAW.map((r) => GoldenPathSchema.parse(r))

export const GOLDEN_PATH_COUNT = GOLDEN_PATHS.length

/** Look up a golden path by its `GP-###` id. */
export function goldenPathById(id: string): GoldenPath | undefined {
  return GOLDEN_PATHS.find((g) => g.id === id)
}

/** Golden paths filtered by coverage state — the loop's test-coverage ledger. */
export function goldenPathsByCoverage(coverage: GoldenPath['coverage']): GoldenPath[] {
  return GOLDEN_PATHS.filter((g) => g.coverage === coverage)
}
