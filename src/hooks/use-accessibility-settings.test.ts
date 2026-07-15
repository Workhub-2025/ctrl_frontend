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
});
