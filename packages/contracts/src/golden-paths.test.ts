import { describe, it, expect } from 'vitest'
import {
  GOLDEN_PATHS,
  GOLDEN_PATH_COUNT,
  goldenPathById,
  goldenPathsByCoverage,
  GoldenPathSchema,
} from './index'

describe('golden-path registry (GP-001…050)', () => {
  it('has exactly 50 paths', () => {
    expect(GOLDEN_PATH_COUNT).toBe(50)
  })

  it('every record validates against GoldenPathSchema', () => {
    for (const gp of GOLDEN_PATHS) {
      expect(GoldenPathSchema.safeParse(gp).success).toBe(true)
    }
  })

  it('ids are unique and sequential GP-001…GP-050', () => {
    const ids = GOLDEN_PATHS.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
    const expected = Array.from({ length: 50 }, (_, i) => `GP-${String(i + 1).padStart(3, '0')}`)
    expect(ids).toEqual(expected)
  })

  it('every path declares at least one product', () => {
    for (const gp of GOLDEN_PATHS) expect(gp.products.length).toBeGreaterThan(0)
  })

  it('goldenPathById resolves a known id and misses an unknown one', () => {
    expect(goldenPathById('GP-001')?.title).toMatch(/onboarding/i)
    expect(goldenPathById('GP-999')).toBeUndefined()
  })

  it('tracks coverage honestly — GP-046 (command palette) is the one partial instance', () => {
    const covered = goldenPathsByCoverage('covered')
    const partial = goldenPathsByCoverage('partial')
    expect(covered.length).toBe(0) // nothing fully covered yet
    expect(partial.map((g) => g.id)).toEqual(['GP-046'])
    expect(goldenPathById('GP-046')?.instance).toBe('scripts/journey-os-nav.mjs')
    // The vast majority are honestly pending until the factory is built.
    expect(goldenPathsByCoverage('pending').length).toBe(49)
  })
})
