import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

/**
 * Playwright considers an all-skipped run successful. That is unsafe for this
 * suite because most skips mean required credentials or seeded IDs are absent.
 * Preserve legitimate per-test skips, but fail the run when nothing executed.
 */
export default class TruthfulRunReporter implements Reporter {
  private executedTests = 0;

  onTestEnd(_test: TestCase, result: TestResult) {
    if (result.status !== "skipped") this.executedTests += 1;
  }

  async onEnd(
    result: FullResult,
  ): Promise<{ status?: FullResult["status"] } | undefined> {
    if (result.status === "passed" && this.executedTests === 0) {
      process.stderr.write(
        "\nE2E configuration error: every selected Playwright test was skipped. Set the required E2E credentials and seeded resource IDs.\n",
      );
      return { status: "failed" };
    }
    return undefined;
  }
}
