"use client";

import * as React from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, ExternalLink, Copy, Check } from "lucide-react";
import { portalIconWrapLgClass } from "@/components/dashboard/portal/portal-design-tokens";
import { ContactFormDialog } from "@/components/dashboard/contact-form-dialog";

interface LocationMapDialogProps {
  address: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LocationMapDialog({
  address,
  open,
  onOpenChange,
}: LocationMapDialogProps) {
  const [copied, setCopied] = useState(false);
  const hasAddress = address.trim().length > 0;

  const mapEmbedUrl = hasAddress
    ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed`
    : "";

  const directionsUrl = hasAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : "";

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access may be denied; fail silently.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden sm:max-w-[560px]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
          aria-hidden="true"
        />
        <DialogHeader className="pr-10">
          <div className="flex items-start gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"
              aria-hidden="true"
            >
              <MapPin className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <DialogTitle className="font-display text-lg font-bold tracking-tight text-foreground">
                Assessment Location
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {hasAddress
                  ? "View the venue location and get directions."
                  : "Venue details haven't been confirmed for this session yet."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {hasAddress ? (
          <div className="space-y-4 pt-1">
            {/* Map block */}
            <div className="overflow-hidden rounded-xl border border-border bg-card dark:border-white/10">
              {/* Address chip header */}
              <div className="flex items-start gap-2.5 border-b border-border bg-muted/40 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Venue
                  </p>
                  <p className="text-sm font-semibold leading-relaxed text-foreground">
                    {address}
                  </p>
                </div>
              </div>

              {/* Map embed */}
              <iframe
                title={`Map showing ${address}`}
                src={mapEmbedUrl}
                className="block w-full bg-muted/10 dark:bg-white/[0.02]"
                style={{ height: 360, border: "none" }}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleCopyAddress()}
                className="h-10 flex-1 gap-2 rounded-lg border-border font-semibold transition-colors hover:bg-muted hover:text-foreground dark:border-white/10 dark:hover:bg-white/[0.06]"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Copy address
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="h-10 flex-1 gap-2 rounded-lg border-border font-semibold transition-colors hover:bg-muted hover:text-foreground dark:border-white/10 dark:hover:bg-white/[0.06]"
                asChild
              >
                <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Get Directions
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-10">
            <div className={portalIconWrapLgClass}>
              <MapPin
                className="h-7 w-7"
                aria-hidden="true"
              />
            </div>
            <div className="space-y-1 text-center">
              <p className="font-display text-lg font-bold text-foreground">
                Venue address pending
              </p>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Your hiring manager hasn&apos;t shared the assessment venue yet.
                Check back closer to your session date, or reach out below if you
                need to confirm travel plans.
              </p>
            </div>
            <ContactFormDialog
              recipient="Hiring Manager"
              defaultSubject="Assessment Location Query"
              triggerLabel="Contact Hiring Manager"
              triggerVariant="outline"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
