import { expect, test } from "@playwright/test";

async function loginClient(page: import("@playwright/test").Page) {
  await page.goto("/auth/login");
  await page.getByLabel(/email address/i).fill("qa.client@ctrl-assess.co.uk");
  await page.getByLabel(/^password$/i).fill("admin123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/client-dashboard/);
}

test.describe("post-deploy security smoke", () => {
  test("client role is blocked from admin client DELETE", async ({ page }) => {
    await loginClient(page);

    const response = await page.request.delete("/api/admin/clients/fake-client-id", {
      data: { confirmName: "test" },
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status()).toBe(403);
  });

  test("client role is blocked from admin client PUT", async ({ page }) => {
    await loginClient(page);

    const response = await page.request.put("/api/admin/clients/fake-client-id", {
      data: { features: { deliveryRemote: true } },
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status()).toBe(403);
  });
});
