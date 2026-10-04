import { z } from 'zod'

// Shared primitive schemas for every platform contract. Kept cross-zod-version-safe (no
// z.iso.datetime / z.string().datetime() which moved between v3 and v4) so the kernel compiles
// against whichever zod the consuming package pins.

/** A non-empty opaque identifier. UUIDv7 by convention (per uuid-version-discipline) but not enforced here. */
export const IdSchema = z.string().min(1)
export type Id = z.infer<typeof IdSchema>

/** An ISO-8601 timestamp string (parseable by Date). */
export const IsoTimestampSchema = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'must be an ISO-8601 timestamp' })
export type IsoTimestamp = z.infer<typeof IsoTimestampSchema>

/** A non-negative USD amount (AI inference / infra cost). */
export const UsdSchema = z.number().min(0)
export type Usd = z.infer<typeof UsdSchema>

/** Action/task risk tier — mirrors autonomous-engineering's 4-tier approval gate. */
export const RiskClassSchema = z.enum([
  'autonomous',
  'review-recommended',
  'approval-required',
  'blocked',
])
export type RiskClass = z.infer<typeof RiskClassSchema>
