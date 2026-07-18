import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_DESKTOP_DEVICE,
  ASSESSMENT_DEVICE_HEADER,
  assessAssessmentDevice,
  isSupportedAssessmentDeviceRequest,
} from "./assessment-device-eligibility";

const desktop = {
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
  mobileClientHint: false,
  maxTouchPoints: 0,
  coarsePointer: false,
  anyCoarsePointer: false,
};

describe("assessment device eligibility", () => {
  it("allows a desktop with a physical keyboard without using viewport width", () => {
    expect(assessAssessmentDevice(desktop)).toMatchObject({
      supported: true,
      kind: "desktop-keyboard",
    });
  });

  it.each([
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148",
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Mobile",
    "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
  ])("blocks mobile user agent %s", (userAgent) => {
    expect(assessAssessmentDevice({ ...desktop, userAgent })).toMatchObject({
      supported: false,
      kind: "mobile",
    });
  });

  it("blocks an iPad using desktop-style user agent detection", () => {
    expect(
      assessAssessmentDevice({ ...desktop, maxTouchPoints: 5 }),
    ).toMatchObject({ supported: false, kind: "touch" });
  });

  it("blocks a touchscreen laptop and coarse-pointer device", () => {
    expect(
      assessAssessmentDevice({ ...desktop, maxTouchPoints: 10 }),
    ).toMatchObject({ supported: false, kind: "touch" });
    expect(
      assessAssessmentDevice({ ...desktop, anyCoarsePointer: true }),
    ).toMatchObject({ supported: false, kind: "touch" });
  });

  it("requires the desktop attestation and rejects mobile request headers", () => {
    const supported = new Headers({
      [ASSESSMENT_DEVICE_HEADER]: ASSESSMENT_DESKTOP_DEVICE,
      "user-agent": desktop.userAgent,
      "sec-ch-ua-mobile": "?0",
    });
    expect(isSupportedAssessmentDeviceRequest(supported)).toBe(true);
    expect(isSupportedAssessmentDeviceRequest(new Headers())).toBe(false);
    supported.set("sec-ch-ua-mobile", "?1");
    expect(isSupportedAssessmentDeviceRequest(supported)).toBe(false);
  });
});
