import { z } from 'zod';

export const TypingTestProgressSchema = z.object({
    userId: z.number().optional(),
    testType: z.literal('typing'),
    currentIndex: z.number(),
    results: z.union([
        z.object({ wpm: z.number(), accuracy: z.number() }),
        z.null(),
    ]),
    inputValue: z.string().optional(),
    timeLeft: z.number().optional(),
    status: z.enum(['in-progress', 'completed']),
});

export const CallSimulationProgressSchema = z.object({
    userId: z.number().optional(),
    testType: z.literal('call-simulation'),
    currentCall: z.number(),
    formData: z.record(z.string()).optional(),
    status: z.enum(['in-progress', 'completed']),
});

export const SituationalJudgementProgressSchema = z.object({
    userId: z.number().optional(),
    testType: z.literal('situational-judgement'),
    currentQuestion: z.number(),
    // keys are numeric in TS type, but JSON object keys are strings — use z.record
    answers: z.record(z.string()).optional(),
    status: z.enum(['in-progress', 'completed']),
});

export const AssessmentProgressSchema = z.union([
    TypingTestProgressSchema,
    CallSimulationProgressSchema,
    SituationalJudgementProgressSchema,
]);

export type TypingTestProgress = z.infer<typeof TypingTestProgressSchema>;
export type CallSimulationProgress = z.infer<typeof CallSimulationProgressSchema>;
export type SituationalJudgementProgress = z.infer<typeof SituationalJudgementProgressSchema>;
export type AssessmentProgress = z.infer<typeof AssessmentProgressSchema>;

export default AssessmentProgressSchema;