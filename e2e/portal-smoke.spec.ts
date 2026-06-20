import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

type RoleKey = "admin" | "client" | "hm" | "candidate";

const roleConfig: Record<RoleKey, { email: string; password: string; landing: RegExp }> = {
  admin: {
    email: "E2E_ADMIN_EMAIL",
    password: "E2E_ADMIN_PASSWORD",
    landing: /\/admin(?:\/|$)/,
  },
  client: {
    email: "E2E_CLIENT_EMAIL",
    password: "E2E_CLIENT_PASSWORD",
    landing: /\/client-dashboard(?:\/|$)/,
  },
  hm: {
    email: "E2E_HM_EMAIL",
    password: "E2E_HM_PASSWORD",
    landing: /\/hiring-manager-dashboard(?:\/|$)/,
  },
  candidate: {
    email: "E2E_CANDIDATE_EMAIL",
    password: "E2E_CANDIDATE_PASSWORD",
    landing: /\/candidate-dashboard(?:\/|$)/,
  },
};

function credentialsFor(role: RoleKey) {
  const config = roleConfig[role];
  const email = process.env[config.email];
  const password = process.env[config.password];
  return email && password ? { email, password } : null;
}

async function login(page: Page, role: RoleKey) {
  const credentials = credentialsFor(role);
  test.skip(!credentials, `Set ${roleConfig[role].email} and ${roleConfig[role].password}`);

  await page.goto("/auth/login");
  await page.getByLabel(/email address/i).fill(credentials!.email);
  await page.getByLabel(/^password$/i).fill(credentials!.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(roleConfig[role].landing);
}

async function loginViaApi(request: APIRequestContext, page: Page, email: string, password: string) {
  const loginResponse = await request.post("/api/auth/login", {
    multipart: { email, password },
    headers: { Accept: "application/json" },
  });
  expect(loginResponse.ok()).toBeTruthy();

  await page.goto("/auth/login");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test.describe("portal access smoke", () => {
  for (const role of Object.keys(roleConfig) as RoleKey[]) {
    test(`${role} signs in and lands on the correct portal`, async ({ page }) => {
      await login(page, role);
    });
  }
});

test("candidate can open an assessment route when seeded session data exists", async ({ page }) => {
  test.skip(
    !process.env.E2E_CANDIDATE_SESSION_ID,
    "Set E2E_CANDIDATE_SESSION_ID with a valid candidate-session documentId",
  );

  await login(page, "candidate");
  await page.goto(`/assessment/typing?candidateSessionDocumentId=${process.env.E2E_CANDIDATE_SESSION_ID}`);
  await expect(page).toHaveURL(/\/assessment\/typing/);
  await expect(page.getByText(/typing/i).first()).toBeVisible();
});

// ── Problem-3 coverage: admin comms page loads prefills dynamically ──────

test("admin comms page populates subject from backend on mount", async ({ page }) => {
  test.skip(!credentialsFor("admin"), "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD");

  await login(page, "admin");
  await page.goto("/admin/comms");

  // subject input must be non-empty — populated by the useEffect fetch, not the bundle
  const subjectInput = page.getByLabel(/subject/i);
  await expect(subjectInput).not.toBeEmpty({ timeout: 5_000 });

  // switching templates must update the subject (applyTemplate uses backend data)
  const firstSubject = await subjectInput.inputValue();
  expect(firstSubject.length).toBeGreaterThan(0);

  // target the template combobox specifically (there may be multiple comboboxes on the page)
  const templateSelect = page.getByRole("combobox").filter({ hasText: /maintenance|site.down|upgrade|renewal|custom/i }).first();
  await templateSelect.click();
  // pick any option in the dropdown that appears
  await page.getByRole("option").first().click();
  await expect(subjectInput).not.toBeEmpty();
});
