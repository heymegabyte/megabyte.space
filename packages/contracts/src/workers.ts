import { z } from 'zod'
import { IdSchema, IsoTimestampSchema } from './primitives'

// The AI resource pool (master directive §19-21, §45) + the Connections fabric (§32, §45).

export const WorkerRuntimeSchema = z.enum(['claude-code', 'codex', 'opencode', 'cloudflare-agent'])
export type WorkerRuntime = z.infer<typeof WorkerRuntimeSchema>

export const WorkerAuthKindSchema = z.enum(['subscription', 'api', 'cloudflare', 'local'])
export type WorkerAuthKind = z.infer<typeof WorkerAuthKindSchema>

/**
 * A single AI worker in the pool (§20). `30 concurrent` = max active capacity, enforced at the
 * pool level, not here; a single worker's own concurrency is `maxParallel`.
 */
export const WorkerSchema = z
  .object({
    id: IdSchema,
    label: z.string().min(1),
    provider: z.string().min(1),
    accountId: IdSchema.optional(),
    model: z.string().optional(),
    runtime: WorkerRuntimeSchema,
    authKind: WorkerAuthKindSchema,
    specialties: z.array(z.string()).default([]),
    healthy: z.boolean(),
    enabled: z.boolean(),
    activeJobs: z.number().int().min(0),
    maxParallel: z.number().int().min(1),
    quotaRemaining: z.number().min(0).optional(),
    quotaResetAt: IsoTimestampSchema.optional(),
    costClass: z.string().optional(),
    speedClass: z.string().optional(),
    qualityClass: z.string().optional(),
    capabilities: z.array(z.string()).default([]),
  })
  .strict()
  .refine((w) => w.activeJobs <= w.maxParallel, {
    message: 'activeJobs cannot exceed the worker maxParallel',
  })
export type Worker = z.infer<typeof WorkerSchema>

/** The pool of workers + the global concurrency cap (§27 — 30 = max ACTIVE capacity). */
export const WorkerPoolSchema = z
  .object({
    workers: z.array(WorkerSchema),
    maxConcurrent: z.number().int().min(1),
  })
  .refine((p) => p.workers.reduce((n, w) => n + w.activeJobs, 0) <= p.maxConcurrent, {
    message: 'total activeJobs across the pool cannot exceed maxConcurrent',
  })
export type WorkerPool = z.infer<typeof WorkerPoolSchema>

// --- Connections fabric (§45): AI accounts, MCP servers, Git, databases, browsers, compute. ---

export const ConnectionKindSchema = z.enum([
  'ai-account',
  'mcp',
  'git',
  'database',
  'browser',
  'compute',
])
export type ConnectionKind = z.infer<typeof ConnectionKindSchema>

export const ConnectionStatusSchema = z.enum([
  'connected',
  'disconnected',
  'error',
  'reconnecting',
])
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>

/** A connected capability source shown in the unified Connections UX (§45). */
export const ConnectionSchema = z
  .object({
    id: IdSchema,
    kind: ConnectionKindSchema,
    label: z.string().min(1),
    provider: z.string().min(1),
    status: ConnectionStatusSchema,
    healthy: z.boolean(),
    scopes: z.array(z.string()).default([]),
    connectedAt: IsoTimestampSchema.optional(),
  })
  .strict()
export type Connection = z.infer<typeof ConnectionSchema>
