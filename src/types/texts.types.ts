import { z } from 'zod';

export const TypingTextSchema = z.object({
    //id: z.union([z.number(), z.string()]).optional(),
    documentId: z.string().optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
    type: z.enum(["practice", "test"]).optional(),
    text: z.string().optional()
})

export type ITypingText = z.infer<typeof TypingTextSchema>
