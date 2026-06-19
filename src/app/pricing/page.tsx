"use client";

import { useState, useEffect } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  X,
  ArrowRight,
  Shield,
  Zap,
  Award,
  HelpCircle,
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { AccessibilityDropdown } from "@/components/accessibility/accessibility-dropdown";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { cn } from "@/lib/utils";

type ContractOption = {
  tier: "minimum" | "professional" | "grandfather";
  label: string;
  includedSeats: number;
  deliveryModes: string[];
  includesCoreAssessments: boolean;
  includesPaidFutureFeaturesDuringFirstYear?: boolean;
  discountPercent?: number;
};

type ContractOptionsData = {
  grandfatherAvailable: boolean;
  grandfatherOfferExpiresAt: string | null;
  options: ContractOption[];
};

const TIER_META: Record<
  "minimum" | "professional" | "grandfather",
  {
    description: string;
    badge: string;
    icon: typeof Shield;
    iconColor: string;
    popular?: boolean;
    cta: string;
  }
> = {
  minimum: {
    description: "Entry-level package for secure in-person testing with one hiring manager seat.",
    badge: "Permanent Tier",
    icon: Shield,
    iconColor: "text-slate-400 dark:text-slate-500",
    cta: "Request Minimum Quote",
  },
  professional: {
    description: "Our standard plan for organisations requiring multiple hiring manager seats.",
    badge: "Most Popular",
    icon: Zap,
    iconColor: "text-sky-500 dark:text-sky-400",
    popular: true,
    cta: "Request Professional Quote",
  },
  grandfather: {
    description: "Launch edition plan with platform upgrade loyalty benefits for early adopters.",
    badge: "Go-Live Exclusive",
    icon: Award,
    iconColor: "text-amber-500 dark:text-amber-400",
    cta: "Contact Sales for Eligibility",
  },
};

const faqs = [
  {
    question: "What does 'Annual licence, paid monthly' mean?",
    answer:
      "Clients commit to a 12-month contract period for stability and lock in their pricing tier. However, payments are collected on a monthly basis via direct debit instead of requiring a large upfront annual payment.",
  },
  {
    question: "How do Hiring Manager seats work?",
    answer:
      "A Hiring Manager seat is required for any team member who needs to create campaigns, view candidate grading reports, or unlock sessions. Minimum includes 1 seat, Professional includes 3, and Grandfather includes 3 seats with loyalty upgrade benefits.",
  },
  {
    question: "Can we upgrade our tier mid-contract?",
    answer:
      "Yes, you can request an upgrade at any time from your Client Dashboard. Mid-contract upgrades are calculated as a pro-rata adjustment for the remainder of your annual licence term.",
  },
  {
    question: "What is the Grandfather tier loyalty benefit?",
    answer:
      "Clients who lock in our Grandfather tier during our platform go-live window receive all upgrades free during their first contract year. Upon renewal, they transition to Grandfather - Founders status and retain a permanent loyalty discount of 30% on all subsequent feature or custom content purchases.",
  },
];

