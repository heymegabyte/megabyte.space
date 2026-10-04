import { z } from 'zod'
import { IdSchema, IsoTimestampSchema, RiskClassSchema } from './primitives'

// The durable orchestration primitives (§28 Task, §74 Loop, Run), the evidence gate (§82, §136),
// and the Golden-Path registry (§84). These back the Foreman → Inngest → workers lifecycle.

export const TaskStatusSchema = z.enum([
  'queued',
  'ready',
  'running',
  'blocked',
  'review',
  'done',
  'failed',
  'cancelled',
])
export type TaskStatus = z.infer<typeof TaskStatusSchema>

/** One unit of assignable work (§28) — every assignment carries goal + acceptance + deps + risk. */
export const TaskSchema = z
  .object({
    id: IdSchema,
    goal: z.string().min(1),
    acceptance: z.array(z.string()).default([]),
    workspaceId: IdSchema.optional(),
    branch: z.string().optional(),
    workerId: IdSchema.optional(),
    dependencies: z.array(IdSchema).default([]),
    requiredTests: z.array(z.string()).default([]),
    requiredReviewers: z.array(z.string()).default([]),
    riskClass: RiskClassSchema.default('autonomous'),
    status: TaskStatusSchema.default('queued'),
  })
  .strict()
export type Task = z.infer<typeof TaskSchema>

export const RunStatusSchema = z.enum(['planning', 'running', 'paused', 'done', 'failed', 'cancelled'])
export type RunStatus = z.infer<typeof RunStatusSchema>

/** A goal-scoped run that fans out into tasks. */
export const RunSchema = z
  .object({
    id: IdSchema,
    goal: z.string().min(1),
    taskIds: z.array(IdSchema).default([]),
    status: RunStatusSchema.default('planning'),
    startedAt: IsoTimestampSchema,
  })
  .strict()
export type Run = z.infer<typeof RunSchema>

export const LoopStatusSchema = z.enum(['idle', 'running', 'paused', 'converged', 'failed'])
export type LoopStatus = z.infer<typeof LoopStatusSchema>

/**
 * A durable, recursion-safe loop (§74-75). Default caps (30 iterations / depth 5) encode the
 * recursion-safety bound (§75); the refinements make an over-cap loop unrepresentable.
 */
export const LoopSchema = z
  .object({
    loopId: IdSchema,
    parentLoopId: IdSchema.optional(),
    projectId: IdSchema,
    goal: z.string().min(1),
    iteration: z.number().int().min(0).default(0),
    depth: z.number().int().min(0).default(0),
    maxIterations: z.number().int().min(1).default(30),
    maxDepth: z.number().int().min(1).default(5),
    status: LoopStatusSchema.default('idle'),
  })
  .strict()
  .refine((l) => l.iteration <= l.maxIterations, { message: 'iteration cannot exceed maxIterations' })
  .refine((l) => l.depth <= l.maxDepth, { message: 'depth cannot exceed maxDepth' })
export type Loop = z.infer<typeof LoopSchema>

/** The evidence a run/task must produce (§82, §136) — screenshot alone is insufficient. */
export const EvidenceSchema = z
  .object({
    runId: IdSchema.optional(),
    taskId: IdSchema.optional(),
    route: z.string().optional(),
    screenshots: z.array(z.string()).default([]),
    consoleErrors: z.array(z.string()).default([]),
    assertions: z.array(z.object({ label: z.string(), ok: z.boolean() }).strict()).default([]),
    createdResourceIds: z.array(IdSchema).default([]),
    cleanupVerified: z.boolean().default(false),
    at: IsoTimestampSchema,
  })
  .strict()
export type Evidence = z.infer<typeof EvidenceSchema>

// --- Golden-Path registry (§84): product contracts GP-001…050. ---

export const GoldenStepSchema = z
  .object({ action: z.string().min(1), target: z.string().optional() })
  .strict()
export type GoldenStep = z.infer<typeof GoldenStepSchema>

export const GoldenAssertionSchema = z
  .object({
    label: z.string().min(1),
    kind: z.enum(['url', 'visible', 'backend', 'console', 'network']),
  })
  .strict()
export type GoldenAssertion = z.infer<typeof GoldenAssertionSchema>

export const GoldenPathSchema = z
  .object({
    id: z.string().regex(/^GP-\d{3}$/, 'id must look like GP-001'),
    title: z.string().min(1),
    products: z.array(z.string()).default([]),
    prerequisites: z.array(z.string()).default([]),
    steps: z.array(GoldenStepSchema).default([]),
    assertions: z.array(GoldenAssertionSchema).default([]),
    evidence: z.array(z.string()).default([]),
    cleanup: z.array(z.string()).default([]),
  })
  .strict()
export type GoldenPath = z.infer<typeof GoldenPathSchema>
