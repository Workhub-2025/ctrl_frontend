'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Shield, FileText, Eye, Database, Clock, Users } from 'lucide-react';
import Link from 'next/link';
import { FormPageHeader } from './form-page-header';
import { UK_LEGAL } from '@/lib/legal/uk-compliance';

interface DataPrivacyTermsProps {
  onAccept: (consents: {
    dataPrivacy: boolean;
    dataProcessing: boolean;
    retentionAcknowledged: boolean;
    marketing: boolean;
  }) => void;
  onDecline: () => void;
  onSkip?: () => void;
  isLoading?: boolean;
  isOptional?: boolean;
}

export default function DataPrivacyTerms({ onAccept, onDecline, onSkip, isLoading = false, isOptional = false }: DataPrivacyTermsProps) {
  const [consents, setConsents] = useState({
    dataPrivacy: false,
    dataProcessing: false,
    retentionAcknowledged: false,
    marketing: false,
  });

  const handleConsentChange = (field: keyof typeof consents, value: boolean) => {
    setConsents(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = consents.dataPrivacy && consents.dataProcessing && consents.retentionAcknowledged;

  const handleAccept = () => {
    if (canProceed) {
      onAccept(consents);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <FormPageHeader
            icon={Shield}
            color="blue"
            title={isOptional ? 'Complete Your Privacy Preferences' : 'Data Privacy and Terms & Conditions'}
            description={
              isOptional ? (
                <>
                  We noticed you haven't completed your privacy preferences yet. Please review and update your settings, or skip to continue to your dashboard.
                  <br />
                  <Link href="/privacy-policy" target="_blank" className="text-blue-600 hover:underline text-sm">
                    View complete Privacy Policy →
                  </Link>
                </>
              ) : (
                <>
                  Please read and acknowledge the following terms before proceeding with your assessment registration.
                  <br />
                  <Link href="/privacy-policy" target="_blank" className="text-blue-600 hover:underline text-sm">
                    View complete Privacy Policy →
                  </Link>
                </>
              )
            }
          />
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Privacy Policy */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Privacy Policy</h3>
            </div>
            
            <ScrollArea className="h-48 w-full rounded-md border p-4">
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">1. Data controller</h4>
                  <p>
                    Your recruiting organisation is usually the data controller for assessment data.
                    {UK_LEGAL.legalEntityName} (&quot;{UK_LEGAL.tradingName}&quot;) processes data as a
                    processor on their instructions, and acts as controller for platform account data.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">2. Information We Collect</h4>
                  <p>We collect personal information including your name, email, contact details, assessment responses, and optional equality monitoring data to provide and improve our assessment services.</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">3. How We Use Your Information</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>To administer and score your assessments</li>
                    <li>To provide feedback on your performance</li>
                    <li>To improve our assessment methods and platform</li>
                    <li>To comply with legal obligations</li>
                    <li>To communicate important updates (with your consent)</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">4. Data Security</h4>
                  <p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">5. Your Rights</h4>
                  <p>Under GDPR, you have the right to access, rectify, erase, restrict processing, data portability, and object to processing of your personal data.</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">6. Contact Information</h4>
                  <p>For data protection queries, contact {UK_LEGAL.privacyEmail}</p>
                </div>
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Data Processing Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Data Processing</h3>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Data Retention</p>
                  <p className="text-sm text-muted-foreground">
                    Your assessment data will be retained for up to {UK_LEGAL.assessmentDataRetentionYears} years
                    where required for recruitment and employment record-keeping. Equality monitoring data
                    is anonymised after {UK_LEGAL.equalityMonitoringRetentionMonths} months.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Data Sharing</p>
                  <p className="text-sm text-muted-foreground">
                    Assessment results are shared with the recruiting organisation that invited you and
                    their authorised hiring managers as part of the recruitment process. Equality monitoring
                    data is never shared with hiring decision-makers in identifiable form.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Eye className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Data Access</p>
                  <p className="text-sm text-muted-foreground">
                    Only authorized personnel have access to your data. All access is logged and monitored.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Consent Checkboxes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Your Consent</h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="dataPrivacy"
                  checked={consents.dataPrivacy}
                  onCheckedChange={(checked) => handleConsentChange('dataPrivacy', checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="dataPrivacy" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    I agree to the Privacy Policy and Terms & Conditions *
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Required: You must accept these terms to proceed with the assessment.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="dataProcessing"
                  checked={consents.dataProcessing}
                  onCheckedChange={(checked) => handleConsentChange('dataProcessing', checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="dataProcessing" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    I consent to the processing of my personal data for assessment purposes *
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Required: This allows us to administer your assessment and provide results.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="retention"
                  checked={consents.retentionAcknowledged}
                  onCheckedChange={(checked) => handleConsentChange('retentionAcknowledged', checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="retention" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    I acknowledge the data retention periods outlined above *
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Required: Acknowledgment of how long we keep your data.
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="marketing"
                  checked={consents.marketing}
                  onCheckedChange={(checked) => handleConsentChange('marketing', checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="marketing" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    I would like to receive updates about new assessments and career opportunities
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Optional: You can change this preference at any time.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleAccept}
              disabled={!canProceed || isLoading}
              className="flex-1"
              size="lg"
            >
              {isLoading ? 'Processing...' : 'Accept and Continue'}
            </Button>
            
            {isOptional && onSkip ? (
              <Button
                onClick={onSkip}
                variant="outline"
                disabled={isLoading}
                className="flex-1"
                size="lg"
              >
                Skip for Now
              </Button>
            ) : (
              <Button
                onClick={onDecline}
                variant="outline"
                disabled={isLoading}
                className="flex-1"
                size="lg"
              >
                Decline
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {isOptional ? (
              'You can complete these preferences later in your profile settings.'
            ) : (
              '* Required fields. You cannot proceed without accepting the mandatory terms.'
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}