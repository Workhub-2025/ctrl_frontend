'use server';
/**
 * @fileOverview Implements adaptive testing functionality using an LLM to analyze textual responses
 * and adjust the difficulty of the situational judgment test based on the candidate's performance.
 *
 * - analyzeTextResponse - A function that analyzes a candidate's textual response and determines the appropriate difficulty level for the next question.
 * - AnalyzeTextResponseInput - The input type for the analyzeTextResponse function.
 * - AnalyzeTextResponseOutput - The return type for the analyzeTextResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeTextResponseInputSchema = z.object({
  response: z
    .string()
    .describe('The textual response provided by the candidate.'),
  currentDifficulty: z
    .string()
    .describe('The current difficulty level of the test (e.g., easy, medium, hard).'),
  question: z
    .string()
    .describe('The question to which the candidate responded.'),
  rubric: z.string().describe('The grading rubric for the given question')
});
export type AnalyzeTextResponseInput = z.infer<typeof AnalyzeTextResponseInputSchema>;

const AnalyzeTextResponseOutputSchema = z.object({
  newDifficulty: z
    .string()
    .describe(
      'The recommended difficulty level for the next question (easy, medium, or hard).'
    ),
  explanation: z
    .string()
    .describe('Explanation of why this difficulty was chosen')
});
export type AnalyzeTextResponseOutput = z.infer<typeof AnalyzeTextResponseOutputSchema>;

export async function analyzeTextResponse(input: AnalyzeTextResponseInput): Promise<AnalyzeTextResponseOutput> {
  return analyzeTextResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeTextResponsePrompt',
  input: {schema: AnalyzeTextResponseInputSchema},
  output: {schema: AnalyzeTextResponseOutputSchema},
  prompt: `You are an expert assessment evaluator. Your task is to analyze a candidate's response to a situational judgment test question and recommend an appropriate difficulty level for the next question.

Here is the candidate's response to the question: """{{{question}}}"""

Candidate Response: """{{{response}}}"""

Grading Rubric: """{{{rubric}}}"""

The current difficulty level is: {{{currentDifficulty}}}.

Based on the quality of the response, reasoning and the current difficulty, recommend a new difficulty level for the next question. The difficulty can be easy, medium, or hard. Also explain your decision.

Difficulty recommendation:`, // Ensure LLM outputs the new difficulty
});

const analyzeTextResponseFlow = ai.defineFlow(
  {
    name: 'analyzeTextResponseFlow',
    inputSchema: AnalyzeTextResponseInputSchema,
    outputSchema: AnalyzeTextResponseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
