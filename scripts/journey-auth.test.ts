import { test } from "node:test";
import assert from "node:assert/strict";
import type { Page } from "playwright";
import { authenticateJourney } from "./journey-auth.ts";

for (const failure of ["fill", "click", "marker", "navigation", "shell", "session"]) {
  test(`authentication stops on ${failure} failure without leaking diagnostics`, async () => {
    const calls: string[] = [];
    const act = async (name: string) => {
      calls.push(name);
      if (name === failure) throw new Error("private-password-and-response");
    };
    const page = {
      fill: () => act("fill"), click: () => act("click"),
      waitForSelector: (_selector: string, options: { state?: string }) => {
        assert.equal(options.state, "attached"); return act("marker");
      },
      goto: () => act("navigation"),
      locator: () => ({ waitFor: () => act("shell") }),
      request: { get: async () => { await act("session"); return { ok: () => true, json: async () => ({ user: { email: "private-email" }, session: {} }) }; } },
    } as unknown as Page;
    await assert.rejects(authenticateJourney(page, "https://megabyte.space", "private-email", "private-password"),
      { message: "Journey authentication failed before authenticated shell verification" });
    assert.equal(calls.at(-1), failure);
    if (["fill", "click", "marker", "navigation"].includes(failure)) assert.ok(!calls.includes("shell"));
  });
}

test("successful authentication requires attached marker and visible shell", async () => {
  const calls: string[] = [];
  const page = {
    fill: async () => { calls.push("fill"); }, click: async () => { calls.push("click"); },
    waitForSelector: async (_selector: string, options: { state: string }) => {
      assert.equal(options.state, "attached"); calls.push("marker");
    },
    goto: async (url: string) => { assert.equal(url, "https://megabyte.space/pulse"); calls.push("navigation"); },
    locator: (selector: string) => {
      assert.equal(selector, "aside");
      return { waitFor: async (options: { state: string }) => {
        assert.equal(options.state, "visible"); calls.push("shell");
      } };
    },
    request: { get: async () => { calls.push("session"); return { ok: () => true, json: async () => ({ user: { email: "email" }, session: {} }) }; } },
  } as unknown as Page;
  await authenticateJourney(page, "https://megabyte.space", " email ", "password");
  assert.deepEqual(calls, ["fill", "fill", "click", "marker", "navigation", "shell", "session"]);
});

for (const session of [null, { user: { email: "another-account" }, session: {} }, { user: { email: "email" } }]) {
  test("shell and marker cannot substitute for matching authenticated session", async () => {
    const page = {
      fill: async () => {}, click: async () => {}, waitForSelector: async () => {}, goto: async () => {},
      locator: () => ({ waitFor: async () => {} }),
      request: { get: async () => ({ ok: () => true, json: async () => session }) },
    } as unknown as Page;
    await assert.rejects(authenticateJourney(page, "https://megabyte.space", "email", "password"), /Journey authentication failed/);
  });
}
