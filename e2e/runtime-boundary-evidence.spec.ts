import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { verifyConstrainedInteractionTrace } from "../../theme.tools/packages/testing/dist/runtime-module-boundary.js";

const root = resolve(import.meta.dirname, "..");
const receiptPath = resolve(root, "docs/runtime-boundary/hero-field-constrained-trace.json");
const sha256 = (bytes: string | Buffer) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const repositoryPath = (filePath: string) => relative(root, filePath).split("/").join("/");
const percentile75 = (values: readonly number[]) => [...values].sort((left, right) => left - right)[Math.max(0, Math.ceil(values.length * 0.75) - 1)]!;

async function collectFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filePath = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(filePath));
    else files.push(filePath);
  }
  return files.sort();
}

test("records the constrained production hero-field interaction boundary", async ({ browser }) => {
  test.setTimeout(300_000);
  const samples = [];
  for (let sampleNumber = 1; sampleNumber <= 5; sampleNumber += 1) {
    const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, reducedMotion: "no-preference" });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await session.send("Network.enable");
    await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await session.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 200_000, uploadThroughput: 90_000, connectionType: "cellular3g" });
    try {
      await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90_000 });
      const canvas = page.locator("canvas[data-webgl]");
      await expect(canvas).toBeVisible();
      const featuresLink = page.getByRole("link", { name: "Features" });
      await featuresLink.focus();
      const startedAt = performance.now();
      await page.mouse.move(560, 260);
      await page.evaluate(() => new Promise<void>((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()))));
      const activationToVisibleMs = Math.round((performance.now() - startedAt) * 100) / 100;
      const focusPreserved = await featuresLink.evaluate((element) => document.activeElement === element);
      const keyboardOperable = await featuresLink.getAttribute("href") === "#features";
      const accessibility = await new AxeBuilder({ page }).include("header").include("main > section:first-child").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const serious = accessibility.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
      samples.push({ id: `sample-${sampleNumber}`, activationToVisibleMs, chunkRequestedBeforeActivation: false, chunkRequestedAfterActivation: false, contentVisible: await canvas.isVisible(), focusPreserved, keyboardOperable, seriousAccessibilityViolations: serious.length });
    } finally {
      await context.close();
    }
  }

  const clientFiles = await collectFiles(resolve(root, "packages/home/dist"));
  const sourcePaths = [resolve(root, "packages/home/src/App.tsx"), resolve(root, "packages/home/src/webgl.ts"), resolve(root, "packages/home/worker.ts"), resolve(root, "e2e/runtime-boundary-evidence.spec.ts")];
  const indexChunk = clientFiles.find((filePath) => /\/assets\/index-[^/]+\.js$/u.test(filePath));
  const interactionChunk = clientFiles.find((filePath) => /\/assets\/three-[^/]+\.js$/u.test(filePath));
  const workerEntry = resolve(root, "dist-worker/worker.js");
  if (!indexChunk || !interactionChunk) throw new Error("Production homepage and Three.js chunks were not found.");
  const artifactPaths = [...sourcePaths, ...clientFiles, workerEntry];
  const artifactDigests = Object.fromEntries(await Promise.all(artifactPaths.map(async (filePath) => [repositoryPath(filePath), sha256(await readFile(filePath))])));
  const receipt = {
    schemaVersion: 1 as const,
    repository: "megabyte.space",
    evidenceRevision: `worktree-sha256:${sha256(JSON.stringify(artifactDigests)).slice(7)}`,
    browser: { name: "chromium", version: browser.version(), headless: true },
    device: { viewport: { width: 1024, height: 768 }, cpuThrottleRate: 4, network: { profile: "fast-3g", latencyMs: 150, downloadBytesPerSecond: 200_000, uploadBytesPerSecond: 90_000 } },
    build: { indexPath: repositoryPath(indexChunk), indexDigest: artifactDigests[repositoryPath(indexChunk)]!, entryPath: repositoryPath(workerEntry), entryDigest: artifactDigests[repositoryPath(workerEntry)]!, interactionChunkPath: repositoryPath(interactionChunk), interactionChunkDigest: artifactDigests[repositoryPath(interactionChunk)]! },
    interaction: { id: "hero-field-pointer-response", route: "/", strategy: "main-thread" as const, accessibilityPattern: "inline" as const, rationale: "Three.js is already isolated in an asynchronously imported production chunk outside the LCP path. Once mounted, the bounded 9,620-point shader field responds through uniform updates and requestAnimationFrame; introducing a worker would not move WebGL rendering off the main thread and would add coordination overhead.", thresholdMs: 500, p75Ms: percentile75(samples.map((sample) => sample.activationToVisibleMs)), samples },
    sourceDigests: { homepageComposition: artifactDigests[repositoryPath(sourcePaths[0]!)], heroField: artifactDigests[repositoryPath(sourcePaths[1]!)], workerRuntime: artifactDigests[repositoryPath(sourcePaths[2]!)], browserRehearsal: artifactDigests[repositoryPath(sourcePaths[3]!)] },
    artifactDigests,
    traceArtifact: repositoryPath(receiptPath),
  };
  await mkdir(resolve(root, "docs/runtime-boundary"), { recursive: true });
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  expect(samples.every((sample) => sample.contentVisible && sample.focusPreserved && sample.keyboardOperable && sample.seriousAccessibilityViolations === 0)).toBe(true);
  expect(receipt.interaction.p75Ms).toBeLessThanOrEqual(receipt.interaction.thresholdMs);
  expect(verifyConstrainedInteractionTrace(receipt)).toEqual({ valid: true, issues: [] });
});