export default function PricingPage() {
  const {
    settings: accessibilitySettings,
    updateSettings: updateAccessibilitySettings,
    resetSettings: resetAccessibilitySettings,
  } = useAccessibilitySettings();

  const [contractData, setContractData] = useState<ContractOptionsData | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string>("professional");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    orgName: "",
    phone: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/public/contract-options")
      .then((r) => r.json())
      .then((body) => {
        if (body?.data) setContractData(body.data as ContractOptionsData);
      })
      .catch(() => {
        // Fallback: show default options without grandfather
        setContractData({
          grandfatherAvailable: false,
          grandfatherOfferExpiresAt: null,
          options: [
            {
              tier: "minimum",
              label: "Minimum",
              includedSeats: 1,
              deliveryModes: ["in_person"],
              includesCoreAssessments: true,
            },
            {
              tier: "professional",
              label: "Professional",
              includedSeats: 3,
              deliveryModes: ["in_person"],
              includesCoreAssessments: true,
            },
          ],
        });
      });
  }, []);

  const visibleOptions = contractData?.options ?? [];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);
    }, 1500);
  };

  const scrollToContact = (tier: string) => {
    setSelectedPackage(tier);
    const element = document.getElementById("enquiry-form");
    if (element) element.scrollIntoView({ behavior: "smooth" });
  };

  const buildFeatureMatrix = (options: ContractOption[]) => {
    const hasGrandfather = options.some((o) => o.tier === "grandfather");
    const min = options.find((o) => o.tier === "minimum");
    const pro = options.find((o) => o.tier === "professional");
    const grand = options.find((o) => o.tier === "grandfather");

    return [
      {
        category: "Assessments & Content",
        rows: [
          {
            name: "Default core assessments (SJA, Typing, Prioritisation, Call Simulation)",
            minimum: true,
            professional: true,
            grandfather: true,
          },
          {
            name: "Access to additional platform-released assessments",
            minimum: false,
            professional: "Option to purchase",
            grandfather: hasGrandfather ? true : undefined,
          },
          {
            name: "Custom content packs (bespoke scenarios, wording)",
            minimum: false,
            professional: "Option to purchase",
            grandfather: hasGrandfather ? true : undefined,
          },
        ],
      },
      {
        category: "Delivery & Security",
        rows: [
          {
            name: "In-person controlled venue delivery",
            minimum: true,
            professional: true,
            grandfather: true,
          },
          {
            name: "Remote proctored sessions",
            minimum: false,
            professional: false,
            grandfather: hasGrandfather && (grand?.deliveryModes.includes("remote") ?? false),
          },
          {
            name: "Hybrid session links & scheduling",
            minimum: false,
            professional: false,
            grandfather: hasGrandfather && (grand?.deliveryModes.includes("hybrid") ?? false),
          },
          {
            name: "Organisation-level soft lock controls",
            minimum: true,
            professional: true,
            grandfather: true,
          },
        ],
      },
      {
        category: "Seats & Administration",
        rows: [
          {
            name: "Included Hiring Manager seats",
            minimum: `${min?.includedSeats ?? 1} seat`,
            professional: `${pro?.includedSeats ?? 3} seats`,
            grandfather: hasGrandfather ? `${grand?.includedSeats ?? 3} seats` : undefined,
          },
          {
            name: "Candidate portal interface",
            minimum: true,
            professional: true,
            grandfather: true,
          },
          {
            name: "Hiring Manager portal & grading reports",
            minimum: true,
            professional: true,
            grandfather: true,
          },
          {
            name: "Client dashboard & custom settings",
            minimum: true,
            professional: true,
            grandfather: true,
          },
        ],
      },
      {
        category: "Commercials & Upgrades",
        rows: [
          {
            name: "Licensing commitment",
            minimum: "Annual contract",
            professional: "Annual contract",
            grandfather: hasGrandfather ? "Annual contract" : undefined,
          },
          {
            name: "Payment terms",
            minimum: "Monthly via direct debit",
            professional: "Monthly via direct debit",
            grandfather: hasGrandfather ? "Monthly via direct debit" : undefined,
          },
          {
            name: "Free upgrades during first contract year",
            minimum: false,
            professional: false,
            grandfather: hasGrandfather ? (grand?.includesPaidFutureFeaturesDuringFirstYear ?? false) : undefined,
          },
          {
            name: "Permanent loyalty discount on future upgrades",
            minimum: false,
            professional: false,
            grandfather: hasGrandfather && grand?.discountPercent
              ? `${grand.discountPercent}% discount`
              : (hasGrandfather ? false : undefined),
          },
        ],
      },
    ];
  };

  const featureMatrix = contractData ? buildFeatureMatrix(contractData.options) : [];
  const hasGrandfather = contractData?.grandfatherAvailable ?? false;

  const renderCell = (value: boolean | string | undefined) => {
    if (value === undefined) return <span className="text-slate-300 dark:text-slate-700">—</span>;
    if (typeof value === "boolean") {
      return value ? (
        <Check className="h-4 w-4 text-sky-500" />
      ) : (
        <X className="h-4 w-4 text-slate-300 dark:text-slate-600" />
      );
    }
    return <span className="text-xs font-medium">{value}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020202] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-slate-50/80 backdrop-blur-md dark:border-white/5 dark:bg-[#020202]/80">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <BrandLogo layout="stacked" className="h-10 w-20" />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="/#disciplines" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
              Disciplines
            </Link>
            <Link href="/#workflow" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
              Hiring Workflow
            </Link>
            <Link href="/pricing" className="text-slate-900 dark:text-white transition-colors">
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <AccessibilityDropdown
              settings={accessibilitySettings}
              updateSettings={updateAccessibilitySettings}
              resetSettings={resetAccessibilitySettings}
            />
            <Button asChild variant="outline" className="hidden sm:inline-flex rounded-full border-slate-200 dark:border-white/10 dark:bg-white/[0.03]">
              <Link href="/auth/register?mode=login">Client Sign In</Link>
            </Button>
            <Button asChild className="rounded-full bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <Link href="/auth/register?mode=register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 text-center">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.08),transparent_60%)]" />
        <div className="relative z-10 mx-auto max-w-4xl px-6">
          <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-xs font-mono uppercase tracking-wider text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/5 dark:text-sky-300">
            <Sparkles className="h-3.5 w-3.5" />
            Transparent Packages
          </div>
          <h1 className="font-display text-5xl font-medium tracking-tight text-slate-900 dark:text-white md:text-6xl">
            Licensing configured for{" "}
            <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent dark:from-sky-300 dark:to-blue-400">
              high-trust decisions
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light leading-relaxed text-slate-600 dark:text-slate-400">
            Select a package structure that aligns with your operational cadence. All contracts feature annual licence terms billed via monthly direct debit.
          </p>
        </div>
      </section>

      {/* Package Cards */}
      <section className="relative z-10 mx-auto max-w-[1440px] px-6 pb-24">
        {!contractData ? (
          <div className="flex justify-center py-16">
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
              <Clock className="h-5 w-5 animate-spin" />
              Loading package options…
            </div>
          </div>
        ) : (
          <div className={cn("grid gap-8", hasGrandfather ? "md:grid-cols-3" : "md:grid-cols-2 max-w-3xl mx-auto")}>
            {visibleOptions.map((option) => {
              const meta = TIER_META[option.tier];
              if (!meta) return null;
              const Icon = meta.icon;
              return (
                <div
                  key={option.tier}
                  className={cn(
                    "relative flex flex-col rounded-3xl border p-8 bg-white dark:bg-[#080c16] transition-all duration-300",
                    meta.popular
                      ? "border-sky-500 ring-2 ring-sky-500/10 shadow-xl shadow-sky-500/5 dark:border-sky-500/30"
                      : "border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10"
                  )}
                >
                  {meta.popular && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-sky-500 px-4 py-1 text-[11px] font-mono uppercase tracking-wider text-white">
                      Most Popular
                    </span>
                  )}
                  {option.tier === "grandfather" && contractData.grandfatherOfferExpiresAt && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-4 py-1 text-[11px] font-mono uppercase tracking-wider text-white whitespace-nowrap">
                      Available until{" "}
                      {new Date(contractData.grandfatherOfferExpiresAt + "T12:00:00").toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-slate-100 p-3 dark:bg-white/[0.03]">
                      <Icon className={cn("h-6 w-6", meta.iconColor)} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{option.label}</h3>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{meta.badge}</span>
                    </div>
                  </div>

                  <p className="mt-5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed min-h-[48px]">
                    {meta.description}
                  </p>

                  <div className="mt-6 border-t border-slate-100 pt-6 dark:border-white/5">
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Contract Term</span>
                    <div className="mt-2 text-lg font-semibold text-slate-800 dark:text-slate-200">
                      Annual Commitment
                    </div>
                    <span className="text-xs text-muted-foreground">Billed monthly via direct debit</span>
                  </div>

                  <ul className="mt-8 space-y-3.5 flex-grow">
                    <li className="flex items-start gap-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-500 dark:text-sky-400" />
                      <span>
                        <span className="font-medium text-slate-800 dark:text-slate-300">Seats: </span>
                        {option.includedSeats === 1 ? "1 seat" : `${option.includedSeats} seats`}
                      </span>
                    </li>
                    <li className="flex items-start gap-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-500 dark:text-sky-400" />
                      <span>
                        <span className="font-medium text-slate-800 dark:text-slate-300">Delivery: </span>
                        {option.deliveryModes.includes("remote") || option.deliveryModes.includes("hybrid")
                          ? "In-person, remote & hybrid"
                          : "In-person only"}
                      </span>
                    </li>
                    <li className="flex items-start gap-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-500 dark:text-sky-400" />
                      <span>
                        <span className="font-medium text-slate-800 dark:text-slate-300">Assessments: </span>
                        Core 4 included
                      </span>
                    </li>
                    {option.includesPaidFutureFeaturesDuringFirstYear && (
                      <li className="flex items-start gap-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <span>
                          <span className="font-medium text-slate-800 dark:text-slate-300">Year 1 Bonus: </span>
                          All new paid features included
                        </span>
                      </li>
                    )}
                    {(option.discountPercent ?? 0) > 0 && (
                      <li className="flex items-start gap-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <span>
                          <span className="font-medium text-slate-800 dark:text-slate-300">Loyalty: </span>
                          {option.discountPercent}% off future upgrades
                        </span>
                      </li>
                    )}
                  </ul>

                  <Button
                    onClick={() => scrollToContact(option.tier)}
                    className={cn(
                      "mt-8 w-full h-12 rounded-2xl font-semibold gap-2 transition-all duration-300",
                      meta.popular
                        ? "bg-sky-500 hover:bg-sky-600 text-white"
                        : option.tier === "grandfather"
                        ? "bg-amber-500 hover:bg-amber-600 text-white"
                        : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-white/[0.05] dark:hover:bg-white/[0.1] dark:border dark:border-white/5 dark:text-white"
                    )}
                  >
                    {meta.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Comparison Matrix */}
      {featureMatrix.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-6 pb-24">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 dark:border-white/5 dark:bg-[#080c16]">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Compare all capabilities</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              A granular breakdown of entitlements across contract tiers.
            </p>

            <div className="mt-8 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5">
                    <th className="py-4 font-semibold text-slate-900 dark:text-white w-2/5">Capability</th>
                    <th className="py-4 font-semibold text-slate-900 dark:text-white w-1/5">Minimum</th>
                    <th className="py-4 font-semibold text-slate-900 dark:text-white w-1/5">Professional</th>
                    {hasGrandfather && (
                      <th className="py-4 font-semibold text-amber-600 dark:text-amber-400 w-1/5">Grandfather</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {featureMatrix.map((category) => (
                    <>
                      <tr key={`cat-${category.category}`} className="bg-slate-50/80 dark:bg-white/[0.01]">
                        <td colSpan={hasGrandfather ? 4 : 3} className="py-3 px-4 text-xs font-mono uppercase tracking-wider text-sky-600 dark:text-sky-400 font-semibold">
                          {category.category}
                        </td>
                      </tr>
                      {category.rows.map((row) => (
                        <tr key={row.name} className="border-b border-slate-100 dark:border-white/5 last:border-none hover:bg-slate-50/35 dark:hover:bg-white/[0.015]">
                          <td className="py-4 px-4 font-light text-slate-700 dark:text-slate-300 leading-normal">{row.name}</td>
                          <td className="py-4 px-4 text-slate-600 dark:text-slate-400">{renderCell(row.minimum)}</td>
                          <td className="py-4 px-4 text-slate-600 dark:text-slate-400">{renderCell(row.professional)}</td>
                          {hasGrandfather && (
                            <td className="py-4 px-4 text-slate-600 dark:text-slate-400">
                              {typeof row.grandfather === "string" ? (
                                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{row.grandfather}</span>
                              ) : (
                                renderCell(row.grandfather)
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="mx-auto max-w-[1440px] px-6 pb-24">
        <div className="grid gap-12 lg:grid-cols-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Frequently Asked Questions</h2>
            <p className="mt-4 text-slate-500 dark:text-slate-400 font-light leading-relaxed">
              Clear, transparent answers about our licensing terms and pricing tiers.
            </p>
          </div>
          <div className="lg:col-span-2 space-y-8">
            {faqs.map((faq) => (
              <div key={faq.question} className="space-y-3">
                <h4 className="flex items-start gap-2.5 font-semibold text-slate-900 dark:text-white">
                  <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" />
                  {faq.question}
                </h4>
                <p className="pl-7 text-sm font-light leading-relaxed text-slate-600 dark:text-slate-400">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enquiry Form */}
      <section id="enquiry-form" className="relative border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] py-24">
        <div className="mx-auto max-w-3xl px-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 dark:border-white/5 dark:bg-[#080c16] shadow-xl dark:shadow-none">
            <AnimatePresence mode="wait">
              {!success ? (
                <motion.form
                  onSubmit={handleSubmit}
                  className="space-y-6"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="text-center space-y-2 mb-8">
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white">Request Pricing Quote</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Submit details below and our team will configure a tailored contract draft for your review.
                    </p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Your Name</Label>
                      <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required placeholder="John Doe" className="rounded-xl h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Work Email</Label>
                      <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required placeholder="john.doe@organisation.gov" className="rounded-xl h-11" />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="orgName">Organisation</Label>
                      <Input id="orgName" name="orgName" value={formData.orgName} onChange={handleInputChange} required placeholder="Emergency Services Agency" className="rounded-xl h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="package">Target Tier</Label>
                      <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minimum">Minimum Plan</SelectItem>
                          <SelectItem value="professional">Professional Plan</SelectItem>
                          {hasGrandfather && (
                            <SelectItem value="grandfather">Grandfather (Go-Live Exclusive)</SelectItem>
                          )}
                          <SelectItem value="custom">Custom Configuration</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Contact Number (Optional)</Label>
                    <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+44 (0) 20 1234 5678" className="rounded-xl h-11" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Requirement Details & Notes</Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      placeholder="Please outline the number of seats needed, launch timeframe, or custom assessment requirements."
                      rows={4}
                      className="rounded-xl resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-semibold gap-2 transition-all duration-300"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Submitting quote request…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Submit Request
                      </>
                    )}
                  </Button>
                </motion.form>
              ) : (
                <motion.div
                  className="py-12 text-center space-y-6"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/10">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Quote Request Received</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                      Thank you, {formData.name}. We have received your request for the{" "}
                      <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                        {selectedPackage} Plan
                      </span>{" "}
                      for <span className="font-semibold text-slate-800 dark:text-slate-200">{formData.orgName}</span>.
                    </p>
                    <p className="text-xs text-muted-foreground pt-4">
                      A sales representative will contact you at{" "}
                      <span className="font-semibold">{formData.email}</span> within 1 business day.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSuccess(false);
                      setFormData({ name: "", email: "", orgName: "", phone: "", message: "" });
                    }}
                    className="rounded-xl px-6"
                  >
                    Submit Another Request
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 overflow-hidden border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#020202] pt-20 pb-10">
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-8 mb-12">
            <div className="lg:col-span-2 flex flex-col gap-6 max-w-sm">
              <BrandLogo layout="stacked" className="h-14 w-[6.25rem] self-start" />
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-light">
                Empowering teams to make objective, data-driven hiring decisions with confidence and speed.
              </p>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 backdrop-blur-sm">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                All systems operational
              </span>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                <span className="h-1 w-1 rounded-full bg-sky-500" /> Explore
              </h4>
              <Link href="/#disciplines" className="text-sm font-light text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">Disciplines</Link>
              <Link href="/#workflow" className="text-sm font-light text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">Hiring Workflow</Link>
              <Link href="/pricing" className="text-sm font-light text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">Pricing</Link>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                <span className="h-1 w-1 rounded-full bg-sky-500" /> Access
              </h4>
              <Link href="/auth/register?mode=register" className="text-sm font-light text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">Get Started</Link>
              <Link href="/auth/register?mode=login" className="text-sm font-light text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">Log in</Link>
              <Link href="/privacy-policy" className="text-sm font-light text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms-conditions" className="text-sm font-light text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">Terms</Link>
            </div>
          </div>

          <div className="border-t border-slate-200/50 dark:border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-600 uppercase tracking-wider">
              © {new Date().getFullYear()} CTRL Assessment. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
