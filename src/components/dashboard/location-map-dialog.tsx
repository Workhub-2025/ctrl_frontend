"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, ExternalLink } from "lucide-react";
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
  const hasAddress = address.trim().length > 0;

  const mapSearchUrl = hasAddress
    ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}#map=15`
    : "";

  const directionsUrl = hasAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
            Assessment Location
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400">
            {hasAddress
              ? "View the venue location and get directions."
              : "The venue details for this session have not been provided yet."}
          </DialogDescription>
        </DialogHeader>

        {hasAddress ? (
          <div className="space-y-4 pt-2">
            {/* Address display */}
            <div className="flex items-start gap-3 rounded-xl border border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.02] px-4 py-3">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground leading-relaxed">
                {address}
              </p>
            </div>

            {/* Map embed */}
            <div className="rounded-xl overflow-hidden border border-border dark:border-white/10">
              <iframe
                title="Assessment location map"
                src={mapSearchUrl}
                className="w-full bg-muted/10 dark:bg-[#04070d]/50"
                style={{ height: 400, border: "none" }}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Get Directions */}
            <Button
              variant="outline"
              className="w-full h-10 rounded-lg gap-2 font-semibold border-white/10 hover:bg-white/[0.06] hover:text-white transition-colors"
              asChild
            >
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Get Directions (Google Maps)
              </a>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="h-14 w-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <MapPin className="h-7 w-7 text-amber-400" aria-hidden="true" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-lg font-bold text-foreground">
                Location not yet provided
              </p>
              <p className="text-sm text-slate-400 max-w-xs">
                The hiring manager has not yet confirmed the venue address for
                this session. You can contact them directly below.
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
