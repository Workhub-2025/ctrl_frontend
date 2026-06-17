import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
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
    candidateSessionDocumentId?: string | null;
    difficulty?: "Base" | "Intermediate" | "Extreme";
    assessmentVersion?: string;
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
        const strapiJwt = await getServerStrapiJwt(request);
        if (!session?.user?.id || !strapiJwt) {
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

        const {
            runs,
            startedAt,
            completedAt,
            candidateSessionDocumentId,
            difficulty,
            assessmentVersion,
        } = validation.data;

        // 4. Persist through the same assessment submission endpoint used by the
        //    other assessments. Strapi resolves candidate session -> campaign/session
        //    and performs server-side scoring/idempotency.
        const strapiClient = getStrapiClient(strapiJwt);

        const assessmentRuns = runs.filter((r) => r.runIndex > 0);
        const practiceRuns = runs.filter((r) => r.runIndex === 0);

        const created = await strapiClient.fetch("/assessment/typing/results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                startedAt,
                completedAt,
                candidateSessionDocumentId,
                rawData: {
                    assessmentType: "typing",
                    difficulty,
                    assessmentVersion,
                    rounds: assessmentRuns.map((r) => ({
                        runIndex: r.runIndex,
                        wpm: r.wpm,
                        accuracy: r.accuracy,
                        correctCharacters: r.correctCharacters,
                        mistakeCharacters: r.mistakeCharacters,
                        typedCharacters: r.typedCharacters,
                        duration: r.duration,
                    })),
                    assessmentRuns,
                    practiceRuns,
                    averageMistakes: Math.round(
                        assessmentRuns.reduce((sum, run) => sum + run.mistakeCharacters, 0) /
                        Math.max(assessmentRuns.length, 1)
                    ),
                },
            }),
        });

        if (!created.ok) {
            const body = await created.json().catch(() => ({}));
            const message = (body as { error?: { message?: string }; message?: string })?.error?.message
                ?? (body as { message?: string })?.message
                ?? "Submission failed";
            trace.failure(new Error(message));
            return NextResponse.json(
                { error: message },
                { status: created.status, headers: { "x-correlation-id": correlationId } }
            );
        }

        const result = await created.json();

        trace.success({ userId: session.user.id });

        // 6. Return confirmation — deliberately omit score so candidates cannot
        //    read their own result from the response (FR-10).
        return NextResponse.json(
            {
                success: true,
                submitted: true,
                resultId: result?.data?.documentId ?? null,
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
