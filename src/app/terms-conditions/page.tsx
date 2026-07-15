"use client"

import Link from "next/link"
import { Scale } from "lucide-react"

import { LegalPageShell } from "@/components/legal/legal-page-shell"
import { UK_LEGAL } from "@/lib/legal/uk-compliance"

export default function TermsConditionsPage() {
  return (
    <LegalPageShell
      title="Platform Terms of Use"
      description="The rules for accessing and using the CTRL Assessment Platform"
      icon={Scale}
      version={UK_LEGAL.termsVersion}
    >
      <section>
        <h2>1. Scope and acceptance</h2>
        <p>
          These terms apply when you access the CTRL Assessment Platform as a
          candidate, hiring manager, client administrator, or platform
          administrator. By using the platform, you agree to follow these
          terms. Your organisation may also have a separate service agreement
          with CTRL that governs its use of the platform.
        </p>
      </section>

      <section>
        <h2>2. Accounts and access</h2>
        <p>
          Keep your sign-in details secure, use only the account assigned to
          you, and tell us promptly if you suspect unauthorised access. Access
          is role-based and may be suspended where necessary to protect users,
          assessment integrity, or the platform.
        </p>
      </section>

      <section>
        <h2>3. Assessment integrity</h2>
        <p>
          Candidates must complete assessments themselves unless an approved
          adjustment expressly permits assistance. Do not copy, distribute,
          record, reverse engineer, or disclose assessment content. Attempts to
          impersonate another person, manipulate results, or bypass security
          controls may invalidate an assessment.
        </p>
      </section>

      <section>
        <h2>4. Accessibility and reasonable adjustments</h2>
        <p>
          We support reasonable adjustments and aim to make requests without
          disadvantaging candidates. If you need an adjustment, contact the
          recruiting organisation or use the platform support route as early as
          possible. See our{" "}
          <Link href="/accessibility-statement">Accessibility Statement</Link>{" "}
          for more information.
        </p>
      </section>

      <section>
        <h2>5. Results and hiring decisions</h2>
        <p>
          Assessment outputs are decision-support information. Recruiting
          organisations remain responsible for interpreting results and making
          employment decisions. CTRL does not guarantee a particular hiring
          outcome, job offer, or candidate performance.
        </p>
      </section>

      <section>
        <h2>6. Privacy and retention</h2>
        <p>
          Personal data is handled as described in the{" "}
          <Link href="/privacy-policy">Privacy Notice</Link>. Candidate
          assessment data is retained according to the recruiting
          organisation&apos;s configured retention schedule and applicable
          legal requirements; it is not subject to a blanket seven-year
          platform rule.
        </p>
        <p>
          The platform currently uses only storage that is necessary for
          security, authentication, preferences, and core service operation.
          Details are in the <Link href="/cookie-policy">Cookie Notice</Link>.
        </p>
      </section>

      <section>
        <h2>7. Acceptable use</h2>
        <p>
          Do not use the platform unlawfully, interfere with its operation,
          probe it without permission, upload malicious content, or attempt to
          access another user&apos;s or organisation&apos;s data. You must not
          use platform content in a way that infringes intellectual property or
          confidentiality rights.
        </p>
      </section>

      <section>
        <h2>8. Service operation</h2>
        <p>
          We may maintain, update, or temporarily restrict the service where
          reasonably necessary for security, reliability, or legal compliance.
          Where practical, affected organisations will receive notice of
          material planned changes or downtime through their agreed support
          channel.
        </p>
      </section>

      <section>
        <h2>9. Changes to these terms</h2>
        <p>
          We may update these terms when the platform, law, or our operating
          practices change. The version and date above identify the terms in
          force. Material changes will be communicated through an appropriate
          channel.
        </p>
      </section>

      <section>
        <h2>10. Governing law and contact</h2>
        <p>
          These terms are governed by the laws of{" "}
          {UK_LEGAL.registrationJurisdiction}. Courts in that jurisdiction have
          jurisdiction, subject to any different terms in an organisation&apos;s
          service agreement.
        </p>
        <p>
          Questions about these terms can be sent to{" "}
          <a href={`mailto:${UK_LEGAL.legalEmail}`}>
            {UK_LEGAL.legalEmail}
          </a>
          .
        </p>
        <p>
          {UK_LEGAL.legalEntityName}
          {UK_LEGAL.companyNumber
            ? `, company number ${UK_LEGAL.companyNumber}`
            : ""}
          {UK_LEGAL.registeredAddress
            ? `, registered at ${UK_LEGAL.registeredAddress}`
            : ""}
          .
        </p>
      </section>
    </LegalPageShell>
  )
}
