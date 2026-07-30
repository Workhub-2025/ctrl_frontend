"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Heart, ArrowRight, ArrowLeft } from "lucide-react";
import { EqualityMonitoringData, EqualityMonitoringState } from "@/types";
import { FormPageHeader } from "./form-page-header";
import { UK_LEGAL } from "@/lib/legal/uk-compliance";

interface EqualityMonitoringFormProps {
  onComplete: (data: EqualityMonitoringState) => void;
  onSkip: () => void;
  onSkipAll?: () => void;
  isLoading?: boolean;
  isOptional?: boolean;
  inline?: boolean;
}

export default function EqualityMonitoringForm({
  onComplete,
  onSkip,
  onSkipAll,
  isLoading = false,
  isOptional = false,
  inline = false,
}: EqualityMonitoringFormProps) {
  // --- Form State Management ---
  const [formData, setFormData] = useState<EqualityMonitoringData>({});
  const [voluntarySubmissionAcknowledged, setVoluntarySubmissionAcknowledged] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const handleInputChange = (
    field: keyof EqualityMonitoringData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // --- Step Navigation Logic ---
  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    if (!voluntarySubmissionAcknowledged) return;
    const submittedAt = new Date().toISOString();
    onComplete({
      ...formData,
      completed: true,
      completedAt: submittedAt,
      submittedAt,
      noticeVersion: UK_LEGAL.equalityMonitoringNoticeVersion,
      voluntarySubmissionAcknowledged: true,
    });
  };

  // --- Progress Indicator ---
  const renderStepIndicator = () => (
    <ol
      aria-label={`Equality monitoring progress: step ${currentStep} of ${totalSteps}`}
      className="flex items-center justify-between mb-8 max-w-md mx-auto w-full"
    >
      {Array.from({ length: totalSteps }, (_, i) => (
        <li key={i} className="flex items-center flex-1 last:flex-none">
          <span
            aria-current={i + 1 === currentStep ? "step" : undefined}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-[background-color,color,border-color,box-shadow,transform] duration-300 ${
              i + 1 < currentStep
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                : i + 1 === currentStep
                ? "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-md shadow-primary/20"
                : "bg-muted text-muted-foreground border border-border/60"
            }`}
          >
            {i + 1}
            <span className="sr-only">
              {i + 1 < currentStep ? " completed" : i + 1 === currentStep ? " current" : " upcoming"}
            </span>
          </span>
          {i < totalSteps - 1 && (
            <div
              className={`h-[2px] flex-1 mx-2 rounded-full transition-[background-color,transform] duration-500 ${
                i + 1 < currentStep ? "bg-emerald-500" : "bg-muted"
              }`}
            />
          )}
        </li>
      ))}
    </ol>
  );

  // --- Step 1: Personal Information ---
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="age-range">Age Range</Label>
            <Select
              value={formData.age_range || ""}
              onValueChange={(value) => handleInputChange("age_range", value)}
            >
              <SelectTrigger id="age-range" className="rounded-xl border border-border/70 dark:border-white/10 bg-background/50 dark:bg-black/20 focus:ring-primary">
                <SelectValue placeholder="Select your age range (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="18-24">18-24</SelectItem>
                <SelectItem value="25-34">25-34</SelectItem>
                <SelectItem value="35-44">35-44</SelectItem>
                <SelectItem value="45-54">45-54</SelectItem>
                <SelectItem value="55-64">55-64</SelectItem>
                <SelectItem value="65+">65+</SelectItem>
                <SelectItem value="prefer-not-to-say">
                  Prefer not to say
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label id="gender-label">Gender</Label>
            <RadioGroup
              aria-labelledby="gender-label"
              value={formData.gender || ""}
              onValueChange={(value) => handleInputChange("gender", value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="male" id="male" />
                <Label htmlFor="male">Male</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="female" id="female" />
                <Label htmlFor="female">Female</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="non-binary" id="non-binary" />
                <Label htmlFor="non-binary">Non-binary</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="gender-other" />
                <Label htmlFor="gender-other">Other</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="prefer-not-to-say"
                  id="gender-prefer-not"
                />
                <Label htmlFor="gender-prefer-not">Prefer not to say</Label>
              </div>
            </RadioGroup>

            {formData.gender === "other" && (
              <div className="space-y-2">
                <Label htmlFor="gender-other-detail">Please specify your gender (optional)</Label>
                <Input
                  id="gender-other-detail"
                  value={formData.gender_other || ""}
                  onChange={(e) => handleInputChange("gender_other", e.target.value)}
                  className="rounded-xl border border-border/70 dark:border-white/10 bg-background/50 dark:bg-black/20 focus-visible:ring-primary"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label id="sexual-orientation-label">Sexual orientation</Label>
            <RadioGroup
              aria-labelledby="sexual-orientation-label"
              value={formData.sexual_orientation || ""}
              onValueChange={(value) =>
                handleInputChange("sexual_orientation", value)
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="heterosexual" id="heterosexual" />
                <Label htmlFor="heterosexual">Heterosexual/Straight</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="gay" id="gay" />
                <Label htmlFor="gay">Gay</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lesbian" id="lesbian" />
                <Label htmlFor="lesbian">Lesbian</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bisexual" id="bisexual" />
                <Label htmlFor="bisexual">Bisexual</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="other-orientation"
                  id="other-orientation"
                />
                <Label htmlFor="other-orientation">Other</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="prefer-not-to-say-orientation"
                  id="prefer-not-orientation"
                />
                <Label htmlFor="prefer-not-orientation">
                  Prefer not to say
                </Label>
              </div>
            </RadioGroup>

            {formData.sexual_orientation === "other-orientation" && (
              <div className="space-y-2">
                <Label htmlFor="sexual-orientation-other-detail">Please specify (optional)</Label>
                <Input
                  id="sexual-orientation-other-detail"
                  value={formData.sexual_orientation_other || ""}
                  onChange={(e) => handleInputChange("sexual_orientation_other", e.target.value)}
                  className="rounded-xl border-border/70 dark:border-white/10 bg-background/50 dark:bg-black/20 focus-visible:ring-primary"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // --- Step 2: Background Information ---
  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Background Information</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ethnicity">Ethnic Group</Label>
            <Select
              value={formData.ethnicity || ""}
              onValueChange={(value) => handleInputChange("ethnicity", value)}
            >
              <SelectTrigger id="ethnicity" className="rounded-xl border border-border/70 dark:border-white/10 bg-background/50 dark:bg-black/20 focus:ring-primary">
                <SelectValue placeholder="Select your ethnic group (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="white-british">White - British</SelectItem>
                <SelectItem value="white-irish">White - Irish</SelectItem>
                <SelectItem value="white-other">White - Other</SelectItem>
                <SelectItem value="mixed-white-black-caribbean">
                  Mixed - White and Black Caribbean
                </SelectItem>
                <SelectItem value="mixed-white-black-african">
                  Mixed - White and Black African
                </SelectItem>
                <SelectItem value="mixed-white-asian">
                  Mixed - White and Asian
                </SelectItem>
                <SelectItem value="mixed-other">Mixed - Other</SelectItem>
                <SelectItem value="asian-indian">Asian - Indian</SelectItem>
                <SelectItem value="asian-pakistani">
                  Asian - Pakistani
                </SelectItem>
                <SelectItem value="asian-bangladeshi">
                  Asian - Bangladeshi
                </SelectItem>
                <SelectItem value="asian-chinese">Asian - Chinese</SelectItem>
                <SelectItem value="asian-other">Asian - Other</SelectItem>
                <SelectItem value="black-caribbean">
                  Black - Caribbean
                </SelectItem>
                <SelectItem value="black-african">Black - African</SelectItem>
                <SelectItem value="black-other">Black - Other</SelectItem>
                <SelectItem value="other-ethnic">Other Ethnic Group</SelectItem>
                <SelectItem value="prefer-not-to-say">
                  Prefer not to say
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="religion">Religion or Belief</Label>
            <Select
              value={formData.religion || ""}
              onValueChange={(value) => handleInputChange("religion", value)}
            >
              <SelectTrigger id="religion" className="rounded-xl border border-border/70 dark:border-white/10 bg-background/50 dark:bg-black/20 focus:ring-primary">
                <SelectValue placeholder="Select your religion or belief (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-religion">No religion</SelectItem>
                <SelectItem value="christian">Christian</SelectItem>
                <SelectItem value="buddhist">Buddhist</SelectItem>
                <SelectItem value="hindu">Hindu</SelectItem>
                <SelectItem value="jewish">Jewish</SelectItem>
                <SelectItem value="muslim">Muslim</SelectItem>
                <SelectItem value="sikh">Sikh</SelectItem>
                <SelectItem value="other-religion">Other religion</SelectItem>
                <SelectItem value="prefer-not-to-say">
                  Prefer not to say
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="marital-status">Marital Status</Label>
            <Select
              value={formData.marital_status || ""}
              onValueChange={(value) =>
                handleInputChange("marital_status", value)
              }
            >
              <SelectTrigger id="marital-status" className="rounded-xl border border-border/70 dark:border-white/10 bg-background/50 dark:bg-black/20 focus:ring-primary">
                <SelectValue placeholder="Select your marital status (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="married">Married</SelectItem>
                <SelectItem value="civil-partnership">
                  Civil Partnership
                </SelectItem>
                <SelectItem value="divorced">Divorced</SelectItem>
                <SelectItem value="separated">Separated</SelectItem>
                <SelectItem value="widowed">Widowed</SelectItem>
                <SelectItem value="prefer-not-to-say">
                  Prefer not to say
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label id="dependents-label">Do you have any dependants?</Label>
            <RadioGroup
              aria-labelledby="dependents-label"
              value={formData.dependents || ""}
              onValueChange={(value) => handleInputChange("dependents", value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="dependents-yes" />
                <Label htmlFor="dependents-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="dependents-no" />
                <Label htmlFor="dependents-no">No</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="prefer-not-to-say"
                  id="dependents-prefer-not"
                />
                <Label htmlFor="dependents-prefer-not">Prefer not to say</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </div>
    </div>
  );

  // --- Step 3: Disability and Accessibility ---
  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">
          Disability and Accessibility
        </h3>
        <div className="space-y-4">
          <div className="space-y-3">
            <Label id="disability-label">Do you consider yourself to have a disability?</Label>
            <p className="text-sm text-muted-foreground">
              The Equality Act 2010 defines disability as 'a physical or mental
              impairment which has a substantial and long-term adverse effect on
              a person's ability to carry out normal day-to-day activities.'
            </p>
            <RadioGroup
              aria-labelledby="disability-label"
              value={formData.disability || ""}
              onValueChange={(value) => handleInputChange("disability", value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="disability-yes" />
                <Label htmlFor="disability-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="disability-no" />
                <Label htmlFor="disability-no">No</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="prefer-not-to-say"
                  id="disability-prefer-not"
                />
                <Label htmlFor="disability-prefer-not">Prefer not to say</Label>
              </div>
            </RadioGroup>
          </div>

          {formData.disability === "yes" && (
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
              <p className="font-medium">Need an assessment adjustment?</p>
              <p className="mt-1 text-muted-foreground">
                Do not include medical details in this monitoring form. Use the separate,
                confidential adjustment request so the appropriate support team can act on it.
              </p>
              <Link
                href="/candidate-dashboard/help-support?action=reasonable-adjustment"
                className="mt-2 inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4"
              >
                Request a reasonable adjustment
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // --- Step 4: Education and Employment ---
  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Education and Employment</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="education">Highest Level of Education</Label>
            <Select
              value={formData.education_level || ""}
              onValueChange={(value) =>
                handleInputChange("education_level", value)
              }
            >
              <SelectTrigger id="education" className="rounded-xl border border-border/70 dark:border-white/10 bg-background/50 dark:bg-black/20 focus:ring-primary">
                <SelectValue placeholder="Select your highest qualification (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-qualifications">
                  No formal qualifications
                </SelectItem>
                <SelectItem value="gcse">GCSE or equivalent</SelectItem>
                <SelectItem value="a-level">A-Level or equivalent</SelectItem>
                <SelectItem value="apprenticeship">Apprenticeship</SelectItem>
                <SelectItem value="diploma">Diploma</SelectItem>
                <SelectItem value="undergraduate">
                  Undergraduate degree
                </SelectItem>
                <SelectItem value="postgraduate">
                  Postgraduate degree
                </SelectItem>
                <SelectItem value="professional">
                  Professional qualification
                </SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer-not-to-say">
                  Prefer not to say
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="employment">Current Employment Status</Label>
            <Select
              value={formData.employment_status || ""}
              onValueChange={(value) =>
                handleInputChange("employment_status", value)
              }
            >
              <SelectTrigger id="employment" className="rounded-xl border border-border/70 dark:border-white/10 bg-background/50 dark:bg-black/20 focus:ring-primary">
                <SelectValue placeholder="Select your employment status (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employed-full-time">
                  Employed (Full-time)
                </SelectItem>
                <SelectItem value="employed-part-time">
                  Employed (Part-time)
                </SelectItem>
                <SelectItem value="self-employed">Self-employed</SelectItem>
                <SelectItem value="unemployed">Unemployed</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
                <SelectItem value="unable-to-work">Unable to work</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer-not-to-say">
                  Prefer not to say
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label id="previous-service-label">Have you previously worked in emergency services?</Label>
            <RadioGroup
              aria-labelledby="previous-service-label"
              value={formData.previous_emergency_services || ""}
              onValueChange={(value) =>
                handleInputChange("previous_emergency_services", value)
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="previous-yes" />
                <Label htmlFor="previous-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="previous-no" />
                <Label htmlFor="previous-no">No</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="prefer-not-to-say"
                  id="previous-prefer-not"
                />
                <Label htmlFor="previous-prefer-not">Prefer not to say</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additional-info">
              Additional Information (Optional)
            </Label>
            <p className="text-sm text-muted-foreground">
              Is there any other information you would like to provide to help
              us understand your background?
            </p>
            <Textarea
              id="additional-info"
              placeholder="Any additional information you'd like to share…"
              value={formData.additional_information || ""}
              onChange={(e) =>
                handleInputChange("additional_information", e.target.value)
              }
              rows={3}
              className="rounded-xl border border-border/70 dark:border-white/10 bg-background/50 dark:bg-black/20 focus-visible:ring-primary resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const content = (
    <div className="space-y-6">
      {renderStepIndicator()}

      <div className="rounded-xl border border-primary/20 dark:border-primary/10 bg-primary/5 dark:bg-primary/5 p-4 shadow-inner">
        <div className="flex items-start gap-3">
          <Users className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground mb-1">
              Why do we collect this information?
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This optional data helps monitor equality and identify barriers. It is kept
              separate from hiring decisions and reported only for statistical analysis.
            </p>
          </div>
        </div>
      </div>

      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}

      {currentStep === totalSteps ? (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
          <Checkbox
            id="equality-voluntary-submission"
            checked={voluntarySubmissionAcknowledged}
            onCheckedChange={(checked) => setVoluntarySubmissionAcknowledged(checked === true)}
            aria-describedby="equality-voluntary-submission-help"
          />
          <div className="space-y-1">
            <Label htmlFor="equality-voluntary-submission" className="leading-5">
              I choose to submit this optional equality-monitoring information
            </Label>
            <p id="equality-voluntary-submission-help" className="text-xs leading-5 text-muted-foreground">
              You can skip this form without affecting your application. Responses are linked to
              your account while retained, kept away from hiring decision-makers in identifiable
              form, and removed after the stated retention period. Notice version {UK_LEGAL.equalityMonitoringNoticeVersion}.
            </p>
          </div>
        </div>
      ) : null}

      <Separator className="my-6" />

      {/* Form Navigation Controls */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {currentStep > 1 && (
          <Button
            onClick={handlePrevious}
            variant="outline"
            disabled={isLoading}
            size="lg"
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
        )}

        <div className="flex-1" />

        {currentStep < totalSteps ? (
          <Button onClick={handleNext} disabled={isLoading} size="lg" className="w-full sm:w-auto">
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleComplete} disabled={isLoading || !voluntarySubmissionAcknowledged} size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/20">
            {isLoading ? "Saving..." : inline ? "Save Changes" : "Complete Registration"}
          </Button>
        )}
      </div>

      {!inline && (
        <>
          <div className="text-center pt-4">
            {isOptional && onSkipAll ? (
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  onClick={onSkip}
                  variant="ghost"
                  disabled={isLoading}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Skip this form
                </Button>
                <Button
                  onClick={onSkipAll}
                  variant="outline"
                  disabled={isLoading}
                >
                  Skip to Dashboard
                </Button>
              </div>
            ) : (
              <Button
                onClick={onSkip}
                variant="ghost"
                disabled={isLoading}
                className="text-muted-foreground hover:text-foreground"
              >
                Skip this form and continue to dashboard
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {isOptional
              ? "You can complete this form later in your profile settings."
              : "All questions are optional. You can skip any question or the entire form."}
          </p>
        </>
      )}
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm dark:border-white/10">
        {/* Form Header & Description */}
        <CardHeader className="pt-8 pb-6 border-b border-border/40 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
          <FormPageHeader
            icon={Heart}
            color="green"
            title={isOptional
              ? "Complete Your Equality Monitoring (Optional)"
              : "Equality and Diversity Monitoring"}
            description={isOptional
              ? "Help monitor whether the assessment process is fair and accessible. This information is optional, stored separately from hiring decisions, and can be skipped."
              : "This optional information supports equality monitoring. It is linked to your account while retained but is not shown to hiring decision-makers in identifiable form."}
          />
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          {content}
        </CardContent>
      </Card>
    </div>
  );
}
