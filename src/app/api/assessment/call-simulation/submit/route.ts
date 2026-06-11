import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getStrapiClient } from "@/lib/strapi";
import {
  resolveCorrelationId,
  startServerActionTrace,
} from "@/lib/observability/server-observability";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { ai } from "@/ai/genkit";
import { z } from "genkit";
import { CALL_2_BURGLARY_CRITERIA } from "@/lib/assessment/call-simulation-criteria";
import callSimulationConfig from "../../../../../../public/assessment-content/call-simulation.json";

function isFinalRunIndex(index: number): boolean {
  const runs = callSimulationConfig?.runs || [];
  if (runs[index]) {
    return runs[index].kind === 'final';
  }
  return index === 1 || index === 2;
}

type IncidentForm = {
  callerName?: string;
  callbackNumber?: string;
  callerDob?: string;
  callerDoorNo?: string;
  callerStreet?: string;
  callerPostcode?: string;
  incidentCategory?: string;
  callerType?: string;
  responseTime?: string;
  referenceNumber?: string;
  suspectGender?: string;
  suspectEthnicity?: string;
  suspectAge?: string;
  suspectClothing?: string;
  uniqueInformation?: string;
  incidentDoorNo?: string;
  incidentStreet?: string;
  incidentPostcode?: string;
  incidentSummary?: string;
  keyInformation1?: string;
  keyInformation2?: string;
  keyInformation3?: string;
};

type FormHistoryItem = {
  timestamp: number;
  field: string;
  value: string;
};

type CallSnapshot = {
  runIndex: number;
  scenarioKey?: string;
  form: IncidentForm;
  timestamps?: Record<string, number>;
  history?: FormHistoryItem[];
};

function scoreFormCompletion(form: IncidentForm) {
  const fields: Array<keyof IncidentForm> = [
    "callerName",
    "callbackNumber",
    "callerDob",
    "callerDoorNo",
    "callerStreet",
    "callerPostcode",
    "incidentCategory",
    "callerType",
    "responseTime",
    "referenceNumber",
    "suspectGender",
    "suspectEthnicity",
    "suspectAge",
    "suspectClothing",
    "uniqueInformation",
    "incidentDoorNo",
    "incidentStreet",
    "incidentPostcode",
    "incidentSummary",
  ];
  const completed = fields.filter((field) => String(form[field] ?? "").trim().length > 0).length;
  return Math.round((completed / fields.length) * 100);
}

function validatePayload(body: unknown):
  | {
      valid: true;
      snapshots: CallSnapshot[];
      startedAt: string;
      completedAt: string;
      candidateSessionDocumentId?: string | null;
      isBypass?: boolean;
    }
  | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const value = body as Record<string, unknown>;
  const isBypass = !!value.isBypass;

  if (!isBypass && (!Array.isArray(value.snapshots) || value.snapshots.length === 0)) {
    return { valid: false, error: "snapshots must contain at least one call" };
  }

  if (typeof value.startedAt !== "string" || typeof value.completedAt !== "string") {
    return { valid: false, error: "startedAt and completedAt are required ISO strings" };
  }

  return {
    valid: true,
    snapshots: (value.snapshots ?? []) as CallSnapshot[],
    startedAt: value.startedAt,
    completedAt: value.completedAt,
    candidateSessionDocumentId:
      typeof value.candidateSessionDocumentId === "string"
        ? value.candidateSessionDocumentId
        : null,
    isBypass,
  };
}

function checkExactOrReadableMatch(key: string, value: string, expected: string): boolean {
  const v = value.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s+/g, " ");
  const exp = expected.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s+/g, " ");
  if (v === exp) return true;

  if (key === 'caller_name') {
    return v.includes('yasmin') && (v.includes('gray') || v.includes('grey'));
  }
  if (key === 'caller_street' || key === 'incident_street') {
    return v.includes('maple') && (v.includes('crescent') || v.includes('cres') || v.includes('cr'));
  }
  if (key === 'incident_category') {
    return v.includes('burglar') || v.includes('break') || v.includes('dwelling') || v.includes('residential');
  }
  if (key === 'caller_type') {
    return v.includes('victim');
  }
  if (key === 'response_time') {
    return v.includes('60') || v.includes('priority') || v.includes('officers');
  }
  if (key === 'suspect_gender') {
    return v.includes('male') || v.includes('man');
  }
  if (key === 'suspect_ethnicity') {
    return v.includes('asian');
  }
  if (key === 'suspect_age') {
    return v.includes('40') || v.includes('50');
  }
  if (key === 'caller_dob') {
    return v.includes('18') && (v.includes('03') || v.includes('march') || v.includes('87') || v.includes('1987'));
  }
  return v.includes(exp) || exp.includes(v);
}

