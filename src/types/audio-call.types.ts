import { z } from 'zod';

// Strapi media file type for audio files
const AudioFileSchema = z.object({
    id: z.number().optional(),
    documentId: z.string().optional(),
    name: z.string(),
    alternativeText: z.string().optional().nullable(),
    caption: z.string().optional().nullable(),
    width: z.number().optional().nullable(),
    height: z.number().optional().nullable(),
    formats: z.record(z.any()).optional().nullable(),
    hash: z.string(),
    ext: z.string(),
    mime: z.string(),
    size: z.number(),
    url: z.string(),
    previewUrl: z.string().optional().nullable(),
    provider: z.string().optional(),
    provider_metadata: z.record(z.any()).optional().nullable(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
});

// Audio Call schema based on Strapi backend schema
export const AudioCallSchema = z.object({
    // Strapi common fields
    id: z.number().optional(),
    documentId: z.string(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
    publishedAt: z.date().optional().nullable(),

    // Audio Call specific fields from schema
    title: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    transcription: z.string().optional().nullable(),
    file: AudioFileSchema.optional().nullable(),
    rubric: z.string().optional().nullable(),
});

// TypeScript interface inferred from schema
export type IAudioCall = z.infer<typeof AudioCallSchema>;

// Type for creating new audio calls
export interface CreateAudioCallData {
    title?: string;
    description?: string;
    transcription?: string;
    file?: File | string; // File object for upload or file ID/URL
    rubric?: string;
}

// Type for updating audio calls
export interface UpdateAudioCallData {
    title?: string;
    description?: string;
    transcription?: string;
    file?: File | string; // File object for upload or file ID/URL
    rubric?: string;
}

// Type for audio call file upload
export interface AudioCallFileUpload {
    file: File;
    title?: string;
    description?: string;
    transcription?: string;
    rubric?: string;
}

// Type guard to check if an object is an audio call
export const isAudioCall = (obj: any): obj is IAudioCall => {
    try {
        AudioCallSchema.parse(obj);
        return true;
    } catch {
        return false;
    }
};

// Validation helpers
export const validateAudioCall = (data: unknown): IAudioCall => {
    return AudioCallSchema.parse(data);
};

export const validateCreateAudioCallData = (data: unknown): CreateAudioCallData => {
    const createSchema = z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        transcription: z.string().optional(),
        file: z.union([z.instanceof(File), z.string()]).optional(),
        rubric: z.string().optional(),
    });

    return createSchema.parse(data);
};

export const validateUpdateAudioCallData = (data: unknown): UpdateAudioCallData => {
    const updateSchema = z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        transcription: z.string().optional(),
        file: z.union([z.instanceof(File), z.string()]).optional(),
        rubric: z.string().optional(),
    });

    return updateSchema.parse(data);
};

// Export types for convenience
export type AudioFile = z.infer<typeof AudioFileSchema>;