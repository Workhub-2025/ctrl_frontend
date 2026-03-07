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
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ArrowLeft, FileText, Scale } from "lucide-react";
import Link from "next/link";

export default function TermsConditionsPage() {
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
            <ThemeToggle />
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Scale className="h-8 w-8" />
              </div>
              <CardTitle className="text-3xl font-headline">
                Terms & Conditions
              </CardTitle>
              <CardDescription>
                Emergency Services Assessment Platform
              </CardDescription>
              <p className="text-sm text-muted-foreground mt-2">
                Last updated:{" "}
                {new Date().toLocaleDateString("en-GB", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </CardHeader>

            <CardContent>
              <ScrollArea className="h-[600px] w-full rounded-md border p-6">
                <div className="space-y-6 text-sm">
                  <section>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      1. Introduction and Acceptance
                    </h3>
                    <p className="mb-3">
                      Welcome to the Emergency Services Assessment Platform
                      ("Platform", "Service", "we", "us", "our"). These Terms
                      and Conditions ("Terms") govern your use of our assessment
                      platform and services.
                    </p>
                    <p className="mb-3">
                      By accessing or using our Platform, you agree to be bound
                      by these Terms. If you do not agree with any part of these
                      Terms, you must not use our Platform.
                    </p>
                    <p>
                      These Terms apply to all users of the Platform, including
                      candidates taking assessments and administrative users
                      managing the system.
                    </p>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3">
                      2. Account Registration and Use
                    </h3>
                    <div className="space-y-3">
                      <p>
                        <strong>2.1 Registration Requirements:</strong> To use
                        our Platform, you must create an account by providing
                        accurate, complete, and current information including
                        your email address, which will serve as your login
                        credential.
                      </p>
                      <p>
                        <strong>2.2 Account Security:</strong> You are
                        responsible for maintaining the confidentiality of your
                        login credentials and for all activities that occur
                        under your account.
                      </p>
                      <p>
                        <strong>2.3 Accurate Information:</strong> You agree to
                        provide true, accurate, current, and complete
                        information during registration and to keep this
                        information updated.
                      </p>
                      <p>
                        <strong>2.4 Single Account:</strong> Each user may
                        maintain only one account. Multiple accounts for the
                        same individual are prohibited.
                      </p>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3">
                      3. Assessment Process and Conduct
                    </h3>
                    <div className="space-y-3">
                      <p>
                        <strong>3.1 Assessment Integrity:</strong> All
                        assessments must be completed honestly and
                        independently. Any form of cheating, fraud, or
                        misrepresentation is strictly prohibited.
                      </p>
                      <p>
                        <strong>3.2 Technical Requirements:</strong> You are
                        responsible for ensuring you have adequate internet
                        connectivity and compatible hardware to complete
                        assessments.
                      </p>
                      <p>
                        <strong>3.3 Assessment Environment:</strong> Assessments
                        should be completed in a quiet, distraction-free
                        environment as specified in the assessment instructions.
                      </p>
                      <p>
                        <strong>3.4 Time Limits:</strong> All assessments have
                        specified time limits that must be observed. Extensions
                        are only available in exceptional circumstances.
                      </p>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3">
                      4. Data Protection and Privacy
                    </h3>
                    <div className="space-y-3">
                      <p>
                        <strong>4.1 Data Collection:</strong> We collect
                        personal information necessary for assessment
                        administration and user account management. This
                        includes contact details, assessment responses, and
                        optional equality monitoring data.
                      </p>
                      <p>
                        <strong>4.2 Data Processing:</strong> Your personal data
                        is processed in accordance with our{" "}
                        <Link
                          href="/privacy-policy"
                          className="text-blue-600 hover:underline"
                        >
                          Data Privacy Policy
                        </Link>{" "}
                        and UK GDPR requirements. Assessment data may be shared
                        with prospective employers with your explicit consent.
                      </p>
                      <p>
                        <strong>4.3 Data Retention:</strong> Assessment data is
                        retained for 7 years to comply with employment law
                        requirements. Equality monitoring data is anonymized
                        after 12 months.
                      </p>
                      <p>
                        <strong>4.4 Your Rights:</strong> You have rights under
                        data protection law including access, rectification,
                        erasure, and portability of your personal data.
                      </p>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3">
                      5. Intellectual Property
                    </h3>
                    <div className="space-y-3">
                      <p>
                        <strong>5.1 Platform Content:</strong> All content on
                        the Platform, including assessment materials, texts,
                        graphics, and software, is our intellectual property or
                        licensed to us.
                      </p>
                      <p>
                        <strong>5.2 License to Use:</strong> We grant you a
                        limited, non-exclusive, non-transferable license to use
                        the Platform for assessment purposes only.
                      </p>
                      <p>
                        <strong>5.3 Prohibited Uses:</strong> You may not copy,
                        modify, distribute, or reverse engineer any part of the
                        Platform or its content.
                      </p>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3">
                      6. Acceptable Use Policy
                    </h3>
                    <div className="space-y-3">
                      <p>You agree not to:</p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>
                          Use the Platform for any unlawful purpose or in
                          violation of these Terms
                        </li>
                        <li>
                          Attempt to gain unauthorized access to any part of the
                          Platform
                        </li>
                        <li>
                          Interfere with or disrupt the Platform's operation
                        </li>
                        <li>
                          Share assessment content or questions with third
                          parties
                        </li>
                        <li>Impersonate another person or entity</li>
                        <li>Upload malicious software or harmful content</li>
                      </ul>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3">
                      7. Limitation of Liability
                    </h3>
                    <div className="space-y-3">
                      <p>
                        <strong>7.1 Service Availability:</strong> While we
                        strive to maintain high availability, we cannot
                        guarantee uninterrupted access to the Platform.
                      </p>
                      <p>
                        <strong>7.2 Technical Issues:</strong> We are not liable
                        for technical difficulties, internet connectivity
                        issues, or hardware failures that may affect your
                        assessment experience.
                      </p>
                      <p>
                        <strong>7.3 Assessment Results:</strong> Assessment
                        results are provided as a service to support recruitment
                        decisions, but we make no guarantees about employment
                        outcomes.
                      </p>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3">
                      8. Cookies and Tracking
                    </h3>
                    <div className="space-y-3">
                      <p>
                        <strong>8.1 Cookie Usage:</strong> We use cookies to
                        enhance your experience, maintain security, and analyze
                        Platform usage.
                      </p>
                      <p>
                        <strong>8.2 Cookie Categories:</strong>
                      </p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>
                          <strong>Necessary:</strong> Essential for Platform
                          functionality and security
                        </li>
                        <li>
                          <strong>Functional:</strong> Remember your preferences
                          and enhance features
                        </li>
                        <li>
                          <strong>Analytics:</strong> Help us understand usage
                          patterns and improve the Platform
                        </li>
                        <li>
                          <strong>Marketing:</strong> Deliver relevant
                          information about our services
                        </li>
                      </ul>
                      <p>
                        <strong>8.3 Cookie Management:</strong> You can manage
                        your cookie preferences through our cookie banner and
                        settings. Essential cookies cannot be disabled.
                      </p>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3">
                      9. Termination
                    </h3>
                    <div className="space-y-3">
                      <p>
                        <strong>9.1 User Termination:</strong> You may delete
                        your account at any time by contacting our support team.
                      </p>
                      <p>
                        <strong>9.2 Platform Termination:</strong> We reserve
                        the right to suspend or terminate accounts that violate
                        these Terms or engage in prohibited activities.
                      </p>
                      <p>
                        <strong>9.3 Effect of Termination:</strong> Upon
                        termination, your access to the Platform will cease, but
                        data retention periods outlined in our{" "}
                        <Link
                          href="/privacy-policy"
                          className="text-blue-600 hover:underline"
                        >
                          Data Privacy Policy
                        </Link>{" "}
                        will continue to apply.
                      </p>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3">
                      10. Changes to Terms
                    </h3>
                    <p className="mb-3">
                      We may update these Terms from time to time. We will
                      notify users of significant changes via email or platform
                      notifications. Continued use of the Platform after changes
                      constitute acceptance of the updated Terms.
                    </p>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3">
                      11. Governing Law and Jurisdiction
                    </h3>
                    <p className="mb-3">
                      These Terms are governed by the laws of England and Wales.
                      Any disputes arising from these Terms or use of the
                      Platform will be subject to the exclusive jurisdiction of
                      the courts of England and Wales.
                    </p>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-semibold mb-3">
                      12. Contact Information
                    </h3>
                    <div className="space-y-2">
                      <p>
                        If you have questions about these Terms, please contact
                        us:
                      </p>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p>
                          <strong>Email:</strong>{" "}
                          legal@emergencyassessment.co.uk
                        </p>
                        <p>
                          <strong>Address:</strong> Emergency Services
                          Assessment Platform
                        </p>
                        <p className="ml-16">Legal Department</p>
                        <p className="ml-16">United Kingdom</p>
                      </div>
                    </div>
                  </section>

                  <div className="mt-8 p-4 border rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground">
                      By using the Emergency Services Assessment Platform, you
                      acknowledge that you have read, understood, and agree to
                      be bound by these Terms and Conditions.
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
