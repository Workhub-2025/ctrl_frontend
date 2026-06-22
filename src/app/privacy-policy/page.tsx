"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AccessibilityDropdown } from "@/components/accessibility/accessibility-dropdown";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { ArrowLeft, Shield, Lock, Eye, Database, Clock } from "lucide-react";
import Link from "next/link";
import { UK_LEGAL, formatUkDate } from "@/lib/legal/uk-compliance";

export default function PrivacyPolicyPage() {
  const {
    settings: accessibilitySettings,
    updateSettings: updateAccessibilitySettings,
    resetSettings: resetAccessibilitySettings,
  } = useAccessibilitySettings();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              asChild
              variant="ghost"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 text-foreground"
            >
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            <AccessibilityDropdown
              settings={accessibilitySettings}
              updateSettings={updateAccessibilitySettings}
              resetSettings={resetAccessibilitySettings}
            />
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400">
                <Shield className="h-8 w-8" />
              </div>
              <CardTitle className="text-3xl font-headline">
                Data Privacy Policy
              </CardTitle>
              <CardDescription>
                {UK_LEGAL.tradingName} — {UK_LEGAL.platformDescription}
              </CardDescription>
              <p className="text-sm text-muted-foreground mt-2">
                Last updated: {formatUkDate(UK_LEGAL.lastUpdated)}
                <br />
                Version: {UK_LEGAL.privacyPolicyVersion}
                {UK_LEGAL.icoRegistrationNumber ? (
                  <>
                    <br />
                    ICO registration: {UK_LEGAL.icoRegistrationNumber}
                  </>
                ) : null}
              </p>
            </CardHeader>

            <CardContent>
              <ScrollArea className="h-[600px] w-full rounded-md border p-6">
                <div className="space-y-6 text-sm">
                  <section>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      1. Introduction
                    </h3>
                    <p className="mb-3">
                      {UK_LEGAL.legalEntityName} (&quot;{UK_LEGAL.tradingName}&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;)
                      is committed to protecting your privacy and personal data.
                      This Data Privacy Policy explains how we collect, use,
                      store, and protect your personal information when you use
                      our assessment platform.
                    </p>
                    <p className="mb-3">
                      <strong>Data controller roles:</strong> For candidate assessment data,
                      your recruiting organisation (the client that invited you) is usually the
                      data controller and {UK_LEGAL.legalEntityName} acts as a data processor on
                      their instructions. For our own platform accounts, billing, and support,
                      {UK_LEGAL.legalEntityName} is the data controller. We comply with the UK
                      General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
                    </p>
                    <p>
                      This policy applies to all users of our platform,
                      including assessment candidates and administrative users.
                    </p>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      2. Information We Collect
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">
                          2.1 Account Information
                        </h4>
                        <ul className="list-disc pl-6 space-y-1">
                          <li>Email address (used as your login credential)</li>
                          <li>Name (first and last name)</li>
                          <li>Password (encrypted and securely stored)</li>
                          <li>Phone number (optional)</li>
                          <li>Organization affiliation</li>
                          <li>Professional role</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">
                          2.2 Assessment Data
                        </h4>
                        <ul className="list-disc pl-6 space-y-1">
                          <li>Assessment responses and answers</li>
                          <li>
                            Performance metrics (typing speed, accuracy, etc.)
                          </li>
                          <li>Time spent on assessments</li>
                          <li>Assessment scores and results</li>
                          <li>
                            Audio recordings (for call simulation assessments)
                          </li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">
                          2.3 Equality Monitoring Data (Optional)
                        </h4>
                        <ul className="list-disc pl-6 space-y-1">
                          <li>Age range</li>
                          <li>Gender identity</li>
                          <li>Ethnicity</li>
                          <li>Religion or belief</li>
                          <li>Disability information</li>
                          <li>Sexual orientation</li>
                          <li>Educational background</li>
                          <li>Employment status</li>
                        </ul>
                        <p className="text-xs text-muted-foreground mt-2">
                          Note: Equality monitoring data is completely optional
                          and is anonymized for statistical analysis.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">
                          2.4 Technical Information
                        </h4>
                        <ul className="list-disc pl-6 space-y-1">
                          <li>IP address and location data</li>
                          <li>Browser type and version</li>
                          <li>Device information</li>
                          <li>Usage analytics and platform interaction data</li>
                          <li>Cookie and tracking data</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      3. How We Use Your Information
                    </h3>
                    <div className="space-y-3">
                      <p>
                        <strong>3.1 Assessment Administration:</strong>
                      </p>
                      <ul className="list-disc pl-6 space-y-1 mb-3">
                        <li>To create and manage your account</li>
                        <li>
                          To administer assessments and record your responses
                        </li>
                        <li>
                          To calculate scores and generate performance reports
                        </li>
                        <li>
                          To provide feedback on your assessment performance
                        </li>
                      </ul>

                      <p>
                        <strong>3.2 Service Improvement:</strong>
                      </p>
                      <ul className="list-disc pl-6 space-y-1 mb-3">
                        <li>
                          To analyze platform usage and improve user experience
                        </li>
                        <li>To develop and enhance assessment methodologies</li>
                        <li>To ensure platform security and prevent fraud</li>
                      </ul>

                      <p>
                        <strong>3.3 Legal and Compliance:</strong>
                      </p>
                      <ul className="list-disc pl-6 space-y-1 mb-3">
                        <li>
                          To comply with legal obligations and regulatory
                          requirements
                        </li>
                        <li>
                          To maintain records for employment law compliance
                        </li>
                        <li>
                          To respond to legal requests and prevent illegal
                          activities
                        </li>
                      </ul>

                      <p>
                        <strong>3.4 Communication:</strong>
                      </p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>
                          To send important account and assessment notifications
                        </li>
                        <li>To provide customer support</li>
                        <li>
                          To send marketing communications (with your consent
                          only)
                        </li>
                      </ul>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3">
                      4. Legal Basis for Processing
                    </h3>
                    <div className="space-y-3">
                      <p>
                        We process your personal data under the following legal
                        bases:
                      </p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>
                          <strong>Contract:</strong> To provide assessment
                          services and manage your account
                        </li>
                        <li>
                          <strong>Legitimate Interest:</strong> To improve our
                          services and ensure platform security
                        </li>
                        <li>
                          <strong>Legal Obligation:</strong> To comply with
                          employment law and regulatory requirements
                        </li>
                        <li>
                          <strong>Consent:</strong> For marketing communications
                          and optional equality monitoring
                        </li>
                      </ul>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3">
                      5. Data Sharing and Disclosure
                    </h3>
                    <div className="space-y-3">
                      <p>
                        <strong>5.1 Prospective Employers:</strong>
                      </p>
                      <p className="mb-3">
                        Assessment results and performance data are shared with the
                        recruiting organisation that invited you (and their authorised
                        hiring managers) as part of the recruitment process. This sharing
                        is based on the controller&apos;s lawful basis (typically contract
                        or legitimate interests in recruitment). Optional equality monitoring
                        data is never shared with hiring decision-makers in identifiable form.
                      </p>

                      <p>
                        <strong>5.2 Service Providers:</strong>
                      </p>
                      <p className="mb-3">
                        We work with trusted third-party service providers who
                        help us operate the platform. A current list is published at{" "}
                        <Link href="/sub-processors" className="text-primary hover:underline">
                          /sub-processors
                        </Link>
                        . These providers are bound by appropriate data processing terms.
                      </p>

                      <p>
                        <strong>5.3 Legal Requirements:</strong>
                      </p>
                      <p className="mb-3">
                        We may disclose personal data if required by law, court
                        order, or to protect our legal rights and interests.
                      </p>

                      <p>
                        <strong>5.4 What We Never Share:</strong>
                      </p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Individual equality monitoring responses</li>
                        <li>
                          Personal data for marketing purposes without consent
                        </li>
                        <li>Data to unauthorized third parties</li>
                      </ul>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      6. Data Retention
                    </h3>
                    <div className="space-y-3">
                      <p>
                        <strong>6.1 Assessment Data:</strong> Retained for up to{" "}
                        {UK_LEGAL.assessmentDataRetentionYears} years where required for
                        employment and recruitment record-keeping, unless a shorter period is
                        agreed with the recruiting organisation or erasure applies
                      </p>
                      <p>
                        <strong>6.2 Account Information:</strong> Retained while
                        your account is active and for 7 years after closure
                      </p>
                      <p>
                        <strong>6.3 Equality Monitoring Data:</strong>{" "}
                        Anonymized after 12 months for statistical analysis
                      </p>
                      <p>
                        <strong>6.4 Technical Data:</strong> Retained for up to
                        2 years for security and analytics purposes
                      </p>

                      <div className="bg-blue-50 dark:bg-blue-950/20 text-slate-800 dark:text-slate-300 p-4 rounded-lg mt-4">
                        <p className="text-sm">
                          <strong>Note:</strong> You can request earlier
                          deletion of your data in certain circumstances.
                          Contact us to discuss your specific situation.
                        </p>
                      </div>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Lock className="h-5 w-5" />
                      7. Data Security
                    </h3>
                    <div className="space-y-3">
                      <p>
                        We implement comprehensive security measures to protect
                        your personal data:
                      </p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>
                          <strong>Encryption:</strong> All data is encrypted in
                          transit and at rest
                        </li>
                        <li>
                          <strong>Access Controls:</strong> Strict role-based
                          access to personal data
                        </li>
                        <li>
                          <strong>Monitoring:</strong> Continuous security
                          monitoring and logging
                        </li>
                        <li>
                          <strong>Regular Audits:</strong> Periodic security
                          assessments and updates
                        </li>
                        <li>
                          <strong>Staff Training:</strong> All personnel receive
                          data protection training
                        </li>
                        <li>
                          <strong>Incident Response:</strong> Procedures for
                          handling any security incidents
                        </li>
                      </ul>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3">
                      8. Your Rights
                    </h3>
                    <div className="space-y-3">
                      <p>Under UK GDPR, you have the following rights:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>
                          <strong>Right of Access:</strong> Request copies of
                          your personal data
                        </li>
                        <li>
                          <strong>Right to Rectification:</strong> Correct
                          inaccurate or incomplete data
                        </li>
                        <li>
                          <strong>Right to Erasure:</strong> Request deletion of
                          your personal data
                        </li>
                        <li>
                          <strong>Right to Restrict Processing:</strong> Limit
                          how we use your data
                        </li>
                        <li>
                          <strong>Right to Data Portability:</strong> Receive
                          your data in a structured format
                        </li>
                        <li>
                          <strong>Right to Object:</strong> Object to processing
                          based on legitimate interests
                        </li>
                        <li>
                          <strong>Right to Withdraw Consent:</strong> Withdraw
                          consent for marketing communications
                        </li>
                      </ul>

                      <div className="bg-green-50 dark:bg-green-950/20 text-slate-800 dark:text-slate-300 p-4 rounded-lg mt-4">
                        <p className="text-sm">
                          <strong>To exercise your rights:</strong> Contact us
                          at {UK_LEGAL.privacyEmail} with your
                          request. We will respond within one month.
                        </p>
                      </div>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3">
                      9. Cookies and Tracking
                    </h3>
                    <div className="space-y-3">
                      <p>
                        We use cookies to enhance your experience and provide
                        our services:
                      </p>

                      <div className="space-y-2">
                        <p>
                          <strong>Essential Cookies:</strong> Required for
                          platform functionality, security, and authentication
                        </p>
                        <p>
                          <strong>Functional Cookies:</strong> Remember your
                          preferences and enhance platform features
                        </p>
                        <p>
                          <strong>Analytics Cookies:</strong> Help us understand
                          usage patterns and improve the platform
                        </p>
                        <p>
                          <strong>Marketing Cookies:</strong> Deliver relevant
                          communications (with your consent)
                        </p>
                      </div>

                      <p>
                        You can manage your cookie preferences through our cookie banner when you
                        first visit the site, or read our{" "}
                        <Link href="/cookie-policy" className="text-primary hover:underline">
                          Cookie Policy
                        </Link>{" "}
                        for full details. Essential cookies cannot be disabled as they are
                        necessary for the platform to function.
                      </p>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3">
                      10. International Transfers
                    </h3>
                    <p className="mb-3">
                      Personal data is primarily processed in the United Kingdom and/or
                      European Economic Area via our hosting providers. Where data is
                      transferred internationally, we use appropriate safeguards (UK IDTA,
                      UK Addendum to EU SCCs, or adequacy regulations). See our{" "}
                      <Link href="/sub-processors" className="text-primary hover:underline">
                        sub-processors list
                      </Link>{" "}
                      for details.
                    </p>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3">
                      11. Automated decision-making and profiling
                    </h3>
                    <div className="space-y-3">
                      <p>
                        Assessments are scored automatically against predefined criteria.
                        Results may influence recruitment decisions made by the recruiting
                        organisation. This constitutes automated processing with significant
                        effects for candidates.
                      </p>
                      <p>
                        You have the right to request human intervention, to express your point
                        of view, and to contest a decision based solely on automated processing.
                        Contact the recruiting organisation in the first instance, or email{" "}
                        <a href={`mailto:${UK_LEGAL.privacyEmail}`} className="text-primary hover:underline">
                          {UK_LEGAL.privacyEmail}
                        </a>{" "}
                        and we will assist the controller where required.
                      </p>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3">
                      12. Changes to This Policy
                    </h3>
                    <p className="mb-3">
                      We may update this Data Privacy Policy from time to time
                      to reflect changes in our practices or legal requirements.
                      We will notify you of significant changes via email or
                      platform notifications.
                    </p>
                    <p>
                      The version number and last updated date at the top of
                      this policy will indicate when changes were made.
                    </p>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3">
                      13. Contact Us
                    </h3>
                    <div className="space-y-3">
                      <p>
                        If you have questions about this Privacy Policy or our
                        data practices, please contact us:
                      </p>

                      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                        <p>
                          <strong>Data Protection Officer:</strong>{" "}
                          {UK_LEGAL.dpoEmail}
                        </p>
                        <p>
                          <strong>General Inquiries:</strong>{" "}
                          {UK_LEGAL.supportEmail}
                        </p>
                        <p>
                          <strong>Address:</strong>
                        </p>
                        <p className="ml-4">
                          {UK_LEGAL.legalEntityName}
                        </p>
                        <p className="ml-4">Data Protection Team</p>
                        <p className="ml-4">{UK_LEGAL.registeredAddress}</p>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        You also have the right to complain to the Information
                        Commissioner's Office (ICO) if you are concerned about
                        how we process your personal data.
                      </p>
                    </div>
                  </section>

                  <div className="mt-8 p-4 border rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground">
                      This Data Privacy Policy is effective as of the date
                      listed above and applies to all users of the Emergency
                      Services Assessment Platform.
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
