import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { assessmentDemosEnabled, readDemoIndex } from "./demo-fixtures";

export const metadata: Metadata = {
  title: "Assessment demos",
  robots: { index: false, follow: false },
};

export default async function AssessmentDemosPage() {
  if (!assessmentDemosEnabled) notFound();
  const demos = await readDemoIndex();

  return (
    <main className="mx-auto min-h-[100dvh] max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
        Assessment demos
      </h1>
      <p className="mt-3 max-w-[60ch] text-muted-foreground">
        Each assessment runs with its real content and the real shell, but nothing is
        sent to the backend and nothing is scored. Local development only.
      </p>

      {demos ? (
        <ul className="mt-10 divide-y divide-border border-y border-border">
          {demos.map((demo) => (
            <li key={demo.slug} className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="font-medium text-foreground">{demo.title}</p>
                <p className="text-sm text-muted-foreground">
                  {demo.slug} · release {demo.releaseVersion}
                </p>
              </div>
              <div className="flex shrink-0 gap-4 text-sm font-medium">
                <Link className="text-primary hover:underline" href={`/demo/assessments/${demo.slug}`}>
                  Open
                </Link>
                <Link
                  className="text-muted-foreground hover:underline"
                  href={`/demo/assessments/${demo.slug}?integrity=on`}
                >
                  With lockdown
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
          No demo data yet. From <code>Platform/firebase-backend</code>, run{" "}
          <code>npx tsx ../../FrontEnd/scripts/build-assessment-demo-fixtures.mts</code>.
        </p>
      )}
    </main>
  );
}
