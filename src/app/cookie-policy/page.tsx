"use client";

import Link from "next/link";
import { Cookie } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { UK_LEGAL } from "@/lib/legal/uk-compliance";

export default function CookiePolicyPage() {
  return (
    <LegalPageShell
      title="Cookie and Local Storage Policy"
      description={`How ${UK_LEGAL.tradingName} uses browser storage`}
      icon={Cookie}
      iconClassName="bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"
      version={UK_LEGAL.cookiePolicyVersion}
    >
      <section>
        <h2 className="mb-3 text-lg font-semibold">1. Current use</h2>
        <p>
          {UK_LEGAL.legalEntityName} uses cookies and browser storage needed to provide secure
          accounts, preserve assessment continuity, remember accessibility choices and prevent
          misuse. We do not currently load third-party analytics, behavioural advertising or
          marketing tags.
        </p>
      </section>

      <Separator />

      <section>
        <h2 className="mb-3 text-lg font-semibold">2. Storage inventory</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <caption className="sr-only">Cookies and local storage used by CTRL Assessment</caption>
            <thead>
              <tr className="border-b">
                <th scope="col" className="p-2 font-semibold">Item</th>
                <th scope="col" className="p-2 font-semibold">Purpose</th>
                <th scope="col" className="p-2 font-semibold">Typical duration</th>
              </tr>
            </thead>
            <tbody className="align-top text-muted-foreground">
              <tr className="border-b">
                <th scope="row" className="p-2 font-mono text-xs font-medium text-foreground">next-auth.session-token</th>
                <td className="p-2">Secure authentication and role-based access.</td>
                <td className="p-2">Up to 30 days, subject to idle timeout.</td>
              </tr>
              <tr className="border-b">
                <th scope="row" className="p-2 font-mono text-xs font-medium text-foreground">ctrl.totp-pending</th>
                <td className="p-2">Completes a multi-factor authentication sign-in.</td>
                <td className="p-2">Short-lived; removed after the login step.</td>
              </tr>
              <tr className="border-b">
                <th scope="row" className="p-2 font-mono text-xs font-medium text-foreground">sidebar_state</th>
                <td className="p-2">Remembers whether portal navigation is expanded.</td>
                <td className="p-2">7 days.</td>
              </tr>
              <tr className="border-b">
                <th scope="row" className="p-2 font-mono text-xs font-medium text-foreground">ctrl-accessibility-settings</th>
                <td className="p-2">Remembers display and accessibility preferences on this device.</td>
                <td className="p-2">Until site data is cleared.</td>
              </tr>
              <tr className="border-b">
                <th scope="row" className="p-2 font-mono text-xs font-medium text-foreground">ctrl_secure_lock</th>
                <td className="p-2">Coordinates secure assessment-window entry and integrity controls.</td>
                <td className="p-2">Until replaced or site data is cleared.</td>
              </tr>
              <tr className="border-b">
                <th scope="row" className="p-2 font-mono text-xs font-medium text-foreground">ctrl_pending_abandon:*</th>
                <td className="p-2">Queues an assessment-abandonment update if the network is unavailable.</td>
                <td className="p-2">Until successfully synchronised or site data is cleared.</td>
              </tr>
              <tr className="border-b">
                <th scope="row" className="p-2 font-mono text-xs font-medium text-foreground">ctrl:last-assessment-completed</th>
                <td className="p-2">Refreshes the candidate dashboard after an assessment is submitted.</td>
                <td className="p-2">Until replaced or site data is cleared.</td>
              </tr>
              <tr>
                <th scope="row" className="p-2 font-mono text-xs font-medium text-foreground">ctrl-storage-notice-dismissed-at</th>
                <td className="p-2">Prevents the storage notice from appearing on every visit.</td>
                <td className="p-2">Until site data is cleared.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <Separator />

      <section>
        <h2 className="mb-3 text-lg font-semibold">3. Third-party services</h2>
        <p>
          Stripe Checkout may set its own cookies when an authorised client administrator enters
          the hosted payment service. Provider information is maintained on the{" "}
          <Link href="/sub-processors" className="text-primary underline underline-offset-4">
            subprocessor page
          </Link>
          . CTRL does not place Stripe cookies on candidate assessment pages.
        </p>
      </section>

      <Separator />

      <section>
        <h2 className="mb-3 text-lg font-semibold">4. Your controls</h2>
        <p className="mb-3">
          You can clear cookies and local storage in your browser. Doing so signs you out, resets
          accessibility preferences and may remove locally queued assessment-recovery information.
        </p>
        <p>
          If optional analytics or marketing technologies are introduced later, this policy and
          the interface will be updated before they load. Where consent is required, rejecting them
          will be as easy as accepting them.
        </p>
      </section>

      <Separator />

      <section>
        <h2 className="mb-3 text-lg font-semibold">5. Contact</h2>
        <p>
          Questions about browser storage can be sent to{" "}
          <a href={`mailto:${UK_LEGAL.privacyEmail}`} className="text-primary underline underline-offset-4">
            {UK_LEGAL.privacyEmail}
          </a>
          . Read the <Link href="/privacy-policy" className="text-primary underline underline-offset-4">Privacy Policy</Link> for wider information about personal data.
        </p>
      </section>
    </LegalPageShell>
  );
}
