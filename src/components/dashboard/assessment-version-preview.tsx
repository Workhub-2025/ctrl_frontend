"use client";

import { FileText, Headphones } from "lucide-react";

import {
  portalLabelClass,
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
 * HM-safe release notes + content snippets for the Assessment library.
 * Snippets come from `lib/assessment-library-previews.ts`.
 */
export function AssessmentVersionPreview({
  slug,
  version,
  className,
}: AssessmentVersionPreviewProps) {
  const samples = version?.previewSamples?.filter(Boolean) ?? [];
  const audioPreview = version?.audioPreview;
  const hasAudio = Boolean(audioPreview?.src);
  const hasContent =
    Boolean(version?.description) || samples.length > 0 || hasAudio;

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
          No preview content for{" "}
          <span className="font-medium text-foreground">
            {version?.title ?? `v${version?.version ?? "—"}`}
          </span>{" "}
          yet. Add snippets in{" "}
          <span className="font-mono text-[11px] text-foreground">
            assessment-library-previews.ts
          </span>
          .
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {version?.description ? (
        <div className={cn(portalPanelNestedClass, "space-y-2 p-4")}>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            Release notes
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {version.description}
          </p>
        </div>
      ) : null}

      {samples.length > 0 || hasAudio ? (
        <div className={cn(portalPanelNestedClass, "space-y-3 p-4")}>
          <p className={portalLabelClass}>Content preview</p>
          {samples.length > 0 ? (
            <div className="grid gap-2">
              {samples.map((sample, index) => (
                <p
                  key={`${slug}-${version?.version}-sample-${index}`}
                  className={cn(
                    portalPanelNestedClass,
                    "rounded-md px-3 py-2.5 text-xs leading-5 text-foreground",
                  )}
                >
                  {sample}
                </p>
              ))}
            </div>
          ) : null}
          {hasAudio && audioPreview ? (
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
      ) : null}
    </div>
  );
}
