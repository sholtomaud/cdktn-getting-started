import { test, expect } from "@playwright/test";
import { getDesignSystem } from "../lib/design-system";

const ds = getDesignSystem();

test.describe("CDKTN Hello World page", () => {
  test("has correct page title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/CDKTN Hello World/);
  });

  test("renders the hero heading with design tokens", async ({ page }) => {
    await page.goto("/");
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
    await expect(h1).toContainText("Deployed via CDKTN");
    
    // Conformance: Check typography against DESIGN.md tokens
    const h1Spec = ds.typography?.h1 || ds.typography?.mainHeading; 
    if (h1Spec) {
      await expect(h1).toHaveCSS("font-weight", h1Spec.fontWeight?.toString() || "800");
    }
    await expect(h1).toHaveCSS("font-size", "38.4px"); // 2.4rem * 16px base
  });

  test("card layout matches spacing tokens", async ({ page }) => {
    await page.goto("/");
    const card = page.locator(".card");
    
    // Conformance: Check padding (matches DESIGN.md "48px 56px")
    await expect(card).toHaveCSS("padding", "48px 56px");
    if (ds.rounded?.md) {
      await expect(card).toHaveCSS("border-radius", ds.rounded.md);
    }
  });

  test("shows all three stack items", async ({ page }) => {
    await page.goto("/");
    const items = page.locator(".stack-item");
    await expect(items).toHaveCount(3);
  });

  test("uptime counter increments", async ({ page }) => {
    await page.goto("/");
    const uptime = page.locator("#uptime-counter");
    await expect(uptime).toBeVisible();
    const first = await uptime.textContent();
    await page.waitForTimeout(2000);
    const second = await uptime.textContent();
    expect(first).not.toBe(second);
  });

  test("cdktn.io link opens in new tab", async ({ page }) => {
    await page.goto("/");
    const link = page.locator('a[href="https://cdktn.io"]');
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
  });

  test("visual snapshot", async ({ page }) => {
    await page.goto("/");
    // Wait for the fadeUp animation to complete
    await page.waitForTimeout(1000); 
    await page.screenshot({ path: "tests/e2e/screenshots/dashboard.png", fullPage: true });
  });
});
