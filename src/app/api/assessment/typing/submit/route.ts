import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
    resolveCorrelationId,
    startServerActionTrace,
} from "@/lib/observability/server-observability";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { getStrapiClient } from "@/lib/strapi";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Shape of a single run result as calculated by the TypingTest component.
 * Mirrors the RunResult type in typing-test.tsx.
 */
interface RunResult {
    runIndex: number;
    duration: number;
    typedCharacters: number;
    correctCharacters: number;
    mistakeCharacters: number;
    wpm: number;
    accuracy: number;
}

interface TypingSubmitPayload {
    runs: RunResult[];
    startedAt: string;
    completedAt: string;
    assessmentId?: string | null;
}

// ─── Scoring helpers ──────────────────────────────────────────────────────────

const FINAL_RUN_INDEX = 3; // Index of the single scored run (last one)
const DEFAULT_WPM_THRESHOLD = 32;
const DEFAULT_ACCURACY_THRESHOLD = 90;

/**
 * Computes the aggregate score from the final (scored) run only.
 * Practice runs (indices 0–2) are excluded from the official result.
 *
 * Score = average of normalised WPM (0–100) and accuracy (0–100).
 * WPM is normalised relative to a 60 WPM ceiling (reasonable professional target).
 */
function computeScore(runs: RunResult[]): {
    score: number;
    passed: boolean;
    wpm: number;
    accuracy: number;
} {
    const scoredRun = runs.find((r) => r.runIndex === FINAL_RUN_INDEX);

    if (!scoredRun) {
        return { score: 0, passed: false, wpm: 0, accuracy: 0 };
    }

    const { wpm, accuracy } = scoredRun;

    // Normalise WPM to 0-100 with 60 WPM as the 100% ceiling
    const normalisedWpm = Math.min(Math.round((wpm / 60) * 100), 100);
    const score = Math.round((normalisedWpm + accuracy) / 2);

    const passed =
        wpm >= DEFAULT_WPM_THRESHOLD && accuracy >= DEFAULT_ACCURACY_THRESHOLD;

    return { score, passed, wpm, accuracy };
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validatePayload(
    body: unknown
): { valid: true; data: TypingSubmitPayload } | { valid: false; error: string } {
    if (!body || typeof body !== "object") {
        return { valid: false, error: "Request body must be a JSON object" };
    }

    const b = body as Record<string, unknown>;

    if (!Array.isArray(b.runs) || b.runs.length === 0) {
        return { valid: false, error: "runs must be a non-empty array" };
    }

    if (b.runs.length > 10) {
        return { valid: false, error: "runs array exceeds maximum allowed length" };
    }

    for (const run of b.runs as unknown[]) {
        if (
            typeof run !== "object" ||
            run === null ||
            typeof (run as Record<string, unknown>).runIndex !== "number" ||
            typeof (run as Record<string, unknown>).wpm !== "number" ||
            typeof (run as Record<string, unknown>).accuracy !== "number"
        ) {
            return {
                valid: false,
                error: "Each run must have numeric runIndex, wpm and accuracy fields",
            };
        }

        const { wpm, accuracy } = run as { wpm: number; accuracy: number };
        if (wpm < 0 || wpm > 300) {
            return { valid: false, error: `wpm value ${wpm} is out of valid range` };
        }
        if (accuracy < 0 || accuracy > 100) {
            return {
                valid: false,
                error: `accuracy value ${accuracy} is out of valid range`,
            };
        }
    }

    if (typeof b.startedAt !== "string" || typeof b.completedAt !== "string") {
        return { valid: false, error: "startedAt and completedAt are required ISO strings" };
    }

    return { valid: true, data: b as unknown as TypingSubmitPayload };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
    const correlationId = resolveCorrelationId(
        request.headers.get("x-correlation-id")
    );
    const trace = startServerActionTrace("typingSubmit.post", { correlationId });

    try {
        // 1. Authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            trace.failure(new Error("Unauthorized"));
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401, headers: { "x-correlation-id": correlationId } }
            );
        }

        // 2. Rate limiting — one submission per 30s per user to prevent flooding
        const clientIp = extractClientIp(request);
        const limiter = await applyRateLimit({
            key: `typing-submit:${session.user.id}:${clientIp}`,
            limit: 5,
            windowMs: 30_000,
        });
        if (!limiter.allowed) {
            trace.failure(new Error("Rate limit exceeded"), { limiter });
            return NextResponse.json(
                { error: "Too many submission attempts. Please wait before retrying." },
                {
                    status: 429,
                    headers: {
                        "x-correlation-id": correlationId,
                        "retry-after": String(limiter.retryAfterSeconds),
                    },
                }
            );
        }

        // 3. Parse and validate body
        const rawBody = await request.json();
        const validation = validatePayload(rawBody);
        if (!validation.valid) {
            trace.failure(new Error(validation.error));
            return NextResponse.json(
                { error: validation.error },
                { status: 400, headers: { "x-correlation-id": correlationId } }
            );
        }

        const { runs, startedAt, completedAt, assessmentId } = validation.data;

        // 4. Compute score from the final run only (practice runs excluded)
        const { score, passed, wpm, accuracy } = computeScore(runs);

        const durationSeconds = Math.round(
            (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000
        );

        // 5. Persist to Strapi using the user's own JWT so Strapi applies the
        //    Authenticated role permissions. The controller overrides `create` to
        //    enforce ownership, idempotency, and server-side score recomputation.
        const strapiClient = getStrapiClient(session.user.jwt);

        const finalRun = runs.find((r) => r.runIndex === FINAL_RUN_INDEX);
        const practiceRuns = runs.filter((r) => r.runIndex < FINAL_RUN_INDEX);
        const metrics = {
            assessmentType: "typing",
            finalRun: {
                runIndex: FINAL_RUN_INDEX,
                wpm,
                accuracy,
                correctCharacters: finalRun?.correctCharacters ?? 0,
                mistakeCharacters: finalRun?.mistakeCharacters ?? 0,
                typedCharacters: finalRun?.typedCharacters ?? 0,
                duration: finalRun?.duration ?? 0,
            },
            practiceRuns: practiceRuns.map((r) => ({
                runIndex: r.runIndex,
                wpm: r.wpm,
                accuracy: r.accuracy,
                correctCharacters: r.correctCharacters,
                mistakeCharacters: r.mistakeCharacters,
            })),
            averageWpm: Math.round(runs.reduce((sum, r) => sum + r.wpm, 0) / runs.length),
            averageAccuracy: Math.round(runs.reduce((sum, r) => sum + r.accuracy, 0) / runs.length),
            thresholds: {
                wpm: DEFAULT_WPM_THRESHOLD,
                accuracy: DEFAULT_ACCURACY_THRESHOLD,
            },
        };

        const created = await strapiClient
            .collection("assessment-results")
            .create({
                wpm,
                accuracy,
                startedAt,
                completedAt,
                durationSeconds,
                metrics,
                rawData: { assessmentType: "typing", runs },
                ...(assessmentId ? { assessmentDocumentId: assessmentId } : {}),
            } as Record<string, unknown>);

        trace.success({ score, passed, wpm, accuracy });

        // 6. Return confirmation — deliberately omit score so candidates cannot
        //    read their own result from the response (FR-10).
        return NextResponse.json(
            {
                success: true,
                submitted: true,
                resultId: (created as unknown as Record<string, unknown>)?.documentId ?? null,
            },
            { status: 201, headers: { "x-correlation-id": correlationId } }
        );
    } catch (error) {
        // 409 from Strapi = idempotency guard: candidate already submitted
        if (
            error instanceof Error &&
            error.message.includes("409")
        ) {
            trace.failure(error, { reason: "already_submitted" });
            return NextResponse.json(
                { error: "Assessment already submitted", alreadySubmitted: true },
                { status: 409, headers: { "x-correlation-id": correlationId } }
            );
        }
        trace.failure(error);
        console.error("[typing-submit] Unhandled error:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred. Please contact support." },
            { status: 500, headers: { "x-correlation-id": correlationId } }
        );
    }
}
