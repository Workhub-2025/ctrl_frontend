"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

export const ACCESSIBILITY_STORAGE_KEY = "ctrl-accessibility-settings";

export type AccessibilitySettings = {
  theme: "dark-blue" | "black" | "soft-cream" | "light-blue";
  textSize: "default" | "large" | "extra-large";
  lineSpacing: "default" | "comfortable" | "spacious";
  contrast: "default" | "high";
  motion: "full" | "reduced";
  enhancedFocus: boolean;
  readingFont: boolean;
  dyslexiaFont: boolean;
  focusRuler: boolean;
  hoverReader: boolean;
  grayscale: boolean;
  underlineLinks: boolean;
  saturation: "default" | "reduced";
};

export const defaultAccessibilitySettings: AccessibilitySettings = {
  theme: "dark-blue",
  textSize: "default",
  lineSpacing: "default",
  contrast: "default",
  motion: "full",
  enhancedFocus: false,
  readingFont: false,
  dyslexiaFont: false,
  focusRuler: false,
  hoverReader: false,
  grayscale: false,
  underlineLinks: false,
  saturation: "default",
};

export const accessibilityThemeClassName: Record<AccessibilitySettings["theme"], string> = {
  "dark-blue": "bg-[#02040a]",
  black: "bg-black",
  "soft-cream": "bg-[#fdfaf2]",
  "light-blue": "bg-[#eaf6ff]",
};

function sanitiseSettings(input: Partial<AccessibilitySettings>): AccessibilitySettings {
  const next = { ...defaultAccessibilitySettings, ...input };

  if (!(next.theme in accessibilityThemeClassName)) {
    next.theme = defaultAccessibilitySettings.theme;
  }

  return next;
}

export function useAccessibilitySettings(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultAccessibilitySettings);
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = settings.motion === "reduced" || !!prefersReducedMotion;

  useEffect(() => {
    if (!enabled) return;

    try {
      const raw = window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
      if (!raw) return;
      setSettings(sanitiseSettings(JSON.parse(raw) as Partial<AccessibilitySettings>));
    } catch {
      setSettings(defaultAccessibilitySettings);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    window.localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(settings));

    const root = document.documentElement;
    root.dataset.ctrlTheme = settings.theme;
    root.dataset.ctrlTextSize = settings.textSize;
    root.dataset.ctrlLineSpacing = settings.lineSpacing;
    root.dataset.ctrlContrast = settings.contrast;
    root.dataset.ctrlMotion = reduceMotion ? "reduced" : "full";
    root.dataset.ctrlFocus = settings.enhancedFocus ? "enhanced" : "default";
    root.dataset.ctrlReadingFont = settings.readingFont ? "enabled" : "default";
    root.dataset.ctrlDyslexiaFont = settings.dyslexiaFont ? "enabled" : "default";
    root.dataset.ctrlGrayscale = settings.grayscale ? "enabled" : "default";
    root.dataset.ctrlUnderlineLinks = settings.underlineLinks ? "enabled" : "default";
    root.dataset.ctrlSaturation = settings.saturation;

    // Synchronise root dark/light class
    const isLight = settings.theme === "soft-cream" || settings.theme === "light-blue";
    if (isLight) {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
  }, [enabled, settings, reduceMotion]);

  // Handle Focus Ruler
  useEffect(() => {
    if (!enabled) return;

    if (settings.focusRuler) {
      let ruler = document.getElementById("ctrl-reading-guide-ruler");
      if (!ruler) {
        ruler = document.createElement("div");
        ruler.id = "ctrl-reading-guide-ruler";
        ruler.style.position = "fixed";
        ruler.style.left = "0";
        ruler.style.right = "0";
        ruler.style.height = "26px";
        ruler.style.backgroundColor = "rgba(59, 130, 246, 0.12)";
        ruler.style.borderTop = "2px solid rgba(59, 130, 246, 0.35)";
        ruler.style.borderBottom = "2px solid rgba(59, 130, 246, 0.35)";
        ruler.style.pointerEvents = "none";
        ruler.style.zIndex = "999999";
        ruler.style.transform = "translateY(-50%)";
        ruler.style.top = "50%";
        ruler.style.transition = "top 0.04s ease-out";
        document.body.appendChild(ruler);
      }

      const handleMouseMove = (e: MouseEvent) => {
        const currentRuler = document.getElementById("ctrl-reading-guide-ruler");
        if (currentRuler) {
          currentRuler.style.top = `${e.clientY}px`;
        }
      };

      window.addEventListener("mousemove", handleMouseMove);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        const currentRuler = document.getElementById("ctrl-reading-guide-ruler");
        if (currentRuler) currentRuler.remove();
      };
    } else {
      const currentRuler = document.getElementById("ctrl-reading-guide-ruler");
      if (currentRuler) currentRuler.remove();
    }
  }, [enabled, settings.focusRuler]);

  // Handle Speech Hover Reader
  useEffect(() => {
    if (!enabled) return;

    if (settings.hoverReader) {
      let lastSpokenText = "";
      let speechTimeout: any;

      const handleMouseOver = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target) return;

        const tagsToRead = ["P", "SPAN", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "BUTTON", "A", "LABEL"];
        if (!tagsToRead.includes(target.tagName)) return;

        const text = target.innerText?.trim();
        if (!text || text === lastSpokenText) return;

        clearTimeout(speechTimeout);
        speechTimeout = setTimeout(() => {
          if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.05;
            utterance.onend = () => {
              lastSpokenText = "";
            };
            window.speechSynthesis.speak(utterance);
            lastSpokenText = text;
          }
        }, 450); // Debounce speech
      };

      const handleMouseLeave = () => {
        clearTimeout(speechTimeout);
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        lastSpokenText = "";
      };

      document.addEventListener("mouseover", handleMouseOver);
      document.addEventListener("mouseleave", handleMouseLeave);
      return () => {
        document.removeEventListener("mouseover", handleMouseOver);
        document.removeEventListener("mouseleave", handleMouseLeave);
        clearTimeout(speechTimeout);
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      };
    }
  }, [enabled, settings.hoverReader]);

  return {
    settings,
    updateSettings: (patch: Partial<AccessibilitySettings>) =>
      setSettings((current) => sanitiseSettings({ ...current, ...patch })),
    resetSettings: () => setSettings(defaultAccessibilitySettings),
    reduceMotion,
    themeClassName: accessibilityThemeClassName[settings.theme],
  };
}