function checkNumericMatch(value: string, expected: string): boolean {
  const v = value.replace(/\D/g, "");
  const exp = expected.replace(/\D/g, "");
  if (!v || !exp) return false;
  if (v === exp) return true;
  if (v.startsWith('44') && v.substring(2) === exp.substring(1)) return true;
  if (exp.startsWith('44') && exp.substring(2) === v.substring(1)) return true;
  return false;
}

function fallbackMatch(key: string, text: string): boolean {
  const t = text.toLowerCase();
  if (key === 'suspect_clothing') {
    return t.includes('green') || t.includes('hi-vis') || t.includes('hi vis') || t.includes('high vis') || t.includes('reflective') || t.includes('jacket');
  }
  if (key === 'unique_information' || key === 'key_information_2') {
    return t.includes('necklace') || t.includes('gold') || t.includes('stolen') || t.includes('taken') || t.includes('missing');
  }
  if (key === 'incident_summary') {
    return t.includes('burgled') || t.includes('burglary') || t.includes('broken') || t.includes('forced') || t.includes('entry');
  }
  if (key === 'key_information_1') {
    return t.includes('kitchen') || t.includes('window') || t.includes('forced') || t.includes('entry') || t.includes('damaged');
  }
  if (key === 'key_information_3') {
    return t.includes('cctv') || t.includes('camera') || t.includes('footage') || t.includes('recording') || t.includes('neighbour');
  }
  return false;
}

function getFieldValueAtTime(history: FormHistoryItem[], field: string, targetTime: number): string {
  const changes = history.filter(h => h.field === field && h.timestamp <= targetTime);
  if (changes.length === 0) return "";
  return changes[changes.length - 1].value.trim();
}

/**
 * Resolve the scoring criteria for a snapshot.
 * 1. If the snapshot carries a scenarioKey, look up the AudioCall in Strapi.
 * 2. If that AudioCall has a populated `criteria` JSON array, use it.
 * 3. Otherwise fall back to the hardcoded CALL_2_BURGLARY_CRITERIA.
 */
async function resolveCriteria(
  jwt: string,
  scenarioKey?: string
): Promise<typeof CALL_2_BURGLARY_CRITERIA> {
  if (!scenarioKey) return CALL_2_BURGLARY_CRITERIA;

  try {
    const strapiClient = getStrapiClient(jwt);
    const res = await strapiClient.fetch(
      `/a-audio-calls?filters[scenarioKey][$eq]=${encodeURIComponent(scenarioKey)}&fields=criteria&pagination[limit]=1`
    );
    if (!res.ok) return CALL_2_BURGLARY_CRITERIA;

    const body = await res.json();
    const criteriaJson = body?.data?.[0]?.criteria;

    if (Array.isArray(criteriaJson) && criteriaJson.length > 0) {
      return criteriaJson as typeof CALL_2_BURGLARY_CRITERIA;
    }
  } catch (err) {
    console.warn('[call-simulation] Could not fetch criteria from Strapi, using hardcoded fallback:', err);
  }

  return CALL_2_BURGLARY_CRITERIA;
}

