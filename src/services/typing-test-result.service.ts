import { fetchClient } from '@/lib/fetch-client';
import {
    TypingTestResult,
    TypingTestResultSchema,
    TypingTestSummary,
    TypingTestSummarySchema
} from '@/types/typing-test-result.types';

export class TypingTestResultService {
    private static readonly BASE_PATH = '/typing-test-results';

    static async saveResult(data: {
        testNumber: 1 | 2 | 3;
        wpm: number;
        accuracy: number;
        textUsed?: string;
    }): Promise<TypingTestResult> {
        const response = await fetchClient(this.BASE_PATH, {
            method: 'POST',
            body: JSON.stringify({ data }),
        });

        if (!response.ok) {
            throw new Error('Failed to save typing test result');
        }

        const json = await response.json();
        // Validate response with Zod schema
        return TypingTestResultSchema.parse(json.data);
    }

    static async getSummary(): Promise<TypingTestSummary> {
        const response = await fetchClient(`${this.BASE_PATH}/summary`, {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error('Failed to get typing test summary');
        }

        const json = await response.json();
        // Validate response with Zod schema
        return TypingTestSummarySchema.parse(json.data);
    }
}