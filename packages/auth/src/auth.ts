import { betterAuth } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";

export interface Env {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
}

/**
 * Build the Better Auth instance for a request. Constructed per-request (cheap)
 * so the D1 binding from `env` is in scope. Native D1 (no Drizzle) keeps the
 * Worker bundle small; the schema is managed manually (see schema.sql). Geolocation
 * + IP detection are OFF for BA-1 so no per-request `cf` context is required.
 */
export function makeAuth(env: Env) {
  return betterAuth({
    ...withCloudflare(
      {
        d1Native: env.DB,
        autoDetectIpAddress: false,
        geolocationTracking: false,
      },
      {
        secret: env.BETTER_AUTH_SECRET,
        baseURL: env.BETTER_AUTH_URL,
        basePath: "/api/auth",
        // BA-1: email + password proves the rail end-to-end with no external
        // deps. Magic-link (SES) + Google/GitHub SSO land in BA-1b / BA-2.
        emailAndPassword: { enabled: true },
        trustedOrigins: ["https://megabyte.space"],
      },
    ),
  });
}
