"use client";

import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { FileText } from "lucide-react";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { UK_LEGAL } from "@/lib/legal/uk-compliance";

export default function DataProcessingAgreementPage() {
  return (
    <LegalPageShell
      title="Data Processing Agreement (Summary)"
      description={`UK GDPR Article 28 processor terms for ${UK_LEGAL.tradingName} client organisations`}
      icon={FileText}
      iconClassName="bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
      version="1.0"
    >
      <section>
        <h3 className="mb-3 text-lg font-semibold">1. Roles</h3>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Client organisation</strong> — data controller for candidate and employee
            assessment data processed through the platform.
          </li>
          <li>
            <strong>{UK_LEGAL.legalEntityName}</strong> — data processor when handling candidate
            assessment data on the client&apos;s instructions.
          </li>
          <li>
            <strong>{UK_LEGAL.legalEntityName}</strong> — data controller for its own client admin,
            billing, and platform account data.
          </li>
        </ul>
      </section>

      <Separator />

      <section>
        <h3 className="mb-3 text-lg font-semibold">2. Subject matter and duration</h3>
        <p>
          Processing is limited to delivering operational assessments, scoring, reporting, audit
          logs, and related recruitment workflows for the duration of the client contract plus any
          statutory or agreed retention period.
        </p>
      </section>

      <Separator />

      <section>
        <h3 className="mb-3 text-lg font-semibold">3. Categories of data and subjects</h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Data subjects:</strong> candidates, hiring managers, client administrators
          </li>
          <li>
            <strong>Personal data:</strong> identity, contact details, assessment responses, scores,
            session metadata, optional equality monitoring (where consented)
          </li>
          <li>
            <strong>Special category data:</strong> optional equality monitoring fields only, where
            explicitly consented by the candidate
          </li>
        </ul>
      </section>

      <Separator />

      <section>
        <h3 className="mb-3 text-lg font-semibold">4. Processor obligations</h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>Process personal data only on documented client instructions</li>
          <li>Ensure personnel confidentiality and security training</li>
          <li>Implement technical and organisational security measures (see platform security documentation)</li>
          <li>Assist with data subject rights requests where applicable</li>
          <li>Notify clients without undue delay of personal data breaches</li>
          <li>Delete or return data at contract end, subject to lawful retention</li>
          <li>Make available information necessary to demonstrate compliance</li>
        </ul>
      </section>

      <Separator />

      <section>
        <h3 className="mb-3 text-lg font-semibold">5. Sub-processors</h3>
        <p>
          Authorised sub-processors are listed on our{" "}
          <Link href="/sub-processors" className="text-primary hover:underline">
            Sub-processors page
          </Link>
          . Clients will be notified of material changes.
        </p>
      </section>

      <Separator />

      <section>
        <h3 className="mb-3 text-lg font-semibold">6. International transfers</h3>
        <p>
          Transfers outside the UK use appropriate safeguards (UK IDTA / SCCs) where required.
          Clients should confirm deployment regions align with their own DPIA and contract
          requirements.
        </p>
      </section>

      <Separator />

      <section>
        <h3 className="mb-3 text-lg font-semibold">7. Executed DPA</h3>
        <p>
          This page is a summary for procurement reviews. A countersigned DPA is provided with
          enterprise contracts. Request a copy at{" "}
          <a href={`mailto:${UK_LEGAL.legalEmail}`} className="text-primary hover:underline">
            {UK_LEGAL.legalEmail}
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
