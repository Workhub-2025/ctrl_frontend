"use client";

import type { LucideIcon } from "lucide-react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import {
  Activity,
  Check,
  CircleOff,
  Contrast,
  Eye,
  Link2,
  Palette,
  RefreshCw,
  SlidersHorizontal,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { cn } from "@/lib/utils";

const themeOptions: Array<{
  label: string;
  description: string;
  value: AccessibilitySettings["theme"];
  swatches: [string, string, string];
}> = [
  {
    label: "Slate",
    description: "Navy dark",
    value: "slate",
    swatches: ["#0c1524", "#152033", "#5eb0f5"],
  },
  {
    label: "Obsidian",
    description: "Graphite dark",
    value: "obsidian",
    swatches: ["#101214", "#1a1d22", "#8fb0d4"],
  },
  {
    label: "Daylight",
    description: "Cool light",
    value: "daylight",
    swatches: ["#f4f7fa", "#ffffff", "#1a6fa8"],
  },
  {
    label: "Parchment",
    description: "Warm light",
    value: "parchment",
    swatches: ["#f7f3eb", "#fffcf7", "#1f4f7a"],
  },
];

type AccessibilityDropdownProps = {
  settings: AccessibilitySettings;
  updateSettings: (patch: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
  description?: string;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </h3>
  );
}

function OptionGroup<TValue extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: TValue;
  options: Array<{ label: string; value: TValue }>;
  onChange: (value: TValue) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </legend>
      <RadioGroupPrimitive.Root
        value={value}
        onValueChange={(nextValue) => onChange(nextValue as TValue)}
        aria-label={label}
        className="grid grid-cols-3 gap-1 border border-border bg-muted/35 p-1"
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <RadioGroupPrimitive.Item
              key={option.value}
              value={option.value}
              className={cn(
                "min-h-9 px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                selected
                  ? "border border-border bg-card text-foreground"
                  : "border border-transparent text-muted-foreground hover:bg-background hover:text-foreground",
              )}
            >
              {option.label}
            </RadioGroupPrimitive.Item>
          );
        })}
      </RadioGroupPrimitive.Root>
    </fieldset>
  );
}

function PreferenceSwitch({
  label,
  description,
  checked,
  onChange,
  icon: Icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center gap-3 border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-muted/40 text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-foreground">{label}</span>
        <span className="mt-0.5 block text-[0.6875rem] leading-snug text-muted-foreground">
          {description}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors",
          checked ? "border-primary bg-primary" : "border-border bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-transform",
            checked ? "translate-x-[1.125rem]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

export function AccessibilityDropdown({
  settings,
  updateSettings,
  resetSettings,
  description = "Adjust display and reading preferences.",
}: AccessibilityDropdownProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-md bg-background"
          aria-label="Display and accessibility options"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        aria-label="Display and accessibility options"
        className="ctrl-accessibility-menu max-h-[min(78dvh,46rem)] w-[min(calc(100vw-1rem),25rem)] overflow-y-auto rounded-md border-border bg-popover p-0 shadow-lg"
      >
        <div className="border-b border-border px-4 py-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">Display and accessibility</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>

        <div className="space-y-5 p-4">
          <div className="space-y-4">
            <SectionLabel>Appearance</SectionLabel>

            <fieldset className="space-y-2">
              <legend className="sr-only">Colour theme</legend>
              <RadioGroupPrimitive.Root
                value={settings.theme}
                onValueChange={(theme) =>
                  updateSettings({ theme: theme as AccessibilitySettings["theme"] })
                }
                aria-label="Colour theme"
                className="grid grid-cols-2 gap-2"
              >
                {themeOptions.map((option) => {
                  const selected = settings.theme === option.value;
                  return (
                    <RadioGroupPrimitive.Item
                      key={option.value}
                      value={option.value}
                      className={cn(
                        "min-h-[4.25rem] border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/45 hover:bg-muted/25",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex" aria-hidden="true">
                          {option.swatches.map((swatch, index) => (
                            <span
                              key={swatch}
                              className={cn("h-4 w-4 border border-black/10", index > 0 && "-ml-px")}
                              style={{ backgroundColor: swatch }}
                            />
                          ))}
                        </span>
                        {selected ? (
                          <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                        ) : null}
                      </span>
                      <span className="mt-2 block text-xs font-semibold text-foreground">
                        {option.label}
                      </span>
                      <span className="block text-[0.6875rem] text-muted-foreground">
                        {option.description}
                      </span>
                    </RadioGroupPrimitive.Item>
                  );
                })}
              </RadioGroupPrimitive.Root>
            </fieldset>

            <OptionGroup
              label="Text size"
              value={settings.textSize}
              options={[
                { label: "100%", value: "100" },
                { label: "112%", value: "112" },
                { label: "125%", value: "125" },
              ]}
              onChange={(textSize) => updateSettings({ textSize })}
            />

            <OptionGroup
              label="Line spacing"
              value={settings.lineSpacing}
              options={[
                { label: "Default", value: "default" },
                { label: "Comfort", value: "comfortable" },
                { label: "Spacious", value: "spacious" },
              ]}
              onChange={(lineSpacing) => updateSettings({ lineSpacing })}
            />

            <OptionGroup
              label="Typeface"
              value={settings.fontFamily}
              options={[
                { label: "Default", value: "default" },
                { label: "Reading", value: "reading" },
                { label: "Dyslexia", value: "dyslexia" },
              ]}
              onChange={(fontFamily) => updateSettings({ fontFamily })}
            />
          </div>

          <div className="space-y-2">
            <SectionLabel>Reading and focus</SectionLabel>
            <PreferenceSwitch
              label="Hover speech reader"
              description="Read supported text when the pointer rests over it."
              checked={settings.hoverReader}
              onChange={(hoverReader) => updateSettings({ hoverReader })}
              icon={Volume2}
            />
            <PreferenceSwitch
              label="Enhanced focus"
              description="Use stronger outlines for keyboard navigation."
              checked={settings.enhancedFocus}
              onChange={(enhancedFocus) => updateSettings({ enhancedFocus })}
              icon={Eye}
            />
            <PreferenceSwitch
              label="Underline links"
              description="Keep text links visually distinct without relying on colour."
              checked={settings.underlineLinks}
              onChange={(underlineLinks) => updateSettings({ underlineLinks })}
              icon={Link2}
            />
          </div>

          <div className="space-y-2">
            <SectionLabel>Colour and motion</SectionLabel>
            <PreferenceSwitch
              label="High contrast"
              description="Increase text and boundary contrast across portal surfaces."
              checked={settings.contrast === "high"}
              onChange={(checked) => updateSettings({ contrast: checked ? "high" : "default" })}
              icon={Contrast}
            />
            <PreferenceSwitch
              label="Reduce colour intensity"
              description="Lower the saturation of interface colours."
              checked={settings.saturation === "reduced"}
              onChange={(checked) => updateSettings({ saturation: checked ? "reduced" : "default" })}
              icon={Palette}
            />
            <PreferenceSwitch
              label="Greyscale"
              description="Remove colour from the interface."
              checked={settings.grayscale}
              onChange={(grayscale) => updateSettings({ grayscale })}
              icon={CircleOff}
            />
            <PreferenceSwitch
              label="Reduced motion"
              description="Minimise non-essential movement and transitions."
              checked={settings.motion === "reduced"}
              onChange={(checked) => updateSettings({ motion: checked ? "reduced" : "full" })}
              icon={Activity}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-center gap-2 rounded-md"
            onClick={resetSettings}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Reset display settings
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
