import { z } from 'zod'

// Base schema for common fields
const BaseQuestionSchema = z.object({
    documentId: z.string().optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
    title: z.string().optional(),
    type: z.enum(['mcp', 'text']),
    question: z.string(),
})

// Schema for Multiple Choice (MCP) questions
const MCPQuestionSchema = BaseQuestionSchema.extend({
    type: z.literal('mcp'),
    rightAnswer: z.string(),
    wrongAnswer1: z.string().optional(),
    wrongAnswer2: z.string().optional(),
    wrongAnswer3: z.string().optional(),
    rubric: z.undefined().optional(), // Not used for MCP questions
})

// Schema for Text questions
const TextQuestionSchema = BaseQuestionSchema.extend({
    type: z.literal('text'),
    rubric: z.string().optional(),
})

// Union schema that validates based on the question type
export const QuestionSchema = z.discriminatedUnion('type', [
    MCPQuestionSchema,
    TextQuestionSchema,
])

export type IQuestion = z.infer<typeof QuestionSchema>

// Type guards for better type checking
export const isMCPQuestion = (question: IQuestion): question is z.infer<typeof MCPQuestionSchema> => {
    return question.type === 'mcp'
}

export const isTextQuestion = (question: IQuestion): question is z.infer<typeof TextQuestionSchema> => {
    return question.type === 'text'
}
