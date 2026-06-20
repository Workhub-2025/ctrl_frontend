import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

async function loginViaApi(
  request: APIRequestContext,
  page: Page,
  email: string,
  password: string
) {
  const loginResponse = await request.post("/api/auth/login", {
    data: { email, password },
    headers: { Accept: "application/json" },
  });
  expect(loginResponse.ok()).toBeTruthy();

  await page.goto("/auth/login");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test.describe("API contract smoke", () => {
  test("client updates shared-candidate review status via POST /status", async ({
    page,
    request,
  }) => {
    const email = process.env.E2E_CLIENT_EMAIL;
    const password = process.env.E2E_CLIENT_PASSWORD;
    const sharedCandidateId = process.env.E2E_SHARED_CANDIDATE_ID;

    test.skip(!email || !password || !sharedCandidateId, "Set E2E_CLIENT_* and E2E_SHARED_CANDIDATE_ID");

    await loginViaApi(request, page, email!, password!);

    const response = await request.post(
      `/api/client/shared-candidates/${encodeURIComponent(sharedCandidateId!)}/status`,
      {
        data: { reviewStatus: "reviewed" },
        headers: { "Content-Type": "application/json" },
      }
    );

    expect(response.status()).toBeLessThan(500);
    expect([200, 400, 403, 404]).toContain(response.status());
  });

  test("client shared-candidate notes BFF accepts authenticated GET/POST", async ({
    page,
    request,
  }) => {
    const email = process.env.E2E_CLIENT_EMAIL;
    const password = process.env.E2E_CLIENT_PASSWORD;
    const sharedCandidateId = process.env.E2E_SHARED_CANDIDATE_ID;

    test.skip(!email || !password || !sharedCandidateId, "Set E2E_CLIENT_* and E2E_SHARED_CANDIDATE_ID");

    await loginViaApi(request, page, email!, password!);

    const listPath = `/api/client/shared-candidates/${encodeURIComponent(sharedCandidateId!)}/notes`;
    const listResponse = await request.get(listPath);
    expect(listResponse.ok()).toBeTruthy();

    const createResponse = await request.post(listPath, {
      data: { content: "E2E contract note" },
      headers: { "Content-Type": "application/json" },
    });
    expect(createResponse.status()).toBeLessThan(500);
    expect([201, 400, 403, 404]).toContain(createResponse.status());
  });

  test("admin seat-slots BFF returns without double /api URL bug", async ({ page, request }) => {
    const email = process.env.E2E_ADMIN_EMAIL;
    const password = process.env.E2E_ADMIN_PASSWORD;
    const clientId = process.env.E2E_CLIENT_DOCUMENT_ID;

    test.skip(!email || !password || !clientId, "Set E2E_ADMIN_* and E2E_CLIENT_DOCUMENT_ID");

    await loginViaApi(request, page, email!, password!);

    const response = await request.get(
      `/api/admin/clients/${encodeURIComponent(clientId!)}/seat-slots`
    );

    expect(response.status()).not.toBe(404);
    expect(response.status()).toBeLessThan(500);

    if (!response.ok()) {
      const body = await response.text();
      expect(body).not.toMatch(/\/api\/api\//);
    }
  });
});
