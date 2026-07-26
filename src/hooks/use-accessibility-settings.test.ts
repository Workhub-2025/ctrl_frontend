import { describe, expect, it } from "vitest";
import {
  defaultAccessibilitySettings,
  sanitiseAccessibilitySettings,
} from "./use-accessibility-settings";

describe("accessibility setting storage", () => {
  it("rejects unknown stored values instead of applying arbitrary state", () => {
    expect(
      sanitiseAccessibilitySettings({
        theme: "javascript:alert(1)",
        textSize: "enormous",
        enhancedFocus: "true",
        hoverReader: 1,
      }),
    ).toMatchObject({
      theme: defaultAccessibilitySettings.theme,
      textSize: defaultAccessibilitySettings.textSize,
      enhancedFocus: false,
      hoverReader: false,
    });
  });

  it("migrates the previous reading font preference", () => {
    expect(sanitiseAccessibilitySettings({ readingFont: true }).fontFamily).toBe("reading");
  });

  it("migrates legacy theme and text-size keys", () => {
    expect(
      sanitiseAccessibilitySettings({
        theme: "dark-blue",
        textSize: "large",
      }),
    ).toMatchObject({
      theme: "slate",
      textSize: "112",
    });

    expect(
      sanitiseAccessibilitySettings({
        theme: "soft-cream",
        textSize: "extra-large",
      }),
    ).toMatchObject({
      theme: "parchment",
      textSize: "125",
    });

    expect(
      sanitiseAccessibilitySettings({
        theme: "black",
        textSize: "default",
      }),
    ).toMatchObject({
      theme: "obsidian",
      textSize: "100",
    });

    expect(
      sanitiseAccessibilitySettings({
        theme: "light-blue",
      }),
    ).toMatchObject({
      theme: "daylight",
    });
  });

  it("accepts the new theme and text-size keys", () => {
    expect(
      sanitiseAccessibilitySettings({
        theme: "obsidian",
        textSize: "125",
      }),
    ).toMatchObject({
      theme: "obsidian",
      textSize: "125",
    });
  });
});
