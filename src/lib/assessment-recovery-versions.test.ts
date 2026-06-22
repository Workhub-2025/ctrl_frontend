import { describe, expect, it } from "vitest";
import {
  resolveRecoveryContentVersion,
  resolveRecoveryVersionOptions,
} from "./assessment-recovery-versions";

describe("assessment-recovery-versions", () => {
  it("falls back to attempt version when catalogue is empty", () => {
    expect(resolveRecoveryVersionOptions([], "2.1.0")).toEqual([
      { version: "2.1.0", title: "Current question bank (2.1.0)" },
    ]);
  });

  it("merges catalogue versions with attempt version", () => {
    expect(
      resolveRecoveryVersionOptions(
        [{ version: "1.0.0", title: "Launch set" }],
        "1.0.0",
      ),
    ).toEqual([{ version: "1.0.0", title: "Launch set" }]);
  });

  it("resolves restart version from attempt when select is empty", () => {
    expect(resolveRecoveryContentVersion("restart", "", "1.0.0")).toBe("1.0.0");
  });

  it("returns null for resume actions", () => {
    expect(resolveRecoveryContentVersion("resume", "1.0.0", "1.0.0")).toBeNull();
  });
});
