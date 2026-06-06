"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type AccessibilitySettings,
  accessibilityBackgroundClassName,
} from "@/hooks/use-accessibility-settings";

const backgroundOptions: {
  label: string;
  value: AccessibilitySettings["background"];
  swatch: string;
}[] = [
  { label: "Dark blue", value: "dark-blue", swatch: "bg-[#000a1f]" },
  { label: "Black", value: "black", swatch: "bg-black" },
  { label: "Soft light", value: "soft-light", swatch: "bg-[#f8fbff]" },
  { label: "Light blue", value: "light-blue", swatch: "bg-[#eaf6ff]" },
];

function segmentedClassName(isActive: boolean) {
  return cn(
    "rounded-md px-3 py-1.5 text-sm transition-colors",
    isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
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
      <h4 className="mb-2 text-sm font-medium text-white">{label}</h4>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={segmentedClassName(value === option.value)}
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
      className="flex w-full items-center justify-between gap-4 rounded-lg px-2 py-2 text-left hover:bg-white/5"
    >
      <span>
        <span className="block text-sm font-medium text-white">{label}</span>
        <span className="block text-xs leading-relaxed text-slate-500">{toggleDescription}</span>
      </span>
      <span
        className={cn(
          "flex h-6 w-10 shrink-0 items-center rounded-full border p-0.5 transition-colors",
          checked ? "border-cyan-500/50 bg-cyan-500/25" : "border-white/10 bg-white/5"
        )}
      >
        <span
          className={cn(
            "h-4 w-4 rounded-full bg-white transition-transform",
            checked && "translate-x-4"
          )}
        />
      </span>
    </button>
  );

  return (
    <div className="relative z-50 flex items-center" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
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
            className="absolute right-0 top-[calc(100%+8px)] max-h-[min(78svh,720px)] w-[min(92vw,360px)] origin-top-right overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0a0a]/95 p-4 shadow-2xl backdrop-blur-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Accessibility Settings</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-slate-500 hover:bg-white/5 hover:text-white"
                aria-label="Close accessibility settings"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <h4 className="mb-2 text-sm font-medium text-white">Background</h4>
                <div className="grid grid-cols-2 gap-2">
                  {backgroundOptions.map((option) => {
                    const isActive = settings.background === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateSettings({ background: option.value })}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition-colors",
                          isActive
                            ? "border-cyan-400 bg-cyan-400/10 text-white"
                            : "border-white/10 text-slate-400 hover:border-white/20 hover:bg-white/5 hover:text-slate-200"
                        )}
                      >
                        <span
                          className={cn(
                            "h-5 w-5 rounded-full border border-white/20 shadow-inner",
                            accessibilityBackgroundClassName[option.value] ?? option.swatch
                          )}
                        />
                        <span className="min-w-0 flex-1 text-left">{option.label}</span>
                        {isActive && <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />}
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

              <div className="h-px bg-white/10" />

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
                className="w-full border-white/10 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white"
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
