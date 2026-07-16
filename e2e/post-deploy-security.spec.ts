import { expect, test } from "@playwright/test";

async function loginClient(page: import("@playwright/test").Page) {
  const email = process.env.E2E_CLIENT_EMAIL;
  const password = process.env.E2E_CLIENT_PASSWORD;
  if (!email || !password) {
    throw new Error("E2E_CLIENT_EMAIL and E2E_CLIENT_PASSWORD are required");
  }
  await page.goto("/auth/login");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/client-dashboard/);
}

test.describe("post-deploy security smoke", () => {
  test.skip(
    !process.env.E2E_CLIENT_EMAIL || !process.env.E2E_CLIENT_PASSWORD,
    "Set E2E_CLIENT_EMAIL and E2E_CLIENT_PASSWORD to run post-deploy security smoke tests",
  );

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
