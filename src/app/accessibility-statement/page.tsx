"use client"

import Link from "next/link"
import { Accessibility } from "lucide-react"

import { LegalPageShell } from "@/components/legal/legal-page-shell"
import { UK_LEGAL } from "@/lib/legal/uk-compliance"

export default function AccessibilityStatementPage() {
  return (
    <LegalPageShell
      title="Accessibility Statement"
      description={`${UK_LEGAL.tradingName}'s approach to inclusive assessment delivery`}
      icon={Accessibility}
      iconClassName="bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300"
      version="1.1"
    >
      <section>
        <h2>1. Our commitment</h2>
        <p>
          {UK_LEGAL.legalEntityName} aims to make its public pages,
          authenticated portals, and assessment experiences usable by disabled
          and neurodivergent people. Our target is WCAG 2.2 Level AA.
        </p>
      </section>

      <section>
        <h2>2. Current status</h2>
        <p>
          The service has not yet completed an independent, full WCAG 2.2
          audit, so we do not claim formal conformance. We test core journeys
          with keyboard navigation, visible focus, semantic controls, contrast
          checks, text resizing, and reduced-motion preferences. Outstanding
          issues identified through testing are prioritised according to user
          impact.
        </p>
      </section>

      <section>
        <h2>3. Available features</h2>
        <ul>
          <li>Keyboard-accessible navigation and skip links on core layouts.</li>
          <li>Text-size and line-spacing preferences.</li>
          <li>High-contrast, grayscale, and reduced-saturation display modes.</li>
          <li>Reduced-motion and underline-links preferences.</li>
          <li>Light and dark themes.</li>
        </ul>
        <p>
          These options can help, but they do not replace compatibility with
          browser and operating-system accessibility settings.
        </p>
      </section>

      <section>
        <h2>4. Reasonable adjustments</h2>
        <p>
          If you need extra time, an alternative format, assistive-technology
          support, or another adjustment, contact the recruiting organisation
          that invited you or email{" "}
          <a href={`mailto:${UK_LEGAL.supportEmail}`}>
            {UK_LEGAL.supportEmail}
          </a>{" "}
          as early as possible. Requesting an adjustment should not disadvantage
          you in the recruitment process.
        </p>
      </section>

      <section>
        <h2>5. Feedback</h2>
        <p>
          If you cannot access any part of the platform, email{" "}
          <a href={`mailto:${UK_LEGAL.supportEmail}`}>
            {UK_LEGAL.supportEmail}
          </a>
          . Include the page, task, assistive technology or browser used, and
          the format you need where you are comfortable doing so. We aim to
          acknowledge accessibility reports within five working days.
        </p>
        <p>
          If you are not satisfied with the response, you can contact the
          Equality Advisory and Support Service or use the recruiting
          organisation&apos;s complaints process.
        </p>
      </section>

      <section>
        <h2>6. Related information</h2>
        <p>
          Read the <Link href="/privacy-policy">Privacy Notice</Link> and{" "}
          <Link href="/terms-conditions">Platform Terms of Use</Link>.
        </p>
      </section>
    </LegalPageShell>
  )
}
