'use server';

import { z } from 'zod';
import { TypingTestResultService } from '@/services/typing-test-result.service';
import TextsService from '@/services/texts.service';
import {
    TypingTestResult,
    TypingTestSummary
} from '@/types/typing-test-result.types';
import { ITypingText } from '@/types';

/**
 * Server Actions for Typing Test Results
 * 
 * These actions run on the server and can be called directly from client components.
 * They provide type-safe communication between client and server with Zod validation.
 */

// Type aliases
type TestNumber = 1 | 2 | 3;

// Input validation schema for saving a result
const SaveResultInputSchema = z.object({
    testNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    wpm: z.number().min(0).max(1000),
    accuracy: z.number().min(0).max(100),
    textUsed: z.string().optional(),
});

type SaveResultInput = z.infer<typeof SaveResultInputSchema>;

// Action result types
type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

/**
 * Save a typing test result
 * 
 * @param input - Test result data
 * @returns Action result with the saved test result or error
 * 
 * @example
 * const result = await saveTypingTestResult({
 *   testNumber: 1,
 *   wpm: 45,
 *   accuracy: 95.5,
 *   textUsed: 'Sample text...'
 * });
 * 
 * if (result.success) {
 *   console.log('Saved:', result.data);
 * } else {
 *   console.error('Error:', result.error);
 * }
 */
export async function saveTypingTestResult(
    input: SaveResultInput
): Promise<ActionResult<TypingTestResult>> {
    try {
        // Validate input
        const validatedInput = SaveResultInputSchema.parse(input);

        // Call service
        const result = await TypingTestResultService.saveResult(validatedInput);

        return {
            success: true,
            data: result,
        };
    } catch (error) {
        console.error('Error saving typing test result:', error);

        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
            };
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save typing test result',
        };
    }
}

/**
 * Get typing test summary for the current user
 * 
 * @returns Action result with the test summary or error
 * 
 * @example
 * const result = await getTypingTestSummary();
 * 
 * if (result.success) {
 *   console.log('Tests completed:', result.data.summary.testsCompleted);
 *   console.log('Average WPM:', result.data.summary.averageWpm);
 * } else {
 *   console.error('Error:', result.error);
 * }
 */
export async function getTypingTestSummary(): Promise<ActionResult<TypingTestSummary>> {
    try {
        // Call service
        const summary = await TypingTestResultService.getSummary();

        return {
            success: true,
            data: summary,
        };
    } catch (error) {
        console.error('Error getting typing test summary:', error);

        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
            };
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get typing test summary',
        };
    }
}

/**
 * Check if a specific test number has been completed
 * 
 * @param testNumber - The test number to check (1, 2, or 3)
 * @returns Action result with boolean indicating completion status
 * 
 * @example
 * const result = await isTestCompleted(1);
 * 
 * if (result.success && result.data) {
 *   console.log('Test 1 is completed');
 * }
 */
export async function isTestCompleted(
    testNumber: TestNumber
): Promise<ActionResult<boolean>> {
    try {
        const summary = await TypingTestResultService.getSummary();

        let isCompleted: boolean;
        switch (testNumber) {
            case 1:
                isCompleted = summary.summary.test1 !== null;
                break;
            case 2:
                isCompleted = summary.summary.test2 !== null;
                break;
            case 3:
                isCompleted = summary.summary.test3 !== null;
                break;
        }

        return {
            success: true,
            data: isCompleted,
        };
    } catch (error) {
        console.error('Error checking test completion:', error);

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to check test completion',
        };
    }
}

/**
 * Get the next available test number for the user
 * 
 * @returns Action result with the next test number (1-3) or null if all completed
 * 
 * @example
 * const result = await getNextTestNumber();
 * 
 * if (result.success && result.data !== null) {
 *   console.log('Next test to take:', result.data);
 * } else if (result.success && result.data === null) {
 *   console.log('All tests completed!');
 * }
 */
