#!/usr/bin/env node
// Post-deploy production verification for https://megabyte.space (Cloudflare OS).
//
// Asserts, against the LIVE site:
//   1. Unauthenticated apex request is intercepted by Cloudflare Access
//      (302 to the manhattan.cloudflareaccess.com login) — the app is never
//      served anonymously.
//   2. A request authenticated with the "megabyte-os-e2e" Access service token
//      reaches the router Worker and receives the app shell (200, HTML,
//      contains the root mount node).
//   3. www.megabyte.space 301s to the apex.
//
// Service-token credentials come from CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET
// (falling back to the session drop files under /tmp for local runs).
//
// Exit code 0 = all green; 1 = any assertion failed. TDD: this script is
// written BEFORE the first deploy and must fail (RED) until the deploy lands.

import { readFileSync } from "node:fs";

const APEX = "https://megabyte.space/";
const WWW = "https://www.megabyte.space/";
const ISSUER_HOST = "manhattan.cloudflareaccess.com";

const readTmp = (path) => {
  try {
    return readFileSync(path, "utf8").trim();
  } catch {
    return "";
  }
};

const clientId = process.env.CF_ACCESS_CLIENT_ID || readTmp("/tmp/cfos-st-id.txt");
const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET || readTmp("/tmp/cfos-st-secret.txt");

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "✅ PASS" : "❌ FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const tryFetch = async (url, options) => {
  try {
    return await fetch(url, options);
  } catch (error) {
    return { error: String(error?.cause?.code || error) };
  }
};

// 1. Unauthenticated apex → Access login redirect.
{
  const res = await tryFetch(APEX, { redirect: "manual" });
  if (res.error) {
    record("apex gated by Access", false, `fetch failed: ${res.error}`);
  } else {
    const location = res.headers.get("location") || "";
    const pass = res.status === 302 && location.includes(ISSUER_HOST);
    record(
      "apex gated by Access",
      pass,
      `status=${res.status} location=${location.slice(0, 80) || "(none)"}`,
    );
  }
}

// 2. Service-token request → app shell from the router Worker.
{
  if (!clientId || !clientSecret) {
    record("service token reaches app shell", false, "missing CF_ACCESS_CLIENT_ID/SECRET");
  } else {
    const res = await tryFetch(APEX, {
      redirect: "manual",
      headers: {
        "CF-Access-Client-Id": clientId,
        "CF-Access-Client-Secret": clientSecret,
      },
    });
    if (res.error) {
      record("service token reaches app shell", false, `fetch failed: ${res.error}`);
    } else {
      const body = res.status === 200 ? await res.text() : "";
      const isHtml = (res.headers.get("content-type") || "").includes("text/html");
      const hasRoot = body.includes('id="root"');
      const pass = res.status === 200 && isHtml && hasRoot && body.length > 500;
      record(
        "service token reaches app shell",
        pass,
        `status=${res.status} html=${isHtml} root=${hasRoot} bytes=${body.length}`,
      );
    }
  }
}

// 3. www → apex redirect.
{
  const res = await tryFetch(WWW, { redirect: "manual" });
  if (res.error) {
    record("www redirects to apex", false, `fetch failed: ${res.error}`);
  } else {
    const location = res.headers.get("location") || "";
    const pass = [301, 308].includes(res.status) && location.startsWith("https://megabyte.space");
    record("www redirects to apex", pass, `status=${res.status} location=${location || "(none)"}`);
  }
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} assertions green`);
process.exit(failed.length === 0 ? 0 : 1);
