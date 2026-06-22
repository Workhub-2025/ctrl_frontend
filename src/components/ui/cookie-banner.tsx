'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Cookie, Settings, X } from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always required
    functional: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already made cookie choices
    const cookieConsent = localStorage.getItem('cookie-consent');
    if (!cookieConsent) {
      setShowBanner(true);
    } else {
      const savedPreferences = JSON.parse(cookieConsent);
      setPreferences(savedPreferences);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    savePreferences(allAccepted);
  };

  const handleAcceptNecessary = () => {
    const necessaryOnly = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
    savePreferences(necessaryOnly);
  };

  const handleSaveCustom = () => {
    savePreferences(preferences);
    setShowSettings(false);
  };

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem('cookie-consent', JSON.stringify(prefs));
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    setPreferences(prefs);
    setShowBanner(false);
    
    // Here you would typically initialize analytics/marketing scripts based on preferences
    initializeCookieBasedServices(prefs);
  };

  const initializeCookieBasedServices = (prefs: CookiePreferences) => {
    // Gate third-party analytics/marketing until consent is granted.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ctrl:cookie-consent', { detail: prefs })
      );
    }
  };

  const handlePreferenceChange = (type: keyof CookiePreferences, value: boolean) => {
    if (type === 'necessary') return; // Necessary cookies cannot be disabled
    setPreferences(prev => ({ ...prev, [type]: value }));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
        <Card className="mx-auto max-w-4xl border-2 shadow-2xl bg-background/95 backdrop-blur-sm">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <Cookie className="h-6 w-6 text-primary" />
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Cookie Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    We use cookies to improve your experience on our website. Essential cookies are required for the site to function properly. 
                    Optional cookies help us analyze usage and provide personalized content.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    For more information, please read our{' '}
                    <Link href="/cookie-policy" className="text-primary hover:underline">
                      Cookie Policy
                    </Link>
                    ,{' '}
                    <Link href="/privacy-policy" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>{' '}
                    and{' '}
                    <Link href="/terms-conditions" className="text-primary hover:underline">
                      Terms &amp; Conditions
                    </Link>.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={handleAcceptAll} className="flex-1">
                    Accept All Cookies
                  </Button>
                  
                  <Button 
                    onClick={handleAcceptNecessary} 
                    variant="outline"
                    className="flex-1"
                  >
                    Accept Necessary Only
                  </Button>

                  <Dialog open={showSettings} onOpenChange={setShowSettings}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Cookie Preferences</DialogTitle>
                        <DialogDescription>
                          Choose which cookies you want to allow. You can change these settings at any time.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              id="necessary"
                              checked={preferences.necessary}
                              disabled={true}
                            />
                            <div className="space-y-1">
                              <Label htmlFor="necessary" className="font-medium">
                                Necessary Cookies (Required)
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Essential for the website to function properly. These include authentication, 
                                security, and basic functionality cookies.
                              </p>
                            </div>
                          </div>

                          <Separator />

                          <div className="flex items-start space-x-3">
                            <Checkbox
                              id="functional"
                              checked={preferences.functional}
                              onCheckedChange={(checked) => 
                                handlePreferenceChange('functional', checked as boolean)
                              }
                            />
                            <div className="space-y-1">
                              <Label htmlFor="functional" className="font-medium">
                                Functional Cookies
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Enable enhanced functionality like remembering your preferences 
                                and providing personalized features.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start space-x-3">
                            <Checkbox
                              id="analytics"
                              checked={preferences.analytics}
                              onCheckedChange={(checked) => 
                                handlePreferenceChange('analytics', checked as boolean)
                              }
                            />
                            <div className="space-y-1">
                              <Label htmlFor="analytics" className="font-medium">
                                Analytics Cookies
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Help us understand how visitors use our website to improve 
                                the user experience and site performance.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start space-x-3">
                            <Checkbox
                              id="marketing"
                              checked={preferences.marketing}
                              onCheckedChange={(checked) => 
                                handlePreferenceChange('marketing', checked as boolean)
                              }
                            />
                            <div className="space-y-1">
                              <Label htmlFor="marketing" className="font-medium">
                                Marketing Cookies
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Used to deliver relevant advertisements and track the effectiveness 
                                of our marketing campaigns.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button onClick={handleSaveCustom} className="flex-1">
                            Save Preferences
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setShowSettings(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleAcceptNecessary}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
  );
}