import { z } from 'zod';

export const TypingTextSchema = z.object({
    //id: z.union([z.number(), z.string()]).optional(),
    documentId: z.string().optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
    title: z.string().optional(),
    assessmentVersion: z.string().optional(),
    isActive: z.boolean().optional(),
    type: z.enum(["practice", "test"]).optional(),
    difficulty: z.enum(["Base", "Intermediate", "Advanced"]).optional(),
    text: z.string().optional()
})

export type ITypingText = z.infer<typeof TypingTextSchema>
