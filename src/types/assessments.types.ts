import { z } from 'zod';

export const ProgresStatusSchema = z.enum(['Completed', 'In progress', 'Not started'])

export const AssessmentSchema = z.object({
    id: z.number(),
    documentId: z.string(),
    name: z.string(),
    progresStatus: ProgresStatusSchema,
    score: z.number(),
    completedAt: z.date(),
    wpm: z.number(),
    accuracy: z.number(),
    rating: z.number(),
    scenarios: z.array(z.string())
})

export type IProgresStatus = z.infer<typeof ProgresStatusSchema>
export type IAssessment = z.infer<typeof AssessmentSchema>