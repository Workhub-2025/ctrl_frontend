"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAssessmentRenderer } from "@/assessment-modules/registry";
import type { AssessmentReadiness, LaunchEnvelope } from "@/assessment-modules/types";

type Fixture = {
  readiness: AssessmentReadiness;
  launch: LaunchEnvelope & { durationMinutes: number };
};

const RUNTIME_PREFIX = "/api/assessment-runtime/";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Answers the assessment runtime API in the browser so a module can be
 * clicked through with no backend. Every other request goes out as normal.
 */
function installDemoRuntime(fixture: Fixture, integrity: boolean) {
  const realFetch = window.fetch.bind(window);
  let revision = 0;

  const launch = (): LaunchEnvelope => {
    const now = Date.now();
    const { durationMinutes, ...envelope } = fixture.launch;
    return {
      ...envelope,
      serverTime: new Date(now).toISOString(),
      startedAt: new Date(now).toISOString(),
      deadlineAt: new Date(now + durationMinutes * 60_000).toISOString(),
      progressRevision: revision,
      // Lockdown is off unless asked for, so the screens can be looked at
      // without fullscreen and focus prompts getting in the way.
      integrity: integrity
        ? envelope.integrity
        : {
            ...envelope.integrity,
            focusViolationLimit: 999,
            focusLossLockSeconds: 999_999,
            blockClipboard: false,
            blockContextMenu: false,
            pauseOnHidden: false,
            pauseOnFullscreenExit: false,
          },
    };
  };

  window.fetch = async (input, init) => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
      window.location.origin,
    );
    if (url.origin !== window.location.origin || !url.pathname.startsWith(RUNTIME_PREFIX)) {
      return realFetch(input, init);
    }
    const path = url.pathname.slice(RUNTIME_PREFIX.length);
    const now = new Date().toISOString();

    if (path === "readiness") return json(fixture.readiness);
    if (path === "start") return json(launch());
    if (path.endsWith("/heartbeat")) {
      return json({ status: "in_progress", serverTime: now, deadlineAt: null, networkResumesLeft: 2 });
    }
    if (path.endsWith("/progress")) {
      revision += 1;
      return json({ progressRevision: revision });
    }
    if (path.endsWith("/events")) return json({ status: "recorded" });
    if (path.endsWith("/resume") || path.endsWith("/restart")) return json(launch());
    if (path.endsWith("/submit")) {
      return json({ receiptId: "demo-receipt", status: "received", submittedAt: now });
    }
    return json(null, 404);
  };

  // Embedded previews can leave a fullscreen request unanswered, which would
  // hang the start button. Without lockdown, fullscreen isn't needed.
  const realRequestFullscreen = Element.prototype.requestFullscreen;
  if (!integrity) Element.prototype.requestFullscreen = () => Promise.resolve();

  return () => {
    window.fetch = realFetch;
    Element.prototype.requestFullscreen = realRequestFullscreen;
  };
}

export function DemoAssessment({ slug, integrity }: { slug: string; integrity: boolean }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const renderer = getAssessmentRenderer(slug);

  useEffect(() => {
    let uninstall: (() => void) | undefined;
    let cancelled = false;
    fetch(`/demo/assessments/fixtures/${slug}.json`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("missing");
        return response.json() as Promise<Fixture>;
      })
      .then((fixture) => {
        if (cancelled) return;
        uninstall = installDemoRuntime(fixture, integrity);
        setReady(true);
      })
      .catch(() => setError("No demo data for this assessment. Rebuild the fixtures."));
    return () => {
      cancelled = true;
      uninstall?.();
    };
  }, [slug, integrity]);

  if (error) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16 text-foreground">
        <p>{error}</p>
        <Link href="/demo/assessments" className="mt-4 inline-block text-primary hover:underline">
          Back to demos
        </Link>
      </main>
    );
  }
  if (!ready || !renderer) return null;

  const ReadinessComponent = renderer.ReadinessComponent;
  return <ReadinessComponent slug={slug} candidateSessionDocumentId="demo" />;
}
