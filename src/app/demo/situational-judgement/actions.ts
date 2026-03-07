'use server';

import { analyzeTextResponse } from '@/ai/flows/adaptive-testing';
import { z } from 'zod';

const FormSchema = z.object({
    response: z.string(),
    question: z.string(),
    rubric: z.string(),
});

export async function analyzeResponseAction(prevState: any, formData: FormData) {
    const validatedFields = FormSchema.safeParse({
        response: formData.get('response'),
        question: formData.get('question'),
        rubric: formData.get('rubric'),
    });

    if (!validatedFields.success) {
        return {
            message: "Invalid form data"
        }
    }

    try {
        const result = await analyzeTextResponse({
            response: validatedFields.data.response,
            question: validatedFields.data.question,
            rubric: validatedFields.data.rubric,
            currentDifficulty: "medium", // Assume medium for prototype
        });
        
        return result;

    } catch (error) {
        console.error("Error analyzing response: ", error);
        return {
            message: "Failed to get AI analysis."
        }
    }
}
