/**
 * Typing Test Result Types with Zod Validation
 * 
 * This module uses Zod schemas for runtime validation and type inference.
 * 
 * Benefits:
 * - Runtime validation of API responses
 * - Automatic TypeScript type inference
 * - Built-in error messages for invalid data
 * - Type-safe parsing with .parse() or .safeParse()
 * 
 * @example
 * // Validate and parse data
 * const result = TypingTestResultSchema.parse(apiResponse);
 * 
 * // Safe parsing without throwing
 * const parsed = TypingTestResultSchema.safeParse(apiResponse);
 * if (parsed.success) {
 *   console.log(parsed.data);
 * } else {
 *   console.error(parsed.error);
 * }
 */

import { z } from 'zod';

// Schema for TypingTestResult
export const TypingTestResultSchema = z.object({
    id: z.number().int().positive(),
    testNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    wpm: z.number().min(0),
    accuracy: z.number().min(0).max(100),
    textUsed: z.string().optional(),
    completedAt: z.string().datetime(),
});

// Inferred TypeScript type
export type TypingTestResult = z.infer<typeof TypingTestResultSchema>;

// Schema for TypingTestSummary
export const TypingTestSummarySchema = z.object({
    results: z.array(TypingTestResultSchema),
    summary: z.object({
        averageWpm: z.number().min(0),
        averageAccuracy: z.number().min(0).max(100),
        testsCompleted: z.number().int().min(0).max(3),
        test1: TypingTestResultSchema.nullable(),
        test2: TypingTestResultSchema.nullable(),
        test3: TypingTestResultSchema.nullable(),
    }),
});

// Inferred TypeScript type
export type TypingTestSummary = z.infer<typeof TypingTestSummarySchema>;
