import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { inspectScreenContent } from "@/lib/portal-content-invariants";
import type { ScreenDTO } from "@/lib/portal-contracts";
import {
  findPortalRoute,
  PORTAL_ROUTES,
} from "@/lib/portal-route-registry";
import { CANDIDATE_NAV_ITEMS } from "@/lib/candidate-nav";
import { CLIENT_NAV_ITEMS } from "@/lib/client-nav";
import { HM_NAV_ITEMS } from "@/lib/hm-nav";

describe("portal route registry", () => {
  it("has one owner for every route id and path", () => {
    expect(new Set(PORTAL_ROUTES.map((route) => route.id)).size).toBe(PORTAL_ROUTES.length);
    expect(new Set(PORTAL_ROUTES.map((route) => route.path)).size).toBe(PORTAL_ROUTES.length);
  });

  it("points every redirect directly to a canonical route", () => {
    for (const route of PORTAL_ROUTES) {
      if (route.classification !== "redirect") continue;
      const destination = PORTAL_ROUTES.find(
        (candidate) => candidate.path === route.canonicalPath,
      );
      expect(destination, route.path).toBeDefined();
      expect(destination?.classification, route.path).toBe("canonical");
      expect(route.removalDate, route.path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("requires dated retirement for removed routes", () => {
    for (const route of PORTAL_ROUTES) {
      if (route.classification === "removed") {
        expect(route.removalDate, route.path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("prevents removed routes from retaining substantive page implementations", () => {
    const appDirectory = path.resolve(process.cwd(), "src/app");
    for (const route of PORTAL_ROUTES) {
      if (route.classification !== "removed") continue;
      const pagePath = path.join(
        appDirectory,
        route.path.replace(/^\//, ""),
        "page.tsx",
      );
      const source = fs.readFileSync(pagePath, "utf8");
      expect(source, route.path).toContain("notFound()");
      expect(source.split("\n").length, route.path).toBeLessThanOrEqual(12);
    }
  });

  it("keeps public registration as a dated login adapter", () => {
    const registration = PORTAL_ROUTES.find(
      (route) => route.path === "/auth/register",
    );
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/auth/register/page.tsx"),
      "utf8",
    );
    expect(registration?.classification).toBe("redirect");
    expect(registration?.canonicalPath).toBe("/auth/login");
    expect(registration?.removalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(source).toContain('"/auth/login"');
    expect(source).not.toContain("registerUser");
    const registrationApi = fs.readFileSync(
      path.resolve(process.cwd(), "src/legacy-cms/auth-server.ts"),
      "utf8",
    );
    expect(registrationApi).toContain('"access-code/register"');
    expect(registrationApi).not.toContain(
      'postCmsAuth<StrapiAuthResponse>("auth/local/register"',
    );
  });

  it("resolves dynamic canonical routes", () => {
    expect(
      findPortalRoute("/hiring-manager-dashboard/campaigns/campaign-1")?.id,
    ).toBe("hm.campaign-detail");
    expect(findPortalRoute("/admin/organizations/org-1")?.id).toBe(
      "admin.organization-detail",
    );
  });

  it("classifies every user-facing Next page", () => {
    const appDirectory = path.resolve(process.cwd(), "src/app");
    const pageRoutes: string[] = [];

    const visit = (directory: string) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "api") continue;
          visit(absolute);
        } else if (entry.name === "page.tsx") {
          const relative = path.relative(appDirectory, directory);
          pageRoutes.push(relative ? `/${relative}` : "/");
        }
      }
    };

    visit(appDirectory);
    const normalizeDynamicSegments = (route: string) =>
      route.replace(/\[[^\]]+\]/g, "[]");
    const registered = new Set(
      PORTAL_ROUTES.map((route) => normalizeDynamicSegments(route.path)),
    );

    expect(
      pageRoutes
        .map(normalizeDynamicSegments)
        .filter((route) => !registered.has(route))
        .sort(),
    ).toEqual([]);
  });

  it("keeps migrated portal navigation unique and canonical", () => {
    for (const items of [
      CANDIDATE_NAV_ITEMS,
      CLIENT_NAV_ITEMS,
      HM_NAV_ITEMS,
    ]) {
      expect(new Set(items.map((item) => item.href)).size).toBe(items.length);
      for (const item of items) {
        expect(findPortalRoute(item.href)?.classification, item.href).toBe(
          "canonical",
        );
      }
    }
  });
});

describe("screen content ownership", () => {
  it("rejects duplicate metrics and repeated primary actions", () => {
    const screen: ScreenDTO<object> = {
      routeId: "test",
      generatedAt: new Date(0).toISOString(),
      title: "Test",
      primaryAction: { key: "review", label: "Review", href: "/review" },
      metrics: [
        { key: "active", label: "Active", value: 2 },
        { key: "active", label: "Active again", value: 2 },
      ],
      decisions: [
        {
          id: "decision",
          title: "Decision",
          reason: "Evidence is ready",
          href: "/review",
          actionLabel: "Review",
          priority: "attention",
        },
      ],
      data: {},
    };

    expect(inspectScreenContent(screen)).toEqual([
      { kind: "duplicate-metric", key: "active" },
      { kind: "duplicate-action", key: "review" },
    ]);
  });
});

describe("shared portal component architecture", () => {
  it("keeps shared leaf components free of network and tenancy logic", () => {
    const portalDirectory = path.resolve(
      process.cwd(),
      "src/components/dashboard/portal",
    );
    const foundationFiles = [
      "portal-data-ui.tsx",
      "portal-navigation-ui.tsx",
      "support-workspace.tsx",
    ];

    for (const file of foundationFiles) {
      const source = fs.readFileSync(path.join(portalDirectory, file), "utf8");
      expect(source, file).not.toMatch(/\bfetch\s*\(/);
      expect(source, file).not.toMatch(/\buse(Query|Session|Auth)\s*\(/);
      expect(source, file).not.toMatch(/organizationId|tenantId/);
    }
  });

  it("does not fetch candidate applications from the support layout", () => {
    const candidateShell = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/dashboard/candidate-shell.tsx"),
      "utf8",
    );
    const candidateDashboard = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/candidate-dashboard/page.tsx"),
      "utf8",
    );
    const candidateSupport = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/candidate-dashboard/support/page.tsx"),
      "utf8",
    );

    expect(candidateShell).not.toContain("CandidatePortalProvider");
    expect(candidateSupport).not.toContain("CandidatePortalProvider");
    expect(candidateDashboard).toContain("CandidatePortalProvider");
  });
});
