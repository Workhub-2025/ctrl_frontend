"use client";

import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Accessibility } from "lucide-react";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { UK_LEGAL } from "@/lib/legal/uk-compliance";

export default function AccessibilityStatementPage() {
  return (
    <LegalPageShell
      title="Accessibility Statement"
      description={`${UK_LEGAL.tradingName} — commitment to inclusive assessment delivery`}
      icon={Accessibility}
      iconClassName="bg-violet-100 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400"
      version="1.0"
    >
      <section>
        <h3 className="mb-3 text-lg font-semibold">1. Our commitment</h3>
        <p>
          {UK_LEGAL.legalEntityName} is committed to making {UK_LEGAL.tradingName} accessible to
          candidates and portal users, including people with disabilities and neurodivergent users
          taking high-stakes operational assessments.
        </p>
      </section>

      <Separator />

      <section>
        <h3 className="mb-3 text-lg font-semibold">2. Conformance target</h3>
        <p className="mb-3">
          We aim to conform with the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA for
          public pages and authenticated portal surfaces. Assessment content is designed with
          adjustable typography, spacing, contrast themes, and reduced-motion support.
        </p>
        <p>
          This statement is partially conformant: core accessibility controls are implemented;
          formal third-party WCAG audit certification is planned.
        </p>
      </section>

      <Separator />

      <section>
        <h3 className="mb-3 text-lg font-semibold">3. Built-in accessibility features</h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>Text size scaling (large and extra-large)</li>
          <li>Comfortable and spacious line spacing for reading-heavy assessments</li>
          <li>Font preferences including dyslexia-friendly options</li>
          <li>High contrast, grayscale, and reduced saturation modes</li>
          <li>Reduced motion for animations and transitions</li>
          <li>Underline-all-links mode</li>
          <li>Distinct light and dark theme presets with accessible contrast targets</li>
        </ul>
      </section>

      <Separator />

      <section>
        <h3 className="mb-3 text-lg font-semibold">4. Reasonable adjustments</h3>
        <p className="mb-3">
          If you require an adjustment not available in the platform (for example extra time,
          alternative assessment format, or assistive technology support), contact the recruiting
          organisation that invited you, or email{" "}
          <a href={`mailto:${UK_LEGAL.supportEmail}`} className="text-primary hover:underline">
            {UK_LEGAL.supportEmail}
          </a>{" "}
          with the subject line &quot;Reasonable adjustment request&quot;.
        </p>
        <p>
          Recruiting organisations remain responsible for Equality Act reasonable-adjustment
          decisions; we support them with configurable sessions and audit trails.
        </p>
      </section>

      <Separator />

      <section>
        <h3 className="mb-3 text-lg font-semibold">5. Feedback and enforcement</h3>
        <p className="mb-3">
          Email accessibility feedback to{" "}
          <a href={`mailto:${UK_LEGAL.supportEmail}`} className="text-primary hover:underline">
            {UK_LEGAL.supportEmail}
          </a>
          . We aim to respond within 5 working days.
        </p>
        <p>
          If you are not satisfied with our response, you may contact the Equality Advisory and
          Support Service (EASS) or, for public sector users, your organisation&apos;s complaints
          procedure.
        </p>
      </section>

      <Separator />

      <section>
        <h3 className="mb-3 text-lg font-semibold">6. Related documents</h3>
        <p>
          <Link href="/privacy-policy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          {" · "}
          <Link href="/terms-conditions" className="text-primary hover:underline">
            Terms &amp; Conditions
          </Link>
        </p>
      </section>
    </LegalPageShell>
  );
}