export async function getNextTestNumber(): Promise<ActionResult<TestNumber | null>> {
    try {
        const summary = await TypingTestResultService.getSummary();

        if (summary.summary.test1 === null) return { success: true, data: 1 };
        if (summary.summary.test2 === null) return { success: true, data: 2 };
        if (summary.summary.test3 === null) return { success: true, data: 3 };

        return { success: true, data: null }; // All tests completed
    } catch (error) {
        console.error('Error getting next test number:', error);

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get next test number',
        };
    }
}

/**
 * Get a random practice text
 * 
 * @returns Action result with a random practice text or error
 * 
 * @example
 * const result = await getRandomPracticeText();
 * 
 * if (result.success) {
 *   console.log('Text:', result.data.text);
 * } else {
 *   console.error('Error:', result.error);
 * }
 */
export async function getRandomPracticeText(): Promise<ActionResult<ITypingText>> {
    try {
        // Get all practice texts
        const response = await TextsService.getTextsByType('practice', {
            pageSize: 100, // Get a reasonable number to choose from
        });

        if (!response?.data?.length) {
            return {
                success: false,
                error: 'No practice texts available',
            };
        }

        // Select a random text
        const randomIndex = Math.floor(Math.random() * response.data.length);
        const selectedText = response.data[randomIndex];

        return {
            success: true,
            data: selectedText,
        };
    } catch (error) {
        console.error('Error getting random practice text:', error);

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get practice text',
        };
    }
}

/**
 * Get text for a specific test number
 * 
 * @param testNumber - The test number (1, 2, or 3)
 * @returns Action result with the test text or error
 * 
 * @example
 * const result = await getTestText(1);
 * 
 * if (result.success) {
 *   console.log('Test 1 text:', result.data.text);
 * } else {
 *   console.error('Error:', result.error);
 * }
 */
export async function getTestText(
    testNumber: TestNumber
): Promise<ActionResult<ITypingText>> {
    try {
        // Validate input
        if (![1, 2, 3].includes(testNumber)) {
            return {
                success: false,
                error: 'Invalid test number. Must be 1, 2, or 3',
            };
        }

        // Get test texts sorted by creation date (to ensure consistent ordering)
        const response = await TextsService.getTextsByType('test', {
            pageSize: 3,
            sort: 'createdAt:asc',
        });

        if (!response?.data || response.data.length < testNumber) {
            return {
                success: false,
                error: `Test ${testNumber} text not available`,
            };
        }

        // Get the text by index (testNumber - 1)
        const selectedText = response.data[testNumber - 1];

        if (!selectedText) {
            return {
                success: false,
                error: `Test ${testNumber} text not found`,
            };
        }

        return {
            success: true,
            data: selectedText,
        };
    } catch (error) {
        console.error(`Error getting test ${testNumber} text:`, error);

        return {
            success: false,
            error: error instanceof Error ? error.message : `Failed to get test ${testNumber} text`,
        };
    }
}

/**
 * Get text based on test type and number
 * 
 * @param type - 'practice' for practice text, 'test' for test text
 * @param testNumber - Required only for 'test' type (1, 2, or 3)
 * @returns Action result with the appropriate text or error
 * 
 * @example
 * // Get practice text
 * const practiceResult = await getTypingText('practice');
 * 
 * // Get test text
 * const testResult = await getTypingText('test', 1);
 * 
 * if (testResult.success) {
 *   console.log('Text:', testResult.data.text);
 * }
 */
export async function getTypingText(
    type: 'practice' | 'test',
    testNumber?: TestNumber
): Promise<ActionResult<ITypingText>> {
    try {
        if (type === 'practice') {
            return await getRandomPracticeText();
        }

        if (type === 'test') {
            if (!testNumber || ![1, 2, 3].includes(testNumber)) {
                return {
                    success: false,
                    error: 'Test number is required for test type and must be 1, 2, or 3',
                };
            }
            return await getTestText(testNumber);
        }

        return {
            success: false,
            error: 'Invalid type. Must be "practice" or "test"',
        };
    } catch (error) {
        console.error('Error getting typing text:', error);

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get typing text',
        };
    }
}
