"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, X, Volume2, Ruler, Type, Eye, Contrast, Link2, Activity, RefreshCw, Accessibility, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type AccessibilitySettings,
} from "@/hooks/use-accessibility-settings";

const themeOptions: {
  label: string;
  value: AccessibilitySettings["theme"];
  swatch: string;
}[] = [
    { label: "Dark blue", value: "dark-blue", swatch: "bg-[#02040a] border border-white/10" },
    { label: "Black", value: "black", swatch: "bg-black border border-white/10" },
    { label: "Soft cream", value: "soft-cream", swatch: "bg-[#fdfaf2] border border-black/10" },
    { label: "Light blue", value: "light-blue", swatch: "bg-[#eaf6ff] border border-black/10" },
  ];

const dropdownThemeClassName: Record<AccessibilitySettings["theme"], string> = {
  "dark-blue": "bg-[#0b1329] border-white/10 text-white shadow-[0_32px_96px_rgba(0,0,0,0.7)]",
  black: "bg-[#0a0a0a] border-white/15 text-white shadow-[0_32px_96px_rgba(0,0,0,0.8)]",
  "soft-cream": "bg-white border-slate-200 text-slate-900 shadow-[0_24px_64px_rgba(0,0,0,0.15)]",
  "light-blue": "bg-white border-slate-200 text-slate-900 shadow-[0_24px_64px_rgba(0,0,0,0.15)]",
};

