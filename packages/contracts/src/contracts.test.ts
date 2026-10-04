import { describe, it, expect } from 'vitest'
import {
  IdSchema,
  IsoTimestampSchema,
  RiskClassSchema,
  WorkerSchema,
  WorkerPoolSchema,
  ConnectionSchema,
  CapabilitySchema,
  WorkspaceSchema,
  CodingSessionSchema,
  CodingEventSchema,
  TaskSchema,
  RunSchema,
  LoopSchema,
  EvidenceSchema,
  GoldenPathSchema,
  type Worker,
  type GoldenPath,
} from './index'

const NOW = '2026-10-03T00:00:00.000Z'

const worker = (over: Record<string, unknown> = {}) => ({
  id: 'w1',
  label: 'Claude Max A',
  provider: 'anthropic',
  runtime: 'claude-code',
  authKind: 'subscription',
  healthy: true,
  enabled: true,
  activeJobs: 1,
  maxParallel: 3,
  ...over,
})

describe('primitives', () => {
  it('IdSchema rejects empty, accepts non-empty', () => {
    expect(IdSchema.safeParse('').success).toBe(false)
    expect(IdSchema.parse('abc')).toBe('abc')
  })
  it('IsoTimestampSchema accepts ISO, rejects garbage', () => {
    expect(IsoTimestampSchema.parse(NOW)).toBe(NOW)
    expect(IsoTimestampSchema.safeParse('not-a-date').success).toBe(false)
  })
  it('RiskClassSchema is the 4-tier gate', () => {
    expect(RiskClassSchema.parse('approval-required')).toBe('approval-required')
    expect(RiskClassSchema.safeParse('whatever').success).toBe(false)
  })
})

describe('workers + pool', () => {
  it('parses a valid worker and applies array defaults', () => {
    const w = WorkerSchema.parse(worker())
    expect(w.specialties).toEqual([])
    expect(w.capabilities).toEqual([])
  })
  it('rejects activeJobs > maxParallel (refine invariant)', () => {
    expect(WorkerSchema.safeParse(worker({ activeJobs: 5, maxParallel: 2 })).success).toBe(false)
  })
  it('rejects unknown keys (strict)', () => {
    expect(WorkerSchema.safeParse(worker({ rogue: true })).success).toBe(false)
  })
  it('rejects an invalid runtime enum', () => {
    expect(WorkerSchema.safeParse(worker({ runtime: 'ollama' })).success).toBe(false)
  })
  it('pool rejects when total activeJobs exceeds maxConcurrent', () => {
    const w = worker({ activeJobs: 3, maxParallel: 3 })
    expect(WorkerPoolSchema.safeParse({ workers: [w, w], maxConcurrent: 5 }).success).toBe(false)
    expect(WorkerPoolSchema.safeParse({ workers: [w], maxConcurrent: 5 }).success).toBe(true)
  })
})

describe('connections', () => {
  it('parses a valid ai-account connection', () => {
    const c = ConnectionSchema.parse({
      id: 'c1',
      kind: 'ai-account',
      label: 'Claude Max A',
      provider: 'anthropic',
      status: 'connected',
      healthy: true,
    })
    expect(c.scopes).toEqual([])
  })
  it('rejects an invalid kind', () => {
    expect(
      ConnectionSchema.safeParse({
        id: 'c1',
        kind: 'blockchain',
        label: 'x',
        provider: 'y',
        status: 'connected',
        healthy: true,
      }).success,
    ).toBe(false)
  })
})

describe('runtime: capability / workspace / coding session', () => {
  it('capability requires a scheme://path uri', () => {
    expect(CapabilitySchema.parse({ kind: 'mcp', uri: 'mcp://github' }).uri).toBe('mcp://github')
    expect(CapabilitySchema.safeParse({ kind: 'mcp', uri: 'github' }).success).toBe(false)
  })
  it('workspace parses with a backend + status enum', () => {
    const ws = WorkspaceSchema.parse({ id: 'ws1', backend: 'cloudflare-computer', status: 'ready', createdAt: NOW })
    expect(ws.capabilities).toEqual([])
    expect(WorkspaceSchema.safeParse({ id: 'ws1', backend: 'daytona', status: 'ready', createdAt: NOW }).success).toBe(false)
  })
  it('coding session + event enums', () => {
    expect(CodingSessionSchema.parse({ id: 's1', workerId: 'w1', status: 'running', startedAt: NOW }).status).toBe('running')
    expect(CodingEventSchema.safeParse({ sessionId: 's1', kind: 'nope', at: NOW }).success).toBe(false)
  })
})

describe('orchestration: task / run / loop / evidence', () => {
  it('task applies defaults (riskClass autonomous, status queued)', () => {
    const t = TaskSchema.parse({ id: 't1', goal: 'ship WS-M1' })
    expect(t.riskClass).toBe('autonomous')
    expect(t.status).toBe('queued')
    expect(t.dependencies).toEqual([])
  })
  it('run defaults to planning', () => {
    expect(RunSchema.parse({ id: 'r1', goal: 'g', startedAt: NOW }).status).toBe('planning')
  })
  it('loop enforces recursion-safety caps (§75)', () => {
    expect(LoopSchema.parse({ loopId: 'l1', projectId: 'p1', goal: 'g' }).maxIterations).toBe(30)
    expect(LoopSchema.safeParse({ loopId: 'l1', projectId: 'p1', goal: 'g', iteration: 40, maxIterations: 30 }).success).toBe(false)
    expect(LoopSchema.safeParse({ loopId: 'l1', projectId: 'p1', goal: 'g', depth: 9, maxDepth: 5 }).success).toBe(false)
  })
  it('evidence defaults cleanupVerified false', () => {
    expect(EvidenceSchema.parse({ at: NOW }).cleanupVerified).toBe(false)
  })
})

describe('golden path registry', () => {
  it('requires a GP-### id', () => {
    const gp: GoldenPath = GoldenPathSchema.parse({ id: 'GP-001', title: 'First-time onboarding' })
    expect(gp.id).toBe('GP-001')
    expect(GoldenPathSchema.safeParse({ id: 'onboarding', title: 'x' }).success).toBe(false)
  })
})

describe('inferred types compile', () => {
  it('z.infer<Worker> is usable as a typed value', () => {
    const w: Worker = WorkerSchema.parse(worker())
    expect(w.runtime).toBe('claude-code')
  })
})
