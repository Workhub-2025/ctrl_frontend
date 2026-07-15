import { describe, expect, it } from "vitest";
import {
  containsHtmlMarkup,
  isSafePlainText,
  sanitiseAccessCode,
  sanitisePlainText,
} from "./input-sanitization";

describe("input sanitisation", () => {
  it("normalises and constrains candidate access codes", () => {
    expect(sanitiseAccessCode(" ctrl–9a2x <script> ")).toBe("CTRL9A2XSCRIPT");
    expect(sanitiseAccessCode("a".repeat(40))).toHaveLength(32);
  });

  it("removes control characters and line breaks from single-line text", () => {
    expect(sanitisePlainText("  A\u0000\n\tB  ")).toBe("A B");
  });

  it("detects markup at trust boundaries", () => {
    expect(containsHtmlMarkup("<img src=x onerror=alert(1)>")).toBe(true);
    expect(isSafePlainText("Normal operational note", 100)).toBe(true);
    expect(isSafePlainText("<b>unsafe</b>", 100)).toBe(false);
  });
});