function segmentedClassName(isActive: boolean, isLight: boolean) {
  return cn(
    "rounded-lg px-2.5 py-1.5 text-xs transition-all border flex-1 text-center font-medium",
    isActive
      ? (isLight
        ? "border-sky-600 bg-sky-600 text-white shadow-sm"
        : "bg-white/15 border-white text-white shadow-sm")
      : (isLight
        ? "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        : "border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200")
  );
}

const PANEL_EDGE_INSET = 8;
const PANEL_MAX_WIDTH = 370;

function computePanelPosition(triggerRect: DOMRect) {
  const viewportWidth = window.innerWidth;
  const width = Math.min(PANEL_MAX_WIDTH, viewportWidth - PANEL_EDGE_INSET * 2);
  const preferredLeft = triggerRect.right - width;
  const left = Math.max(
    PANEL_EDGE_INSET,
    Math.min(preferredLeft, viewportWidth - width - PANEL_EDGE_INSET)
  );

  return {
    top: triggerRect.bottom + PANEL_EDGE_INSET,
    left,
    width,
  };
}

type AccessibilityDropdownProps = {
  settings: AccessibilitySettings;
  updateSettings: (patch: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
  description?: string;
};

export function AccessibilityDropdown({
  settings,
  updateSettings,
  resetSettings,
  description = "Adjust the page display.",
}: AccessibilityDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isLight = settings.theme === "soft-cream" || settings.theme === "light-blue";

  const updatePanelPosition = useCallback(() => {
    if (!triggerRef.current) return;
    setPanelPosition(computePanelPosition(triggerRef.current.getBoundingClientRect()));
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPanelPosition(null);
      return;
    }

    updatePanelPosition();

    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [isOpen, updatePanelPosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sectionLabel = (text: string) => (
    <h4
      className={cn(
        "flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em]",
        isLight ? "text-slate-500" : "text-slate-400"
      )}
    >
      <span className="h-1 w-1 rounded-full bg-sky-500" />
      {text}
    </h4>
  );

  const panelClassName = cn(
    "fixed z-[120] max-h-[min(78svh,720px)] origin-top-right overflow-y-auto rounded-2xl border p-5 transition-colors duration-300 ctrl-accessibility-menu dropdown",
    dropdownThemeClassName[settings.theme]
  );

  const renderOptionGroup = ({
    label,
    value,
    options,
    onChange,
  }: {
    label: string;
    value: string;
    options: { label: string; value: string }[];
    onChange: (value: string) => void;
  }) => (
    <div className="space-y-2">
      {sectionLabel(label)}
      <div className="flex gap-1 bg-muted/50 dark:bg-white/[0.02] p-1 rounded-xl border border-border dark:border-white/5">
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={segmentedClassName(value === option.value, isLight)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderToggle = ({
    label,
    description: toggleDescription,
    checked,
    onChange,
    icon: ToggleIcon,
  }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    icon: any;
  }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl border border-border dark:border-white/5 bg-muted/30 dark:bg-white/[0.02] p-3 text-left transition-all hover:scale-[1.01] hover:border-border dark:hover:border-white/20",
        isLight ? "hover:bg-accent/40" : "hover:bg-white/[0.03]"
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
          checked
            ? "border-primary/20 bg-primary/10 text-primary shadow-sm"
            : (isLight ? "border-slate-200 bg-slate-100 text-slate-400" : "border-white/10 bg-white/5 text-slate-400")
        )}>
          <ToggleIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <span className={cn("block text-xs font-semibold tracking-wide", isLight ? "text-slate-800" : "text-slate-200")}>{label}</span>
          <span className={cn("block text-[10px] leading-relaxed mt-0.5", isLight ? "text-slate-500" : "text-slate-400")}>{toggleDescription}</span>
        </div>
      </div>
      <span
        className={cn(
          "flex h-5 w-8 shrink-0 items-center rounded-full border p-0.5 transition-colors",
          checked
            ? (isLight ? "border-sky-600 bg-sky-600 text-white" : "border-white bg-white/20 text-white")
            : (isLight ? "border-border bg-muted text-muted-foreground" : "border-transparent bg-white/10 text-slate-400")
        )}
      >
        <span
          className={cn(
            "h-3.5 w-3.5 rounded-full bg-current transition-transform",
            checked && "translate-x-3",
            !checked && (isLight ? "bg-muted-foreground/70" : "bg-white")
          )}
        />
      </span>
    </button>
  );

  const panelContent = (
    <>
      {/* Top accent line */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />

      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4 border-b border-border/40 dark:border-white/5 pb-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
              isLight
                ? "border-sky-500/20 bg-sky-500/10 text-sky-600"
                : "border-sky-400/20 bg-sky-400/10 text-sky-400"
            )}
          >
            <Accessibility className="h-4 w-4" />
          </div>
          <div>
            <h3 className={cn("text-sm font-bold tracking-tight", isLight ? "text-slate-900" : "text-white")}>Accessibility Control Center</h3>
            <p className={cn("mt-0.5 text-xs", isLight ? "text-slate-500" : "text-slate-400")}>{description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className={cn(
            "shrink-0 rounded-full p-1.5 transition-colors",
            isLight ? "text-slate-400 hover:bg-slate-100 hover:text-slate-800" : "text-slate-500 hover:bg-white/5 hover:text-white"
          )}
          aria-label="Close accessibility settings"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Theme Grid */}
        <div className="space-y-2">
          {sectionLabel("Color Theme")}
          <div className="grid grid-cols-2 gap-2">
            {themeOptions.map((option) => {
              const isActive = settings.theme === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateSettings({ theme: option.value })}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs transition-all hover:scale-[1.01]",
                    isActive
                      ? (isLight
                        ? "border-primary bg-primary/10 text-foreground font-semibold shadow-sm ring-1 ring-primary/20"
                        : "border-white bg-white/10 text-white font-semibold shadow-sm")
                      : (isLight
                        ? "border-border text-muted-foreground hover:border-primary/30 hover:bg-accent/40 hover:text-foreground"
                        : "border-white/10 text-slate-400 hover:border-white/30 hover:bg-white/5 hover:text-slate-200")
                  )}
                >
                  <span
                    className={cn(
                      "h-4 w-4 rounded-full border shadow-inner",
                      isActive ? (isLight ? "border-primary ring-1 ring-primary/30" : "border-white") : "border-transparent",
                      option.swatch
                    )}
                  />
                  <span className="min-w-0 flex-1 text-left">{option.label}</span>
                  {isActive && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Text Sizing */}
        {renderOptionGroup({
          label: "Text Size",
          value: settings.textSize,
          options: [
            { label: "Default", value: "default" },
            { label: "Large", value: "large" },
            { label: "Extra", value: "extra-large" },
          ],
          onChange: (value) => updateSettings({ textSize: value as AccessibilitySettings["textSize"] }),
        })}

        {/* Line Spacing */}
        {renderOptionGroup({
          label: "Line Spacing",
          value: settings.lineSpacing,
          options: [
            { label: "Default", value: "default" },
            { label: "Comfortable", value: "comfortable" },
            { label: "Spacious", value: "spacious" },
          ],
          onChange: (value) => updateSettings({ lineSpacing: value as AccessibilitySettings["lineSpacing"] }),
        })}

        {/* Advanced Assistive Controls */}
        <div className="space-y-2.5">
          {sectionLabel("Cognitive & Focus Aids")}

          {renderToggle({
            label: "Dyslexia Font",
            description: "Asymmetric letter shapes for readability.",
            checked: settings.dyslexiaFont,
            onChange: (checked) => updateSettings({ dyslexiaFont: checked }),
            icon: Type,
          })}

          {renderToggle({
            label: "Reading Guide Ruler",
            description: "Line highlighter overlay tracking mouse.",
            checked: settings.focusRuler,
            onChange: (checked) => updateSettings({ focusRuler: checked }),
            icon: Ruler,
          })}

          {renderToggle({
            label: "Hover Speech Reader",
            description: "Hovering over text reads it out loud.",
            checked: settings.hoverReader,
            onChange: (checked) => updateSettings({ hoverReader: checked }),
            icon: Volume2,
          })}

          {renderToggle({
            label: "Enhanced Focus Outlines",
            description: "High-contrast keyboard focus rings.",
            checked: settings.enhancedFocus,
            onChange: (checked) => updateSettings({ enhancedFocus: checked }),
            icon: Eye,
          })}
        </div>

        {/* Display & Motion Controls */}
        <div className="space-y-2.5">
          {sectionLabel("Display & Saturation")}

          {renderToggle({
            label: "Monochromatic Grayscale",
            description: "Render view in complete grayscale.",
            checked: settings.grayscale,
            onChange: (checked) => updateSettings({ grayscale: checked }),
            icon: Eye,
          })}

          {renderToggle({
            label: "High Contrast Outlines",
            description: "Boost borders and text contrast ratios.",
            checked: settings.contrast === "high",
            onChange: (checked) => updateSettings({ contrast: checked ? "high" : "default" }),
            icon: Contrast,
          })}

          {renderToggle({
            label: "Reduced Motion",
            description: "Enforce zero layouts transitions/motion.",
            checked: settings.motion === "reduced",
            onChange: (checked) => updateSettings({ motion: checked ? "reduced" : "full" }),
            icon: Activity,
          })}

          {renderToggle({
            label: "Underline Text Links",
            description: "Always force underscores below links.",
            checked: settings.underlineLinks,
            onChange: (checked) => updateSettings({ underlineLinks: checked }),
            icon: Link2,
          })}
        </div>

        <div className={cn("h-px", isLight ? "bg-slate-200" : "bg-white/10")} />

        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full bg-transparent font-semibold gap-2 rounded-xl h-10 hover:border-red-500/20 hover:text-red-500 transition-colors",
            isLight
              ? "border-slate-200 text-slate-600 hover:bg-red-50/50"
              : "border-white/10 text-slate-300 hover:bg-red-500/5"
          )}
          onClick={resetSettings}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reset settings
        </Button>
      </div>
    </>
  );

  return (
    <div className="relative z-50 flex items-center ctrl-accessibility-menu" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "rounded-full p-2 transition-all hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
          isLight
            ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200"
            : "text-slate-400 hover:bg-white/5 hover:text-white border border-white/10"
        )}
        aria-label="Accessibility settings"
        aria-expanded={isOpen}
      >
        <LifeBuoy className="h-5 w-5" />
      </button>

      {isMounted && createPortal(
        <AnimatePresence>
          {isOpen && panelPosition && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                top: panelPosition.top,
                left: panelPosition.left,
                width: panelPosition.width,
              }}
              className={panelClassName}
            >
              {panelContent}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
