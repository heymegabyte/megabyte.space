import { z } from 'zod'
import { IdSchema, IsoTimestampSchema, type Id } from './primitives'

// The workspace capability graph (§16), the WorkspaceRuntime data shapes (§14), and the
// CodingEngine session/event shapes (§24). The method INTERFACES below are intentionally the
// lifecycle core; the fuller file/git/port sub-type schemas land in WS-M3/M4 (the adapters that
// need them) — kept out of this first contract slice so it stays bounded + green.

/** A capability in the workspace graph (§16) — more important than the physical machine. */
export const CapabilityKindSchema = z.enum([
  'filesystem',
  'git',
  'shell',
  'browser',
  'database',
  'r2',
  'kv',
  'mcp',
  'workflow',
  'queue',
])
export type CapabilityKind = z.infer<typeof CapabilityKindSchema>

export const CapabilitySchema = z
  .object({
    kind: CapabilityKindSchema,
    /** A `scheme://path` capability URI, e.g. `filesystem://ws-abc` or `mcp://github`. */
    uri: z.string().regex(/^[a-z0-9-]+:\/\/.+/i, 'must be a scheme://path capability URI'),
    workspaceId: IdSchema.optional(),
  })
  .strict()
export type Capability = z.infer<typeof CapabilitySchema>

/** Which runtime backs a workspace (§14-15). Cloudflare Computer is preferred; others are adapters. */
export const WorkspaceBackendSchema = z.enum([
  'cloudflare-computer',
  'superset',
  'remote-linux',
  'local',
])
export type WorkspaceBackend = z.infer<typeof WorkspaceBackendSchema>

export const WorkspaceStatusSchema = z.enum([
  'provisioning',
  'ready',
  'running',
  'hibernated',
  'destroyed',
  'error',
])
export type WorkspaceStatus = z.infer<typeof WorkspaceStatusSchema>

export const WorkspaceSchema = z
  .object({
    id: IdSchema,
    repo: z.string().optional(),
    branch: z.string().optional(),
    backend: WorkspaceBackendSchema,
    status: WorkspaceStatusSchema,
    capabilities: z.array(CapabilitySchema).default([]),
    createdAt: IsoTimestampSchema,
  })
  .strict()
export type Workspace = z.infer<typeof WorkspaceSchema>

export const CodingSessionStatusSchema = z.enum([
  'starting',
  'running',
  'waiting-input',
  'done',
  'error',
  'cancelled',
])
export type CodingSessionStatus = z.infer<typeof CodingSessionStatusSchema>

export const CodingSessionSchema = z
  .object({
    id: IdSchema,
    workerId: IdSchema,
    workspaceId: IdSchema.optional(),
    status: CodingSessionStatusSchema,
    startedAt: IsoTimestampSchema,
  })
  .strict()
export type CodingSession = z.infer<typeof CodingSessionSchema>

/** One streamed event from a coding session (§24) — all adapters emit this shape. */
export const CodingEventKindSchema = z.enum([
  'message',
  'tool',
  'permission',
  'question',
  'diff',
  'error',
  'done',
])
export type CodingEventKind = z.infer<typeof CodingEventKindSchema>

export const CodingEventSchema = z
  .object({
    sessionId: IdSchema,
    kind: CodingEventKindSchema,
    at: IsoTimestampSchema,
    text: z.string().optional(),
  })
  .strict()
export type CodingEvent = z.infer<typeof CodingEventSchema>

// --- Method interfaces (type-only; reference the inferred data types above). ---

/** The runtime that owns code/files/shell/Git for a workspace (§14). Lifecycle core for WS-M1. */
export interface WorkspaceRuntime {
  createWorkspace(input: {
    repo?: string
    branch?: string
    backend: WorkspaceBackend
  }): Promise<Workspace>
  destroyWorkspace(id: Id): Promise<void>
  listWorkspaces(): Promise<Workspace[]>
  getCapabilities(id: Id): Promise<Capability[]>
}

/** A multi-model coding engine (§24). All adapters produce the same Megabyte CodingEvent stream. */
export interface CodingEngine {
  createSession(input: { workerId: Id; workspaceId?: Id }): Promise<CodingSession>
  stream(id: Id): AsyncIterable<CodingEvent>
  cancel(id: Id): Promise<void>
  getStatus(id: Id): Promise<CodingSession>
}
