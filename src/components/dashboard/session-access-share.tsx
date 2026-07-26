"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Eye, EyeOff, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchSessionAccessMaterial,
  isSecureAccessCodePlaceholder,
} from "@/lib/copy-share-links";
import {
  portalLabelClass,
  portalPanelNestedClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";

type CopiedField = "code" | "link" | null;

const REVEAL_MS = 10_000;

async function writeClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  throw new Error("Clipboard is unavailable in this browser.");
}

/**
 * Session access code + /join deep link.
 * Code stays masked until the eye is clicked; while visible the action becomes
 * Copy, then the code auto-hides after 10 seconds.
 */
export function SessionAccessShare({
  sessionId,
  accessValue,
  layout = "compact",
  className,
}: {
  sessionId: string;
  accessValue: string;
  layout?: "compact" | "panel";
  className?: string;
}) {
  const initialPlain = isSecureAccessCodePlaceholder(accessValue)
    ? null
    : accessValue;
  const [cachedCode, setCachedCode] = useState<string | null>(initialPlain);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(Boolean(initialPlain));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<CopiedField>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  const clearHideTimer = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const scheduleHide = () => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      setCopied(null);
      hideTimerRef.current = null;
    }, REVEAL_MS);
  };

  const markCopied = (field: CopiedField) => {
    setCopied(field);
    window.setTimeout(() => setCopied(null), 2000);
  };

  const ensureMaterial = async () => {
    if (cachedCode && joinUrl) {
      return { accessCode: cachedCode, joinUrl };
    }
    setIsLoading(true);
    setError(null);
    try {
      const material = await fetchSessionAccessMaterial(sessionId);
      setCachedCode(material.accessCode);
      setJoinUrl(material.joinUrl);
      return material;
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Session access details could not be loaded.";
      setError(message);
      throw loadError;
    } finally {
      setIsLoading(false);
    }
  };

  const reveal = () => {
    void (async () => {
      try {
        await ensureMaterial();
        setIsVisible(true);
        scheduleHide();
      } catch {
        /* error state already set */
      }
    })();
  };

  const hide = () => {
    clearHideTimer();
    setIsVisible(false);
    setCopied(null);
  };

  const copyCode = () => {
    void (async () => {
      try {
        const material = await ensureMaterial();
        setIsVisible(true);
        scheduleHide();
        await writeClipboard(material.accessCode);
        markCopied("code");
      } catch {
        /* error state already set */
      }
    })();
  };

  const copyLink = () => {
    void (async () => {
      try {
        const material = await ensureMaterial();
        await writeClipboard(material.joinUrl);
        markCopied("link");
      } catch {
        /* error state already set */
      }
    })();
  };

  const displayCode = isVisible && cachedCode ? cachedCode : null;

  const codeActions = (
    <>
      {!isVisible ? (
        <Button
          type="button"
          variant="outline"
          onClick={reveal}
          disabled={isLoading}
          className={layout === "panel" ? "h-9" : "h-9 px-3 text-xs"}
          aria-label="Reveal session access code"
        >
          {isLoading ? (
            <Loader2
              className={cn(
                "animate-spin",
                layout === "panel" ? "mr-2 h-4 w-4" : "mr-1.5 h-3.5 w-3.5",
              )}
              aria-hidden="true"
            />
          ) : (
            <Eye
              className={layout === "panel" ? "mr-2 h-4 w-4" : "mr-1.5 h-3.5 w-3.5"}
              aria-hidden="true"
            />
          )}
          Reveal
        </Button>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={copyCode}
            disabled={isLoading}
            className={layout === "panel" ? "h-9" : "h-9 px-3 text-xs"}
          >
            {copied === "code" ? (
              <Check
                className={
                  layout === "panel" ? "mr-2 h-4 w-4" : "mr-1.5 h-3.5 w-3.5"
                }
                aria-hidden="true"
              />
            ) : (
              <Copy
                className={
                  layout === "panel" ? "mr-2 h-4 w-4" : "mr-1.5 h-3.5 w-3.5"
                }
                aria-hidden="true"
              />
            )}
            {copied === "code" ? "Copied" : "Copy code"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={hide}
            className={layout === "panel" ? "h-9 px-2" : "h-9 w-9 px-0"}
            aria-label="Hide session access code"
          >
            <EyeOff className="h-4 w-4" aria-hidden="true" />
            {layout === "panel" ? (
              <span className="ml-2">Hide</span>
            ) : null}
          </Button>
        </>
      )}
      <Button
        type="button"
        variant="outline"
        onClick={copyLink}
        disabled={isLoading}
        className={layout === "panel" ? "h-9" : "h-9 px-3 text-xs"}
      >
        {copied === "link" ? (
          <Check
            className={layout === "panel" ? "mr-2 h-4 w-4" : "mr-1.5 h-3.5 w-3.5"}
            aria-hidden="true"
          />
        ) : (
          <Link2
            className={layout === "panel" ? "mr-2 h-4 w-4" : "mr-1.5 h-3.5 w-3.5"}
            aria-hidden="true"
          />
        )}
        {copied === "link" ? "Link copied" : "Copy join link"}
      </Button>
    </>
  );

  if (layout === "panel") {
    return (
      <div className={cn("space-y-3", className)}>
        <div className={cn(portalPanelNestedClass, "space-y-3 p-4")}>
          <div className="min-w-0">
            <p className={portalLabelClass}>Session access code</p>
            <p
              className={cn(
                "mt-2 break-all font-mono text-xl font-bold text-foreground",
                displayCode
                  ? "tracking-[0.18em]"
                  : "tracking-widest text-muted-foreground",
              )}
              aria-live="polite"
            >
              {displayCode ?? "••••••••••••"}
            </p>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Candidates enter this on{" "}
            <span className="font-medium text-foreground">/join</span> to create
            their account — including when no invite email was sent. Revealed
            codes hide again after 10 seconds.
          </p>
          <div className="flex flex-wrap gap-2">{codeActions}</div>
          {error ? (
            <p className="text-xs text-destructive" aria-live="polite">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="flex min-h-9 items-center gap-2 rounded-md border border-border bg-muted/30 px-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Code
        </span>
        <span
          className={cn(
            "font-mono text-xs font-bold text-foreground",
            displayCode ? "tracking-wider" : "tracking-widest text-muted-foreground",
          )}
          aria-live="polite"
        >
          {displayCode ?? "••••••••"}
        </span>
      </div>
      {codeActions}
      {error ? (
        <p className="basis-full text-xs text-destructive" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}
