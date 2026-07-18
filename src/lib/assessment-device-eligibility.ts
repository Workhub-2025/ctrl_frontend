export const ASSESSMENT_DEVICE_HEADER = "X-CTRL-Assessment-Device";
export const ASSESSMENT_DESKTOP_DEVICE = "desktop-keyboard";

const MOBILE_USER_AGENT =
  /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|IEMobile|Opera Mini/i;

export type AssessmentDeviceSignals = {
  userAgent: string;
  mobileClientHint?: boolean;
  maxTouchPoints: number;
  coarsePointer: boolean;
  anyCoarsePointer: boolean;
};

export type AssessmentDeviceEligibility = {
  supported: boolean;
  kind: "desktop-keyboard" | "mobile" | "touch" | "unknown";
  detail: string;
};

export function assessAssessmentDevice(
  signals: AssessmentDeviceSignals,
): AssessmentDeviceEligibility {
  const mobile =
    signals.mobileClientHint === true || MOBILE_USER_AGENT.test(signals.userAgent);
  if (mobile) {
    return {
      supported: false,
      kind: "mobile",
      detail:
        "Mobile devices are not supported. Use a desktop or laptop with a physical keyboard.",
    };
  }

  const touch =
    signals.maxTouchPoints > 0 ||
    signals.coarsePointer ||
    signals.anyCoarsePointer;
  if (touch) {
    return {
      supported: false,
      kind: "touch",
      detail:
        "Touch input was detected. Use a non-touch desktop or laptop with a physical keyboard.",
    };
  }

  return {
    supported: true,
    kind: "desktop-keyboard",
    detail: "Desktop or laptop with physical keyboard detected",
  };
}

export function detectAssessmentDevice(): AssessmentDeviceEligibility {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      supported: false,
      kind: "unknown",
      detail: "Device compatibility has not been checked yet.",
    };
  }

  const navigatorWithClientHints = navigator as Navigator & {
    userAgentData?: { mobile?: boolean };
  };

  return assessAssessmentDevice({
    userAgent: navigator.userAgent,
    mobileClientHint: navigatorWithClientHints.userAgentData?.mobile,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    coarsePointer: window.matchMedia?.("(pointer: coarse)").matches ?? false,
    anyCoarsePointer: window.matchMedia?.("(any-pointer: coarse)").matches ?? false,
  });
}

type HeaderReader = Pick<Headers, "get">;

export function isSupportedAssessmentDeviceRequest(headers: HeaderReader) {
  const attestedDesktop =
    headers.get(ASSESSMENT_DEVICE_HEADER) === ASSESSMENT_DESKTOP_DEVICE;
  const mobileClientHint = headers.get("sec-ch-ua-mobile") === "?1";
  const userAgent = headers.get("user-agent") ?? "";

  return attestedDesktop && !mobileClientHint && !MOBILE_USER_AGENT.test(userAgent);
}

export function assessmentDeviceRequestHeaders(): Record<string, string> {
  const eligibility = detectAssessmentDevice();
  return {
    [ASSESSMENT_DEVICE_HEADER]: eligibility.supported
      ? ASSESSMENT_DESKTOP_DEVICE
      : "unsupported",
  };
}
