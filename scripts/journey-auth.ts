import type { Page } from "playwright";

/** Fail closed before deep interactions; never expose Playwright/server auth diagnostics. */
export async function authenticateJourney(page: Page, apex: string, email: string, password: string): Promise<void> {
  try {
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('[data-testid="auth-submit"]');
    // The inline router success marker is empty (zero-size), so visibility is not its contract.
    await page.waitForSelector('[data-testid="auth-success"], [data-testid="auth-already"]', {
      state: "attached", timeout: 20000,
    });
    await page.goto(`${apex}/pulse`, { waitUntil: "domcontentloaded", timeout: 40000 });
    await page.locator("aside").waitFor({ state: "visible", timeout: 25000 });
    // A cookie only selects SPA HTML. Verify Better Auth identity independently of the shell.
    const response = await page.request.get(`${apex}/api/auth/get-session`, { timeout: 20000 });
    const session = await response.json();
    if (!response.ok() || session?.user?.email !== email.trim() || !session?.session) throw new Error("Invalid session");
  } catch {
    throw new Error("Journey authentication failed before authenticated shell verification");
  }
}
