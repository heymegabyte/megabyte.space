// For `@better-auth/cli generate` ONLY (Node). Schema introspection reads the
// configured plugins/options, not a live DB — so a stub d1Native is fine here.
// NEVER imported by the Worker (worker.ts uses src/auth.ts with the real env.DB).
import { betterAuth } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";

export const auth = betterAuth({
  ...withCloudflare(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { d1Native: {} as any, autoDetectIpAddress: false, geolocationTracking: false },
    {
      secret: "cli-stub-secret-not-used-at-runtime",
      baseURL: "https://megabyte.space",
      basePath: "/api/auth",
      emailAndPassword: { enabled: true },
    },
  ),
});
