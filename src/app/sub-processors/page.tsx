"use client";

import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Globe } from "lucide-react";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { UK_LEGAL, UK_SUB_PROCESSOR_CATEGORIES } from "@/lib/legal/uk-compliance";

export default function SubProcessorsPage() {
  return (
    <LegalPageShell
      title="Sub-processors"
      description={`Third-party processors used by ${UK_LEGAL.tradingName}`}
      icon={Globe}
      iconClassName="bg-cyan-100 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400"
      version={UK_LEGAL.privacyPolicyVersion}
    >
      <section>
        <h3 className="mb-3 text-lg font-semibold">1. Overview</h3>
        <p className="mb-3">
          {UK_LEGAL.legalEntityName} ({UK_LEGAL.tradingName}) uses the categories of sub-processors
          below. Vendor names reflect our <strong>current or planned</strong> infrastructure and
          will be updated when hosting changes (for example a move from Vercel to AWS, or to Strapi
          Cloud).
        </p>
        <p>
          Client organisations (data controllers for candidate assessment data) may request an
          updated list at any time by emailing{" "}
          <a href={`mailto:${UK_LEGAL.privacyEmail}`} className="text-primary hover:underline">
            {UK_LEGAL.privacyEmail}
          </a>
          .
        </p>
      </section>

      <Separator />

      <section>
        <h3 className="mb-3 text-lg font-semibold">2. Processor categories</h3>
        <div className="space-y-4">
          {UK_SUB_PROCESSOR_CATEGORIES.map((processor) => (
            <div key={processor.category} className="rounded-lg border p-4">
              <p className="font-medium">{processor.category}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Purpose:</strong> {processor.purpose}
                </li>
                <li>
                  <strong className="text-foreground">Current vendor:</strong>{" "}
                  {processor.currentVendor}
                </li>
                <li>
                  <strong className="text-foreground">Location:</strong> {processor.location}
                </li>
                <li>
                  <strong className="text-foreground">Safeguard:</strong> {processor.safeguard}
                </li>
              </ul>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      <section>
        <h3 className="mb-3 text-lg font-semibold">3. International transfers</h3>
        <p>
          Where a sub-processor processes personal data outside the UK, we rely on appropriate
          transfer safeguards (UK International Data Transfer Agreement, UK Addendum to EU SCCs, or
          adequacy regulations) as applicable. Confirm deployment regions in your contract DPIA and
          keep production configuration aligned with this page.
        </p>
      </section>

      <Separator />

      <section>
        <h3 className="mb-3 text-lg font-semibold">4. Changes</h3>
        <p>
          We will notify client administrators of material sub-processor changes via email or
          in-platform notice. Objections should be sent to{" "}
          <a href={`mailto:${UK_LEGAL.legalEmail}`} className="text-primary hover:underline">
            {UK_LEGAL.legalEmail}
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
