import { expect, test, type Page } from "@playwright/test";

const QA = {
  client: {
    email: process.env.E2E_CLIENT_EMAIL ?? "qa.client@ctrl-assess.co.uk",
    password: process.env.E2E_CLIENT_PASSWORD ?? "admin123",
    landing: /\/client-dashboard/,
  },
  hm: {
    email: process.env.E2E_HM_EMAIL ?? "qa.hm@ctrl-assess.co.uk",
    password: process.env.E2E_HM_PASSWORD ?? "admin123",
    landing: /\/hiring-manager-dashboard/,
  },
  candidate: {
    email: process.env.E2E_CANDIDATE_EMAIL ?? "qa.candidate@ctrl-assess.co.uk",
    password: process.env.E2E_CANDIDATE_PASSWORD ?? "admin123",
    landing: /\/candidate-dashboard/,
  },
} as const;

async function loginRole(page: Page, role: keyof typeof QA) {
  const { email, password, landing } = QA[role];
  await page.goto("/auth/login");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(landing);
}

function extractDocumentId(item: unknown): string | undefined {
  if (!item || typeof item !== "object") return undefined;
  const record = item as Record<string, unknown>;
  if (typeof record.documentId === "string") return record.documentId;
  if (typeof record.id === "string") return record.id;
  return undefined;
}

async function discoverSharedCandidateId(page: Page): Promise<string | undefined> {
  const envId = process.env.E2E_SHARED_CANDIDATE_ID;
  if (envId) return envId;

  const response = await page.request.get("/api/client/shared-candidates");
  if (!response.ok()) return undefined;

  const body = (await response.json()) as { data?: unknown[] };
  const first = body.data?.[0];
  return extractDocumentId(first);
}

async function discoverAssessmentSessionId(page: Page): Promise<string | undefined> {
  const envId = process.env.E2E_ASSESSMENT_SESSION_ID;
  if (envId) return envId;

  const response = await page.request.get("/api/hiring-manager/sessions");
  if (!response.ok()) return undefined;

  const body = (await response.json()) as { data?: unknown[] };
  const first = body.data?.[0];
  return extractDocumentId(first);
}

async function discoverCandidateSessionId(page: Page): Promise<string | undefined> {
  const envId = process.env.E2E_CANDIDATE_SESSION_ID;
  if (envId) return envId;

  const response = await page.request.get("/api/candidate/workspace");
  if (!response.ok()) return undefined;

  const body = (await response.json()) as { data?: unknown[] };
  const first = body.data?.[0];
  const fromRoot = extractDocumentId(first);
  if (fromRoot) return fromRoot;

  if (first && typeof first === "object") {
    const nested = (first as Record<string, unknown>).candidateSession;
    return extractDocumentId(nested);
  }

  return undefined;
}

test.describe.configure({ mode: "serial" });