async function gradeSnapshot(
  form: IncidentForm,
  timestamps: Record<string, number> = {},
  history: FormHistoryItem[] = [],
  criteria: typeof CALL_2_BURGLARY_CRITERIA = CALL_2_BURGLARY_CRITERIA
) {
  let totalEarnedScore = 0;
  let criticalErrorsCount = 0;
  let greenCount = 0;
  let amberCount = 0;
  let redCount = 0;
  const criteriaResults: any[] = [];

  const hasApiKey = !!process.env.GEMINI_API_KEY;

  // ─── Consolidated AI call for all 6 evidence-extraction criteria ─────────
  // Map: which criteria key reads from which field in the form
  const AI_FIELD_MAP: Record<string, keyof IncidentForm> = {
    suspect_clothing: 'suspectClothing',
    unique_information: 'uniqueInformation',
    incident_summary: 'incidentSummary',
    key_information_1: 'incidentSummary',
    key_information_2: 'incidentSummary',
    key_information_3: 'incidentSummary',
  };

  const aiCriteria = criteria.filter(c => c.ruleType === 'ai_evidence_extraction' || c.ruleType === 'ai_multi_point_extraction');

  // Build a map of AI results keyed by criterion key
  const aiResults: Record<string, { evidenceFound: boolean; interpretedAs: string; readable: boolean; confidence: number }> = {};

  if (aiCriteria.length > 0) {
    const suspectClothingVal = String(form.suspectClothing ?? '').trim();
    const uniqueInfoVal = String(form.uniqueInformation ?? '').trim();
    const incidentSummaryVal = String(form.incidentSummary ?? '').trim();

    if (hasApiKey && (suspectClothingVal || uniqueInfoVal || incidentSummaryVal)) {
      try {
        const criteriaLines = aiCriteria.map((c, i) => {
          const blockName =
            c.key === 'suspect_clothing' ? 'Suspect Clothing Log' :
            c.key === 'unique_information' ? 'Unique Intel Log' :
            'Incident Summary Narrative Log';
          return `${i + 1}. Criterion: "${c.key}"
   Expected Concept: "${c.expectedConcept ?? ''}"
   Accepted Examples: ${JSON.stringify(c.acceptedExamples ?? [])}
   Candidate Input Block: Use "${blockName}"`;
        }).join('\n\n');

        const collatedPrompt = `You are an expert evidence extraction assistant for emergency dispatch call logging.
Evaluate the candidate's log entries against the expected evidence concepts.

Here are the candidate's logged text blocks:
1. Suspect Clothing Log: "${suspectClothingVal}"
2. Unique Intel Log: "${uniqueInfoVal}"
3. Incident Summary Narrative Log: "${incidentSummaryVal}"

We need to evaluate the following ${aiCriteria.length} criteria:

${criteriaLines}

For each criterion:
- "key": the criterion key string
- "evidence_found" (boolean): True if the core meaning of the expected concept is present in the specified input block.
- "candidate_text_interpreted_as" (string): Clean representation of the matching phrase from the candidate's entry.
- "operationally_readable" (boolean): True if spelling/grammar errors do not obscure the operational meaning.
- "confidence" (float 0.00-1.00)

Return strictly a JSON object:
{
  "results": [
    { "key": string, "evidence_found": boolean, "candidate_text_interpreted_as": string, "operationally_readable": boolean, "confidence": number },
    ...
  ]
}`;

        const response = await ai.generate({
          prompt: collatedPrompt,
          output: {
            schema: z.object({
              results: z.array(z.object({
                key: z.string(),
                evidence_found: z.boolean(),
                candidate_text_interpreted_as: z.string(),
                operationally_readable: z.boolean(),
                confidence: z.number(),
              }))
            })
          }
        });

        const out = response.output;
        if (out?.results) {
          for (const r of out.results) {
            aiResults[r.key] = {
              evidenceFound: r.evidence_found,
              interpretedAs: r.candidate_text_interpreted_as,
              readable: r.operationally_readable,
              confidence: r.confidence,
            };
          }
        }
      } catch (error) {
        console.error('[call-simulation] Consolidated AI call failed, using fallbacks:', error);
        // aiResults will remain empty — fallback handled per-criterion below
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  for (const criterion of criteria) {
    // Determine which form field to read the candidate's value from
    const sourceField: keyof IncidentForm =
      criterion.ruleType === 'ai_evidence_extraction' && AI_FIELD_MAP[criterion.key]
        ? AI_FIELD_MAP[criterion.key]
        : (criterion.field as keyof IncidentForm);

    const candidateValue = String(form[sourceField] ?? '').trim();
    
    if (!candidateValue) {
      if (criterion.critical) {
        criticalErrorsCount++;
      }
      criteriaResults.push({
        key: criterion.key,
        displayName: criterion.displayName,
        section: criterion.section,
        value: '',
        evidenceFound: false,
        timingBand: 'Red',
        timestamp: null,
        delay: null,
        multiplier: 0.0,
        score: 0.0,
        maxScore: criterion.score,
        critical: criterion.critical ?? false,
      });
      continue;
    }

    let evidenceFound = false;
    let candidateTextInterpretedAs = candidateValue;
    let operationallyReadable = true;
    let confidence = 1.0;

    if (criterion.ruleType === 'exact_or_readable_match') {
      evidenceFound = checkExactOrReadableMatch(criterion.key, candidateValue, criterion.expectedValue || '');
    } else if (criterion.ruleType === 'numeric_match') {
      evidenceFound = checkNumericMatch(candidateValue, criterion.expectedValue || '');
    } else if (criterion.ruleType === 'ai_evidence_extraction') {
      const aiResult = aiResults[criterion.key];
      if (aiResult) {
        evidenceFound = aiResult.evidenceFound;
        candidateTextInterpretedAs = aiResult.interpretedAs;
        operationallyReadable = aiResult.readable;
        confidence = aiResult.confidence;
      } else {
        // Fallback regex matching if AI call was not made or failed
        evidenceFound = fallbackMatch(criterion.key, candidateValue);
      }
    }

    if (criterion.critical && !evidenceFound) {
      criticalErrorsCount++;
    }

    let timingBand: 'Green' | 'Amber' | 'Red' = 'Green';
    let multiplier = 1.0;
    let timestamp = timestamps[sourceField] ?? null;
    let delay: number | null = null;

    if (evidenceFound) {
      if (criterion.timeSensitive) {
        const valAt4 = getFieldValueAtTime(history, sourceField, criterion.esp + 4);
        const isIdenticalAt4 = valAt4.toLowerCase() === candidateValue.toLowerCase();
        let correctAt4 = false;

        if (isIdenticalAt4) {
          correctAt4 = true;
        } else if (valAt4) {
          correctAt4 = criterion.ruleType === 'exact_or_readable_match' ? checkExactOrReadableMatch(criterion.key, valAt4, criterion.expectedValue || '') :
                       criterion.ruleType === 'numeric_match' ? checkNumericMatch(valAt4, criterion.expectedValue || '') :
                       fallbackMatch(criterion.key, valAt4);
        }

        const editsAfter4 = history.filter(h => h.field === sourceField && h.timestamp > (criterion.esp + 4));
        const unchangedAfter4 = editsAfter4.length === 0 || editsAfter4[editsAfter4.length - 1].value.trim() === candidateValue;

        if (correctAt4 && unchangedAfter4) {
          timingBand = 'Green';
          multiplier = 1.0;
          greenCount++;
          delay = 4.0;
        } else {
          const valAt6 = getFieldValueAtTime(history, sourceField, criterion.esp + 6);
          const isIdenticalAt6 = valAt6.toLowerCase() === candidateValue.toLowerCase();
          let correctAt6 = false;

          if (isIdenticalAt6) {
            correctAt6 = true;
          } else if (valAt6) {
            correctAt6 = criterion.ruleType === 'exact_or_readable_match' ? checkExactOrReadableMatch(criterion.key, valAt6, criterion.expectedValue || '') :
                         criterion.ruleType === 'numeric_match' ? checkNumericMatch(valAt6, criterion.expectedValue || '') :
                         fallbackMatch(criterion.key, valAt6);
          }

          const editsAfter6 = history.filter(h => h.field === sourceField && h.timestamp > (criterion.esp + 6));
          const unchangedAfter6 = editsAfter6.length === 0 || editsAfter6[editsAfter6.length - 1].value.trim() === candidateValue;

          if (correctAt6 && unchangedAfter6) {
            timingBand = 'Amber';
            multiplier = 0.5;
            amberCount++;
            delay = 6.0;
          } else {
            timingBand = 'Red';
            multiplier = 0.0;
            redCount++;
            const t = (timestamp && timestamp > 0) ? timestamp : criterion.esp;
            delay = t - criterion.esp;
          }
        }
      } else {
        timingBand = 'Green';
        multiplier = 1.0;
        greenCount++;
      }
    } else {
      timingBand = 'Red';
      multiplier = 0.0;
      redCount++;
    }

    const earnedScore = parseFloat((criterion.score * multiplier).toFixed(4));
    totalEarnedScore += earnedScore;

    criteriaResults.push({
      key: criterion.key,
      displayName: criterion.displayName,
      section: criterion.section,
      value: candidateValue,
      evidenceFound,
      candidateTextInterpretedAs,
      operationallyReadable,
      confidence,
      timingBand,
      timestamp,
      delay: delay !== null ? parseFloat(delay.toFixed(2)) : null,
      multiplier,
      score: earnedScore,
      maxScore: criterion.score,
      critical: criterion.critical ?? false,
    });
  }

  // Section max scores:
  //   caller_information:       1.05
  //   system_information:       0.90
  //   suspect_information:      0.15  (gender + ethnicity + age dropdowns)
  //   intelligence_information: 2.45  (clothing 0.05 + unique_info 0.40 + summary 2.00)
  //   incident_information:     0.45  (door 0.15 + street 0.15 + postcode 0.15)
  //   Grand total:              5.00
  const MAX_SCORE = 5.0;

  const sectionScores: Record<string, { score: number; max: number }> = {
    caller_information:       { score: 0, max: 1.05 },
    system_information:       { score: 0, max: 0.90 },
    suspect_information:      { score: 0, max: 0.15 },
    intelligence_information: { score: 0, max: 2.45 },
    incident_information:     { score: 0, max: 0.45 },
  };

  for (const res of criteriaResults) {
    if (sectionScores[res.section]) {
      sectionScores[res.section].score += res.score;
    }
  }

  for (const s of Object.keys(sectionScores)) {
    sectionScores[s].score = parseFloat(sectionScores[s].score.toFixed(2));
  }

  const overallScorePercent = parseFloat(((totalEarnedScore / MAX_SCORE) * 100).toFixed(2));
  const passed = overallScorePercent >= 70 && criticalErrorsCount === 0;

  let information_capture = "You captured the core details of the caller and incident accurately.";
  if (criticalErrorsCount > 0) {
    information_capture = "Some critical dispatcher details (e.g. correct category, response level, or postcode) were recorded incorrectly or omitted.";
  }

  let timeliness = "Excellent timing. All details were processed with minimal delay.";
  if (redCount > 2) {
    timeliness = "Several critical entries were completed outside the optimal timing window.";
  } else if (amberCount > 2) {
    timeliness = "Some details were captured with slight delays, but overall handled reasonably.";
  }

  return {
    score: overallScorePercent,
    totalEarnedScore: parseFloat(totalEarnedScore.toFixed(2)),
    maxScore: MAX_SCORE,
    criticalErrorsCount,
    passed,
    sections: sectionScores,
    criteria: criteriaResults,
    feedback: {
      information_capture,
      timeliness,
      incident_understanding: "You demonstrated a structured understanding of the report detail and caller distress.",
    }
  };
}

export async function POST(request: Request) {
  const correlationId = resolveCorrelationId(request.headers.get("x-correlation-id"));
  const trace = startServerActionTrace("callSimulationSubmit.post", { correlationId });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.jwt) {
      trace.failure(new Error("Unauthorized"));
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "x-correlation-id": correlationId } }
      );
    }

    const limiter = await applyRateLimit({
      key: `call-simulation-submit:${session.user.id}:${extractClientIp(request)}`,
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

    const validation = validatePayload(await request.json());
    if (!validation.valid) {
      trace.failure(new Error(validation.error));
      return NextResponse.json(
        { error: validation.error },
        { status: 400, headers: { "x-correlation-id": correlationId } }
      );
    }

    let calls: any[];
    let practiceCalls: any[];
    let overallScorePercent = 0;
    let overallPassed = false;
    let finalMetrics: any = {};

    if (validation.isBypass) {
      overallScorePercent = 80;
      overallPassed = true;
      finalMetrics = {
        score: 80,
        totalEarnedScore: 4.0,
        maxScore: 5.0,
        criticalErrorsCount: 0,
        passed: true,
        sections: {
          caller_information: { score: 0.84, max: 1.05 },
          system_information: { score: 0.72, max: 0.90 },
          intelligence_information: { score: 0.56, max: 0.70 },
          incident_information: { score: 1.88, max: 2.35 },
        },
        criteria: [],
        feedback: {
          information_capture: "Bypassed assessment evaluation.",
          timeliness: "Bypassed assessment evaluation.",
          incident_understanding: "Bypassed assessment evaluation."
        }
      };
      calls = [{
        runIndex: 2,
        durationSeconds: 0,
        fieldAccuracy: 80,
        form: {
          callerName: "Bypassed",
          callbackNumber: "Bypassed",
          callerDob: "Bypassed",
          callerDoorNo: "Bypassed",
          callerStreet: "Bypassed",
          callerPostcode: "Bypassed",
          incidentCategory: "Bypassed",
          callerType: "Bypassed",
          responseTime: "Bypassed",
          referenceNumber: "Bypassed",
          suspectGender: "Bypassed",
          suspectEthnicity: "Bypassed",
          suspectAge: "Bypassed",
          suspectClothing: "Bypassed",
          uniqueInformation: "Bypassed",
          incidentDoorNo: "Bypassed",
          incidentStreet: "Bypassed",
          incidentPostcode: "Bypassed",
          incidentSummary: "Bypassed",
          keyInformation1: "Bypassed",
          keyInformation2: "Bypassed",
          keyInformation3: "Bypassed",
        },
      }];
      practiceCalls = [];
    } else {
      const finalSnapshots = validation.snapshots.filter(s => isFinalRunIndex(s.runIndex));
      const practiceSnapshots = validation.snapshots.filter(s => !isFinalRunIndex(s.runIndex));

      if (finalSnapshots.length === 0) {
        return NextResponse.json(
          { error: "A final call snapshot is required" },
          { status: 400, headers: { "x-correlation-id": correlationId } }
        );
      }

      const gradedFinals = await Promise.all(
        finalSnapshots.map(async (snapshot) => {
          const criteria = await resolveCriteria(session.user.jwt, snapshot.scenarioKey);
          const metrics = await gradeSnapshot(
            snapshot.form,
            snapshot.timestamps || {},
            snapshot.history || [],
            criteria
          );
          return {
            snapshot,
            metrics,
          };
        })
      );

      const finalCount = gradedFinals.length;
      const avgScore = parseFloat((gradedFinals.reduce((sum, f) => sum + f.metrics.score, 0) / finalCount).toFixed(2));
      const avgEarnedScore = parseFloat((gradedFinals.reduce((sum, f) => sum + f.metrics.totalEarnedScore, 0) / finalCount).toFixed(2));
      const totalCriticalErrors = gradedFinals.reduce((sum, f) => sum + f.metrics.criticalErrorsCount, 0);
      const allPassed = gradedFinals.every(f => f.metrics.passed);

      // Average section scores
      const avgSections: Record<string, { score: number; max: number }> = {};
      const sectionKeys = ['caller_information', 'system_information', 'intelligence_information', 'incident_information'];
      for (const sk of sectionKeys) {
        const totalSecScore = gradedFinals.reduce((sum, f) => sum + (f.metrics.sections[sk]?.score ?? 0), 0);
        const maxSecVal = gradedFinals[0]?.metrics.sections[sk]?.max ?? 1.0;
        avgSections[sk] = {
          score: parseFloat((totalSecScore / finalCount).toFixed(2)),
          max: maxSecVal,
        };
      }

      // Use the criteria from the last final run for display/feedback details
      const lastFinalMetrics = gradedFinals[gradedFinals.length - 1].metrics;

      finalMetrics = {
        score: avgScore,
        totalEarnedScore: avgEarnedScore,
        maxScore: 5.0,
        criticalErrorsCount: totalCriticalErrors,
        passed: allPassed,
        sections: avgSections,
        criteria: lastFinalMetrics.criteria,
        feedback: lastFinalMetrics.feedback,
      };

      overallScorePercent = avgScore;
      overallPassed = allPassed;

      calls = gradedFinals.map(({ snapshot, metrics }) => ({
        runIndex: snapshot.runIndex,
        durationSeconds: 0,
        fieldAccuracy: scoreFormCompletion(snapshot.form),
        form: snapshot.form,
        timestamps: snapshot.timestamps,
        metrics,
      }));

      practiceCalls = practiceSnapshots.map((snapshot) => ({
        runIndex: snapshot.runIndex,
        durationSeconds: 0,
        fieldAccuracy: scoreFormCompletion(snapshot.form),
        form: snapshot.form,
        timestamps: snapshot.timestamps,
      }));
    }

    const strapiClient = getStrapiClient(session.user.jwt);
    const created = await strapiClient.fetch("/assessment/call-simulation/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startedAt: validation.startedAt,
        completedAt: validation.completedAt,
        candidateSessionDocumentId: validation.candidateSessionDocumentId,
        rawData: {
          assessmentType: "call-simulation",
          calls,
          practiceCalls,
          score: overallScorePercent,
          passed: overallPassed,
          metrics: finalMetrics,
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

    return NextResponse.json(
      {
        success: true,
        submitted: true,
        resultId: result?.data?.documentId ?? null,
      },
      { status: 201, headers: { "x-correlation-id": correlationId } }
    );
  } catch (error) {
    trace.failure(error);
    console.error("[call-simulation-submit] Unhandled error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please contact support." },
      { status: 500, headers: { "x-correlation-id": correlationId } }
    );
  }
}
