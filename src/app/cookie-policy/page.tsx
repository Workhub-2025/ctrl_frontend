"use client";

import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Cookie } from "lucide-react";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { UK_LEGAL } from "@/lib/legal/uk-compliance";

export default function CookiePolicyPage() {
  return (
    <LegalPageShell
      title="Cookie Policy"
      description={`How ${UK_LEGAL.tradingName} uses cookies and similar technologies`}
      icon={Cookie}
      iconClassName="bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
      version={UK_LEGAL.cookiePolicyVersion}
    >
      <section>
        <h3 className="mb-3 text-lg font-semibold">1. Who we are</h3>
        <p>
          This Cookie Policy explains how {UK_LEGAL.legalEntityName} ({UK_LEGAL.tradingName}) uses
          cookies and similar browser storage on{" "}
          <a href={UK_LEGAL.websiteUrl} className="text-primary hover:underline">
            {UK_LEGAL.websiteUrl.replace(/^https?:\/\//, "")}
          </a>
          . It should be read alongside our{" "}
          <Link href="/privacy-policy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      <Separator />

      <section>
        <h3 className="mb-3 text-lg font-semibold">2. What are cookies?</h3>
        <p>
          Cookies are small text files stored on your device when you visit a website. We also use
          similar technologies such as browser <strong>local storage</strong> for preferences that
          do not leave your device. Cookies can be &quot;session&quot; (deleted when you close the
          browser) or &quot;persistent&quot; (kept for a defined period).
        </p>
      </section>

      <Separator />

      <section>
        <h3 className="mb-3 text-lg font-semibold">3. How we use cookies</h3>
        <p className="mb-4">
          We group cookies and similar storage into the categories below. When you first visit the
          site, our cookie banner lets you accept all categories, accept only necessary ones, or
          choose custom preferences.
        </p>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-foreground">Necessary (always on)</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Required for secure login, session management, fraud prevention, and core platform
              operation. These cannot be switched off via the banner.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
              <li>
                <strong>Session authentication</strong> —{" "}
                <code className="text-xs">next-auth.session-token</code> or{" "}
                <code className="text-xs">__Secure-next-auth.session-token</code> (httpOnly, up to
                30 days; idle timeout may apply)
              </li>
              <li>
                <strong>Two-factor login step</strong> —{" "}
                <code className="text-xs">ctrl.totp-pending</code> or{" "}
                <code className="text-xs">__Secure-ctrl.totp-pending</code> (short-lived, during
                TOTP verification only)
              </li>
              <li>
                <strong>Security and API integrity</strong> — CSRF and related tokens set when
                required for authenticated requests
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground">Functional (optional)</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Remember choices that improve usability. If you decline functional cookies, some
              preferences may reset between visits.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
              <li>
                <strong>Cookie consent record</strong> —{" "}
                <code className="text-xs">cookie-consent</code> and{" "}
                <code className="text-xs">cookie-consent-date</code> in local storage
              </li>
              <li>
                <strong>Accessibility preferences</strong> — text size, contrast, spacing, and
                related display settings stored locally for portal and assessment surfaces
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground">Analytics (optional)</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Help us understand aggregate usage to improve performance and content. We do not
              currently load third-party analytics scripts by default. If we introduce analytics
              tools in future, they will only run when you consent via the cookie banner.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground">Marketing (optional)</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Used for personalised communications or advertising measurement. We do not currently
              use marketing cookies on the platform. Any future marketing tags will respect your
              banner choice.
            </p>
          </div>
        </div>
      </section>

      <Separator />

      <section>
        <h3 className="mb-3 text-lg font-semibold">4. Managing your preferences</h3>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Use the cookie banner on your first visit, or clear site data in your browser and reload
            to see it again.
          </li>
          <li>
            Essential cookies remain active because the platform cannot operate securely without
            them.
          </li>
          <li>
            You can block or delete cookies through your browser settings; doing so may prevent
            login or assessment delivery.
          </li>
        </ul>
      </section>

      <Separator />

      <section>
        <h3 className="mb-3 text-lg font-semibold">5. Third-party cookies</h3>
        <p>
          Payment checkout (Stripe) and embedded content may set their own cookies when you interact
          with those services. Their use is governed by the relevant provider&apos;s policy. See our{" "}
          <Link href="/sub-processors" className="text-primary hover:underline">
            Sub-processors
          </Link>{" "}
          page for current vendors.
        </p>
      </section>

      <Separator />

      <section>
        <h3 className="mb-3 text-lg font-semibold">6. Contact</h3>
        <p>
          Questions about this Cookie Policy:{" "}
          <a href={`mailto:${UK_LEGAL.privacyEmail}`} className="text-primary hover:underline">
            {UK_LEGAL.privacyEmail}
          </a>
          . For general support:{" "}
          <a href={`mailto:${UK_LEGAL.supportEmail}`} className="text-primary hover:underline">
            {UK_LEGAL.supportEmail}
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
