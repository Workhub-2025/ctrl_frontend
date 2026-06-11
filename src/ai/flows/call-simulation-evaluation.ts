import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const EvaluationCriterionInputSchema = z.object({
  key: z.string(),
  ruleType: z.enum(['ai_evidence_extraction', 'ai_multi_point_extraction']),
  expectedConcept: z.string().optional(),
  acceptedExamples: z.array(z.string()).optional(),
  keyPoints: z.array(z.string()).optional(),
});

export const CallSimulationEvaluationInputSchema = z.object({
  suspectClothing: z.string(),
  uniqueInformation: z.string(),
  incidentSummary: z.string(),
  criteria: z.array(EvaluationCriterionInputSchema),
});

export type CallSimulationEvaluationInput = z.infer<typeof CallSimulationEvaluationInputSchema>;

const EvaluationCriterionOutputSchema = z.object({
  key: z.string(),
  evidenceFound: z.boolean().optional().describe('Only for ai_evidence_extraction. True if the expectedConcept or matching meaning is present in the logged entry.'),
  keyPointsFound: z.array(z.boolean()).optional().describe('Only for ai_multi_point_extraction. An array of booleans matching the length and order of the provided keyPoints, indicating whether each key point was mentioned/recorded in the candidate summary.'),
  structureScoreMultiplier: z.number().optional().describe('Only for ai_multi_point_extraction. Value between 0.0 and 1.0 indicating narrative quality (clarity, professional tone, and structure) of the summary.'),
  explanation: z.string().describe('A very brief explanation of the grading (e.g., "Found clothing description" or "Missing 2 key points; professional tone").'),
});

export const CallSimulationEvaluationOutputSchema = z.object({
  results: z.array(EvaluationCriterionOutputSchema),
});

export type CallSimulationEvaluationOutput = z.infer<typeof CallSimulationEvaluationOutputSchema>;

const callSimulationPrompt = ai.definePrompt({
  name: 'callSimulationEvaluationPrompt',
  input: {
    schema: z.object({
      combinedLog: z.string(),
      criteriaDescription: z.string(),
    }),
  },
  output: { schema: CallSimulationEvaluationOutputSchema },
  prompt: `You are an expert evidence extraction AI evaluating candidate entries logged during an emergency dispatch call simulation.
Analyze the candidate's combined text logs against the expected scoring criteria.

Here is the candidate's combined log text:
"""
{{{combinedLog}}}
"""

We need to evaluate the following criteria:
{{{criteriaDescription}}}

Evaluation Rules:
1. Every explanation in the output MUST start with "CTRL AI Bot has found: " (e.g., "CTRL AI Bot has found: Green clothing mentioned" or "CTRL AI Bot has found: Missing 2 key points; professional tone").

2. For ruleType "ai_evidence_extraction":
   - Look for the Expected Concept or any variations listed under Accepted Examples anywhere in the combined log.
   - Set "evidenceFound" to true if the core meaning is present. Otherwise, set it to false.
   - For suspect clothing: Be semantically flexible. If the candidate writes "bright green clothing", "green clothing", "green coat", "bright green", or similar green jacket/hi-vis variations, mark "evidenceFound" as true. Bright green clothing is considered semantically accurate for a green high-visibility jacket.
   - Keep the explanation starting with "CTRL AI Bot has found: " followed by a brief summary.

3. For ruleType "ai_multi_point_extraction":
   - Look for each key point anywhere in the combined log.
   - Set "keyPointsFound" to an array of booleans matching the exact order of the provided Key Points list (true if the point or its meaning is present, false otherwise).
   - Evaluate the overall narrative quality, clarity, structure, and professional tone of the candidate's logs. Recommend a "structureScoreMultiplier" between 0.0 (poor, unstructured, unreadable) and 1.0 (excellent, professional, clear).
   - Keep the explanation starting with "CTRL AI Bot has found: " followed by a brief summary.`,
});

export const evaluateCallSimulationFlow = ai.defineFlow(
  {
    name: 'evaluateCallSimulationFlow',
    inputSchema: CallSimulationEvaluationInputSchema,
    outputSchema: CallSimulationEvaluationOutputSchema,
  },
  async (input) => {
    // Combine all candidate text fields into a single block of text for the AI to analyze as one
    const combinedLog = `[Suspect Clothing]: ${input.suspectClothing}\n[Unique Information]: ${input.uniqueInformation}\n[Incident Summary]: ${input.incidentSummary}`;

    // Compile criteria description text in TypeScript to avoid template helper dependencies
    const criteriaDescription = input.criteria
      .map((c, i) => {
        let lines = `${i + 1}. Criterion Key: "${c.key}"\n   Rule Type: "${c.ruleType}"`;
        if (c.expectedConcept) {
          lines += `\n   Expected Concept: "${c.expectedConcept}"`;
        }
        if (c.acceptedExamples && c.acceptedExamples.length > 0) {
          lines += `\n   Accepted Examples: ${JSON.stringify(c.acceptedExamples)}`;
        }
        if (c.keyPoints && c.keyPoints.length > 0) {
          lines += '\n   Key Points to look for:';
          c.keyPoints.forEach((p, idx) => {
            lines += `\n     - Point [${idx}]: "${p}"`;
          });
        }
        return lines;
      })
      .join('\n\n');

    const { output } = await callSimulationPrompt({
      combinedLog,
      criteriaDescription,
    });

    return output!;
  }
);
