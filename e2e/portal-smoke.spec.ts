import { expect, test, type Page } from "@playwright/test";

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
