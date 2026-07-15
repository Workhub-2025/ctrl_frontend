"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { UK_LEGAL } from "@/lib/legal/uk-compliance";

export default function PrivacyPolicyPage() {
  const configuredRetentionMonths = UK_LEGAL.assessmentDataRetentionMonths;

  return (
    <LegalPageShell
      title="Privacy Policy"
      description={`How ${UK_LEGAL.tradingName} handles personal data`}
      icon={Shield}
      version={UK_LEGAL.privacyPolicyVersion}
    >
      <section>
        <h2 className="mb-3 text-lg font-semibold">1. Who is responsible for your data</h2>
        <p className="mb-3">
          The organisation that invited a candidate is normally the data controller for
          recruitment, assessment responses, scores and hiring decisions. {UK_LEGAL.legalEntityName}{" "}
          acts as its processor and follows its documented instructions.
        </p>
        <p>
          {UK_LEGAL.legalEntityName} is a controller for its own customer contacts, user accounts,
          billing, security, support and business administration. If we use personal data for a
          purpose of our own, we identify and document the appropriate controller basis first.
        </p>
      </section>

      <Separator />

      <section>
        <h2 className="mb-3 text-lg font-semibold">2. Information processed</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Identity, account, contact, organisation and role information.</li>
          <li>Assessment answers, structured incident logs, scores, timing and completion data.</li>
          <li>Typing speed, accuracy and other metrics required by the selected assessment.</li>
          <li>Session, device, IP, authentication, audit and assessment-integrity events.</li>
          <li>Support conversations, adjustment requests and administrative actions.</li>
          <li>Optional equality-monitoring responses where the feature is offered.</li>
          <li>Customer contract, entitlement and billing records.</li>
        </ul>
        <p className="mt-3">
          Call-simulation assessments play prerecorded audio and collect the candidate&apos;s typed
          structured response. The current platform does not record the candidate&apos;s microphone or voice.
        </p>
      </section>

      <Separator />

      <section>
        <h2 className="mb-3 text-lg font-semibold">3. Purposes and lawful bases</h2>
        <p className="mb-3">
          The recruiting organisation determines its lawful basis for assessment and recruitment.
          This is commonly legitimate interests, steps associated with recruitment, or a legal
          obligation, depending on its circumstances. CTRL processes that information under the
          customer&apos;s instructions and Article 28 contract.
        </p>
        <p className="mb-3">
          Where CTRL is controller, we use data to provide and secure accounts, support customers,
          administer contracts, prevent misuse, maintain audit records and meet legal obligations.
          We document the relevant contract, legitimate-interest or legal-obligation basis by purpose.
        </p>
        <p>
          Marketing is optional and based on consent where consent is required. A candidate&apos;s required
          registration acknowledgement confirms that they have read this notice; it is not treated as
          consent to the core recruitment assessment processing.
        </p>
      </section>

      <Separator />

      <section>
        <h2 className="mb-3 text-lg font-semibold">4. Equality monitoring and adjustments</h2>
        <p className="mb-3">
          Equality monitoring is optional. Some answers, including ethnicity, religion, health,
          disability and sexual orientation, are special-category data. The recruiting organisation
          must identify an Article 6 basis and Article 9 condition before offering the feature.
        </p>
        <p className="mb-3">
          Identifiable monitoring responses are kept separate from hiring decisions and are not shown
          to hiring managers in identifiable form. Statistical outputs should use suitable cohort and
          disclosure controls. Identifiable responses are removed after {UK_LEGAL.equalityMonitoringRetentionMonths} months.
        </p>
        <p>
          Reasonable-adjustment requests use the separate support workflow so that operational support
          can act without placing unnecessary medical details in equality-monitoring data.
        </p>
      </section>

      <Separator />

      <section>
        <h2 className="mb-3 text-lg font-semibold">5. Automated scoring and recruitment decisions</h2>
        <p className="mb-3">
          The platform scores responses against configured criteria and may use an AI service to assist
          with call-simulation rubric scoring. Scores, explanations and integrity indicators support the
          recruiting organisation; they should not be treated as proof of misconduct or as a substitute
          for meaningful human judgement.
        </p>
        <p>
          The recruiting organisation decides whether and how a score affects progression. If it makes a
          significant decision solely by automated means, it must provide the applicable safeguards,
          including information about the decision, a route to express a view, meaningful human
          intervention and a way to contest it. Contact the recruiting organisation first or email{" "}
          <a href={`mailto:${UK_LEGAL.privacyEmail}`} className="text-primary underline underline-offset-4">
            {UK_LEGAL.privacyEmail}
          </a>{" "}
          so CTRL can assist the controller.
        </p>
      </section>

      <Separator />

      <section>
        <h2 className="mb-3 text-lg font-semibold">6. Recipients and international processing</h2>
        <p className="mb-3">
          Assessment information is available to authorised users of the recruiting organisation.
          Service providers support hosting, storage, security, email, billing and AI-assisted scoring.
          The current inventory is published on the{" "}
          <Link href="/sub-processors" className="text-primary underline underline-offset-4">
            subprocessor page
          </Link>
          .
        </p>
        <p>
          Where personal data is transferred outside the UK, the responsible controller assesses the
          transfer and uses an adequacy regulation, UK International Data Transfer Agreement, UK
          Addendum or other lawful safeguard where required.
        </p>
      </section>

      <Separator />

      <section>
        <h2 className="mb-3 text-lg font-semibold">7. Retention and deletion</h2>
        <p className="mb-3">
          Candidate assessment retention is set by the recruiting organisation&apos;s documented schedule
          and recorded on its CTRL contract. The platform&apos;s currently configured operational default is
          {" "}{configuredRetentionMonths} months where a customer-specific period has not been recorded;
          live production cannot start until that default has been approved and configured.
        </p>
        <p className="mb-3">
          Different periods apply to account, billing, security, support and equality-monitoring data.
          Data may be retained longer where a documented legal hold applies. At the end of a period,
          candidate identifiers and raw assessment payloads are deleted or de-identified through the
          retention process, with backup expiry handled through the infrastructure retention cycle.
        </p>
        <p>
          Account deletion is not absolute where the controller must retain particular records. CTRL
          and the recruiting organisation assess erasure requests against the applicable purpose and law.
        </p>
      </section>

      <Separator />

      <section>
        <h2 className="mb-3 text-lg font-semibold">8. Your rights</h2>
        <p className="mb-3">
          Depending on the circumstances, UK data-protection rights include access, rectification,
          erasure, restriction, portability, objection and safeguards relating to automated decisions.
          Consent can be withdrawn for processing that genuinely relies on consent.
        </p>
        <p>
          Candidates should contact the recruiting organisation as controller. CTRL provides account
          export and erasure-request tools and assists customer controllers. Requests can also be sent to{" "}
          <a href={`mailto:${UK_LEGAL.privacyEmail}`} className="text-primary underline underline-offset-4">
            {UK_LEGAL.privacyEmail}
          </a>
          . You may complain to the UK Information Commissioner&apos;s Office.
        </p>
      </section>

      <Separator />

      <section>
        <h2 className="mb-3 text-lg font-semibold">9. Security</h2>
        <p>
          CTRL applies role and tenant access controls, server-held authentication tokens, rate limits,
          security headers, audit events and assessment-integrity controls. Service providers and
          production infrastructure must use appropriate encryption, access control, backup and incident
          procedures. Security controls are reviewed and tested as the platform and risks change.
        </p>
      </section>

      <Separator />

      <section>
        <h2 className="mb-3 text-lg font-semibold">10. Contact and registration details</h2>
        <dl className="grid gap-2 sm:grid-cols-[12rem_1fr]">
          <dt className="font-medium">Legal entity</dt>
          <dd>{UK_LEGAL.legalEntityName}</dd>
          <dt className="font-medium">Company number</dt>
          <dd>{UK_LEGAL.companyNumber || "Not configured for this non-live environment"}</dd>
          <dt className="font-medium">Registered office</dt>
          <dd>{UK_LEGAL.registeredAddress || "Not configured for this non-live environment"}</dd>
          <dt className="font-medium">Registration</dt>
          <dd>{UK_LEGAL.registrationJurisdiction}</dd>
          <dt className="font-medium">ICO registration</dt>
          <dd>{UK_LEGAL.icoRegistrationNumber || "Not configured for this non-live environment"}</dd>
          <dt className="font-medium">Privacy contact</dt>
          <dd>
            <a href={`mailto:${UK_LEGAL.privacyLeadEmail}`} className="text-primary underline underline-offset-4">
              {UK_LEGAL.privacyLeadEmail}
            </a>
          </dd>
        </dl>
      </section>
    </LegalPageShell>
  );
}
