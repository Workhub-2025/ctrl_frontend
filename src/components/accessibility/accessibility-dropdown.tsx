"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type AccessibilitySettings,
  accessibilityThemeClassName,
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
  "dark-blue": "bg-[#0b1329] border-white/10 text-white",
  black: "bg-[#080808] border-white/15 text-white",
  "soft-cream": "bg-white border-slate-200 text-slate-900",
  "light-blue": "bg-white border-slate-200 text-slate-900",
};

function segmentedClassName(isActive: boolean, isLight: boolean) {
  return cn(
    "rounded-md px-3 py-1.5 text-sm transition-all border",
    isActive
      ? (isLight
          ? "bg-slate-900 border-slate-900 text-white shadow-sm font-medium"
          : "bg-white/15 border-white text-white shadow-sm font-medium")
      : (isLight
          ? "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800"
          : "border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200")
  );
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const isLight = settings.theme === "soft-cream" || settings.theme === "light-blue";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <div>
      <h4 className={cn("mb-2 text-sm font-medium", isLight ? "text-slate-900" : "text-white")}>{label}</h4>
      <div className="flex flex-wrap gap-1.5">
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
  }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-lg px-2 py-2 text-left transition-colors",
        isLight ? "hover:bg-slate-100" : "hover:bg-white/5"
      )}
    >
      <span>
        <span className={cn("block text-sm font-medium", isLight ? "text-slate-900" : "text-white")}>{label}</span>
        <span className={cn("block text-xs leading-relaxed", isLight ? "text-slate-500" : "text-slate-400")}>{toggleDescription}</span>
      </span>
      <span
        className={cn(
          "flex h-6 w-10 shrink-0 items-center rounded-full border p-0.5 transition-colors",
          checked
            ? (isLight ? "border-slate-900 bg-slate-900 text-white" : "border-white bg-white/20 text-white")
            : (isLight ? "border-slate-300 bg-slate-100 text-slate-400" : "border-transparent bg-white/10 text-slate-400")
        )}
      >
        <span
          className={cn(
            "h-4 w-4 rounded-full bg-current transition-transform",
            checked && "translate-x-4",
            !checked && (isLight ? "bg-slate-400" : "bg-white")
          )}
        />
      </span>
    </button>
  );

  return (
    <div className="relative z-50 flex items-center ctrl-accessibility-menu" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "rounded-full p-2 transition-colors",
          isLight
            ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            : "text-slate-400 hover:bg-white/5 hover:text-white"
        )}
        aria-label="Accessibility settings"
        aria-expanded={isOpen}
      >
        <Settings className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute right-0 top-[calc(100%+8px)] max-h-[min(78svh,720px)] w-[min(92vw,360px)] origin-top-right overflow-y-auto rounded-2xl border p-5 shadow-2xl transition-colors duration-300",
              dropdownThemeClassName[settings.theme]
            )}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className={cn("text-sm font-semibold", isLight ? "text-slate-900" : "text-white")}>Accessibility Settings</h3>
                <p className={cn("mt-1 text-xs leading-relaxed", isLight ? "text-slate-500" : "text-slate-400")}>{description}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "rounded-full p-1 transition-colors",
                  isLight ? "text-slate-400 hover:bg-slate-100 hover:text-slate-800" : "text-slate-500 hover:bg-white/5 hover:text-white"
                )}
                aria-label="Close accessibility settings"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <h4 className={cn("mb-2 text-sm font-medium", isLight ? "text-slate-900" : "text-white")}>Theme</h4>
                <div className="grid grid-cols-2 gap-2">
                  {themeOptions.map((option) => {
                    const isActive = settings.theme === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateSettings({ theme: option.value })}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition-all",
                          isActive
                            ? (isLight
                                ? "border-slate-900 bg-slate-50 text-slate-900 font-medium shadow-sm"
                                : "border-white bg-white/10 text-white font-medium shadow-sm")
                            : (isLight
                                ? "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                                : "border-white/10 text-slate-400 hover:border-white/30 hover:bg-white/5 hover:text-slate-200")
                        )}
                      >
                        <span
                          className={cn(
                            "h-5 w-5 rounded-full border shadow-inner",
                            isActive ? (isLight ? "border-slate-900" : "border-white") : "border-transparent",
                            option.swatch
                          )}
                        />
                        <span className="min-w-0 flex-1 text-left">{option.label}</span>
                        {isActive && <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {renderOptionGroup({
                label: "Text size",
                value: settings.textSize,
                options: [
                  { label: "Default", value: "default" },
                  { label: "Large", value: "large" },
                  { label: "Extra", value: "extra-large" },
                ],
                onChange: (value) => updateSettings({ textSize: value as AccessibilitySettings["textSize"] }),
              })}

              {renderOptionGroup({
                label: "Line spacing",
                value: settings.lineSpacing,
                options: [
                  { label: "Default", value: "default" },
                  { label: "Comfortable", value: "comfortable" },
                  { label: "Spacious", value: "spacious" },
                ],
                onChange: (value) => updateSettings({ lineSpacing: value as AccessibilitySettings["lineSpacing"] }),
              })}

              {renderOptionGroup({
                label: "Contrast",
                value: settings.contrast,
                options: [
                  { label: "Default", value: "default" },
                  { label: "High", value: "high" },
                ],
                onChange: (value) => updateSettings({ contrast: value as AccessibilitySettings["contrast"] }),
              })}

              {renderOptionGroup({
                label: "Motion",
                value: settings.motion,
                options: [
                  { label: "Full", value: "full" },
                  { label: "Reduced", value: "reduced" },
                ],
                onChange: (value) => updateSettings({ motion: value as AccessibilitySettings["motion"] }),
              })}

              {renderOptionGroup({
                label: "Colour saturation",
                value: settings.saturation,
                options: [
                  { label: "Default", value: "default" },
                  { label: "Reduced", value: "reduced" },
                ],
                onChange: (value) => updateSettings({ saturation: value as AccessibilitySettings["saturation"] }),
              })}

              <div className={cn("h-px", isLight ? "bg-slate-200" : "bg-white/10")} />

              {renderToggle({
                label: "Enhanced focus",
                description: "Stronger outlines for keyboard navigation.",
                checked: settings.enhancedFocus,
                onChange: (checked) => updateSettings({ enhancedFocus: checked }),
              })}
              {renderToggle({
                label: "Reading font",
                description: "Use a simpler system font for page text.",
                checked: settings.readingFont,
                onChange: (checked) => updateSettings({ readingFont: checked }),
              })}
              {renderToggle({
                label: "Underline links",
                description: "Always underline text links.",
                checked: settings.underlineLinks,
                onChange: (checked) => updateSettings({ underlineLinks: checked }),
              })}

              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full bg-transparent font-medium",
                  isLight
                    ? "border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                    : "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
                )}
                onClick={resetSettings}
              >
                Reset settings
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
