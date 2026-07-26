"use client";

import { FileText, Headphones } from "lucide-react";

import {
  portalPanelBorderClass,
  portalPanelNestedClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import type { AssessmentVersionOption } from "@/services/hiring-manager-assessments.service";
import { cn } from "@/lib/utils";

type AssessmentVersionPreviewProps = {
  slug: string;
  version: AssessmentVersionOption | null | undefined;
  className?: string;
};

/**
 * HM-safe release notes for the Assessment library.
 * Samples/audio fields are reserved for a later pack-backed preview pass.
 */
export function AssessmentVersionPreview({
  slug,
  version,
  className,
}: AssessmentVersionPreviewProps) {
  const samples = version?.previewSamples?.filter(Boolean).slice(0, 3) ?? [];
  const audioPreview = version?.audioPreview;
  const hasContent =
    Boolean(version?.description) || samples.length > 0 || Boolean(audioPreview?.src);

  if (!hasContent) {
    return (
      <div
        className={cn(
          portalPanelNestedClass,
          "space-y-2 p-4 text-sm leading-relaxed text-muted-foreground",
          className,
        )}
      >
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          Release notes
        </p>
        <p>
          No additional release notes for{" "}
          <span className="font-medium text-foreground">
            {version?.title ?? `v${version?.version ?? "—"}`}
          </span>{" "}
          yet. Use this version when configuring a campaign stack.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(portalPanelNestedClass, "space-y-3 p-4", className)}>
      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
        Release notes
      </p>
      {version?.description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {version.description}
        </p>
      ) : null}
      {samples.length > 0 ? (
        <div className="grid gap-2 md:grid-cols-2">
          {samples.map((sample, index) => (
            <p
              key={`${slug}-${version?.version}-sample-${index}`}
              className={cn(
                portalPanelNestedClass,
                "rounded-md px-3 py-2 text-xs leading-5 text-foreground",
              )}
            >
              {sample}
            </p>
          ))}
        </div>
      ) : null}
      {audioPreview?.src ? (
        <div className={cn("rounded-md border p-2.5", portalPanelBorderClass)}>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
            {audioPreview.label}
          </div>
          <audio
            controls
            preload="metadata"
            src={`${audioPreview.src}#t=${audioPreview.startSeconds},${audioPreview.startSeconds + audioPreview.durationSeconds}`}
            className="h-8 w-full"
          >
            Audio preview is not supported by this browser.
          </audio>
        </div>
      ) : null}
    </div>
  );
}
