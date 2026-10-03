import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { withCloudflare } from "better-auth-cloudflare";
import { AwsClient } from "aws4fetch";

export interface Env {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  // AWS SES (the estate's email rail) — megabyte.space is a verified SES identity (prod access).
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  // GitHub + Google SSO (Brian 2026-10-03: seamless social sign-in). Optional — social providers
  // are wired only when the pair is present, so a missing secret degrades to email+magic-link.
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

const SES_ENDPOINT = "https://email.us-east-1.amazonaws.com/v2/email/outbound-emails";
const FROM = "Megabyte OS <hey@megabyte.space>";

/** Send one transactional email via SES v2 (SigV4-signed with aws4fetch — Workers-safe). */
async function sendEmail(env: Env, to: string, subject: string, html: string): Promise<void> {
  const aws = new AwsClient({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: "us-east-1",
    service: "ses",
  });
  const res = await aws.fetch(SES_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      FromEmailAddress: FROM,
      Destination: { ToAddresses: [to] },
      Content: { Simple: { Subject: { Data: subject }, Body: { Html: { Data: html } } } },
    }),
  });
  if (!res.ok) throw new Error(`SES ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

function magicLinkEmail(url: string): string {
  return `<div style="font-family:ui-sans-serif,system-ui,sans-serif;background:#060610;color:#e8edf5;padding:32px;border-radius:16px;max-width:480px;margin:auto">
  <h1 style="font-size:22px;margin:0 0 8px">Sign in to <span style="color:#00e5ff">Megabyte OS</span></h1>
  <p style="color:#95a0b5;margin:0 0 24px;line-height:1.6">Click below to sign in. This link expires shortly and works once.</p>
  <a href="${url}" style="display:inline-block;background:#00e5ff;color:#03030a;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:999px">Sign in →</a>
  <p style="color:#6b7489;font-size:12px;margin:24px 0 0">If you didn't request this, you can safely ignore this email.</p>
</div>`;
}

/**
 * Build the Better Auth instance for a request. Native D1 (no Drizzle). Email+password
 * (BA-1) + magic-link via SES (BA-1b). Geolocation OFF so no per-request `cf` is needed.
 * The magicLink plugin lives inside withCloudflare's auth options so it MERGES with the
 * cloudflare plugin rather than overwriting it.
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
        emailAndPassword: { enabled: true },
        // GitHub + Google SSO (Brian 2026-10-03). Each provider is added only when BOTH its id and
        // secret are present, so an unprovisioned provider silently degrades rather than breaking the
        // rail. Callback URLs: https://megabyte.space/api/auth/callback/{github,google}.
        socialProviders: {
          ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
            ? { github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET } }
            : {}),
          ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
            ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
            : {}),
        },
        // Share the session across megabyte.space + os.megabyte.space so the OS (on os.) can read
        // the Better Auth session set on the apex — the flip without a full apex re-point.
        trustedOrigins: ["https://megabyte.space", "https://os.megabyte.space"],
        advanced: {
          crossSubDomainCookies: { enabled: true, domain: ".megabyte.space" },
        },
        plugins: [
          magicLink({
            sendMagicLink: async ({ email, url }) => {
              await sendEmail(env, email, "Your Megabyte OS sign-in link", magicLinkEmail(url));
            },
          }),
        ],
      },
    ),
  });
}