test.describe("QA portal full coverage (client / HM / candidate)", () => {
  test("client signs in and overview loads", async ({ page }) => {
    await loginRole(page, "client");

    const overview = await page.request.get("/api/client/overview");
    expect(overview.status()).toBeLessThan(500);
    expect(overview.ok()).toBeTruthy();
  });

  test("client shared-candidate status and notes BFF", async ({ page }) => {
    await loginRole(page, "client");

    const sharedCandidateId = await discoverSharedCandidateId(page);
    test.skip(!sharedCandidateId, "No shared candidates in QA org — seed one or set E2E_SHARED_CANDIDATE_ID");

    const statusResponse = await page.request.post(
      `/api/client/shared-candidates/${encodeURIComponent(sharedCandidateId!)}/status`,
      {
        data: { reviewStatus: "reviewed" },
        headers: { "Content-Type": "application/json" },
      }
    );
    expect(statusResponse.status()).toBeLessThan(500);
    expect([200, 400, 403, 404]).toContain(statusResponse.status());

    const notesPath = `/api/client/shared-candidates/${encodeURIComponent(sharedCandidateId!)}/notes`;
    const listResponse = await page.request.get(notesPath);
    expect(listResponse.ok()).toBeTruthy();

    const createResponse = await page.request.post(notesPath, {
      data: { content: `E2E note ${Date.now()}` },
      headers: { "Content-Type": "application/json" },
    });
    expect(createResponse.status()).toBeLessThan(500);
    expect([201, 400, 403, 404]).toContain(createResponse.status());
  });

  test("client blocked from admin routes", async ({ page }) => {
    await loginRole(page, "client");

    const del = await page.request.delete("/api/admin/clients/fake-id", {
      data: { confirmName: "x" },
      headers: { "Content-Type": "application/json" },
    });
    expect(del.status()).toBe(403);

    const put = await page.request.put("/api/admin/clients/fake-id", {
      data: { features: { deliveryRemote: true } },
      headers: { "Content-Type": "application/json" },
    });
    expect(put.status()).toBe(403);
  });

  test("client blocked from another tenant shared-candidate", async ({ page }) => {
    await loginRole(page, "client");

    const response = await page.request.get("/api/client/shared-candidates/not-a-real-id/notes");
    expect([403, 404]).toContain(response.status());
  });

  test("HM signs in and sessions overview loads", async ({ page }) => {
    await loginRole(page, "hm");

    const overview = await page.request.get("/api/hiring-manager/overview");
    expect(overview.status()).toBeLessThan(500);
    expect(overview.ok()).toBeTruthy();

    const sessions = await page.request.get("/api/hiring-manager/sessions");
    expect(sessions.status()).toBeLessThan(500);
    expect(sessions.ok()).toBeTruthy();
  });

  test("HM session status BFF", async ({ page }) => {
    await loginRole(page, "hm");

    const sessionId = await discoverAssessmentSessionId(page);
    test.skip(!sessionId, "No HM assessment sessions in QA org — create one or set E2E_ASSESSMENT_SESSION_ID");

    const response = await page.request.post(
      `/api/hiring-manager/sessions/${encodeURIComponent(sessionId!)}/status`,
      {
        data: { status: "closed" },
        headers: { "Content-Type": "application/json" },
      }
    );
    expect(response.status()).toBeLessThan(500);
    expect([200, 400, 403, 404]).toContain(response.status());
  });

  test("HM blocked from admin routes", async ({ page }) => {
    await loginRole(page, "hm");

    const response = await page.request.delete("/api/admin/clients/fake-id", {
      data: { confirmName: "x" },
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status()).toBe(403);
  });

  test("candidate signs in and workspace loads", async ({ page }) => {
    await loginRole(page, "candidate");

    const workspace = await page.request.get("/api/candidate/workspace");
    expect(workspace.status()).toBeLessThan(500);
    expect(workspace.ok()).toBeTruthy();
  });

  test("candidate can open assessment route when session exists", async ({ page }) => {
    await loginRole(page, "candidate");

    const sessionId = await discoverCandidateSessionId(page);
    test.skip(!sessionId, "No candidate sessions in QA workspace — set E2E_CANDIDATE_SESSION_ID");

    await page.goto(`/assessment/typing?candidateSessionDocumentId=${encodeURIComponent(sessionId!)}`);
    await expect(page).toHaveURL(/\/assessment\/typing/);
    await expect(page.getByText(/typing/i).first()).toBeVisible();
  });

  test("candidate blocked from admin and HM routes", async ({ page }) => {
    await loginRole(page, "candidate");

    const adminDel = await page.request.delete("/api/admin/clients/fake-id", {
      data: { confirmName: "x" },
      headers: { "Content-Type": "application/json" },
    });
    expect(adminDel.status()).toBe(403);

    const hmClose = await page.request.post("/api/hiring-manager/sessions/fake-id/status", {
      data: { status: "closed" },
      headers: { "Content-Type": "application/json" },
    });
    expect(hmClose.status()).toBe(403);
  });
});
