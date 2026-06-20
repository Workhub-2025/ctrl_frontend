/**
 * Audio Calls Service for Server Actions
 * @deprecated The legacy `a-audio-calls` collection is no longer present.
 * Assessment audio/call simulation content now comes from the active
 * assessment-content-bank/platform sync flow.
 * Uses @strapi/client for all Strapi CMS interactions.
 */
import { getServerStrapiClient } from '@/lib/strapi';
import { IAudioCall, AudioCallFileUpload, isAudioCall, PaginatedResponse, UpdateAudioCallData, QueryParamsType } from '@/types';
import BaseServiceHelper, { ServiceConfig } from './base-service.helper';

export default class AudioCallService {
    private static readonly COLLECTION = 'a-audio-calls';
    private static readonly SERVICE_CONFIG: ServiceConfig = {
        serviceName: 'AudioCallService',
        searchFields: ['title', 'description', 'transcription', 'rubric', 'scenarioKey'],
        defaultSort: 'createdAt:desc'
    };

    /**
     * Get audio calls with pagination and filters
     */
    static async getAudioCalls(params: QueryParamsType = {}): Promise<PaginatedResponse<IAudioCall> | null> {
        const paramsWithPopulate = { populate: '*', ...params };

        return BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'fetching audio calls',
            async () => {
                const client = await getServerStrapiClient();
                const queryParams = BaseServiceHelper.toStrapiQueryParams(paramsWithPopulate, this.SERVICE_CONFIG);
                return client.collection(this.COLLECTION).find(queryParams) as unknown as Promise<PaginatedResponse<IAudioCall>>;
            }
        );
    }

    /**
     * Get audio call by ID
     */
    static async getAudioCallById(id: string | number): Promise<IAudioCall | null> {
        return BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'fetching audio call by ID',
            async () => {
                const client = await getServerStrapiClient();
                return client.collection(this.COLLECTION).findOne(String(id), { populate: '*' }) as unknown as Promise<IAudioCall>;
            }
        );
    }

    /**
     * Create new audio call with file upload
     */
    static async createAudioCall(audioCallData: AudioCallFileUpload): Promise<IAudioCall | null> {
        return BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'creating audio call',
            async () => {
                const client = await getServerStrapiClient();

                // PASO 1: Subir el archivo via files API
                const uploadedFiles = await client.files.upload(audioCallData.file, {
                    fileInfo: {
                        name: audioCallData.file.name,
                        alternativeText: audioCallData.description ?? '',
                    },
                });

                if (!uploadedFiles?.length) {
                     throw new Error('File upload failed');
                }

                const uploadedFileId = uploadedFiles[0].id;

                // PASO 2: Crear la entrada con el archivo asociado
                const entryData = Object.fromEntries(
                    Object.entries({
                        title: audioCallData.title,
                        assessmentVersion: audioCallData.assessmentVersion ?? '1.0.0',
                        difficulty: audioCallData.difficulty ?? 'Base',
                        isActive: audioCallData.isActive ?? true,
                        type: audioCallData.type ?? 'final',
                        description: audioCallData.description ?? '',
                        transcription: audioCallData.transcription,
                        rubric: audioCallData.rubric,
                        scenarioKey: audioCallData.scenarioKey,
                        audioUrl: audioCallData.audioUrl,
                        criteria: audioCallData.criteria,
                        file: uploadedFileId,
                    }).filter(([, v]) => v !== undefined)
                );

                return client.collection(this.COLLECTION).create(entryData) as unknown as Promise<IAudioCall>;
            }
        );
    }


    /**
     * Update audio call by ID (metadata only)
     */
    static async updateAudioCall(id: string | number, data: UpdateAudioCallData): Promise<IAudioCall | null> {
        return BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'updating audio call',
            async () => {
                const client = await getServerStrapiClient();
                return client.collection(this.COLLECTION).update(String(id), data as Record<string, unknown>) as unknown as Promise<IAudioCall>;
            }
        );
    }

    /**
     * Update audio call file and metadata
     */
    static async updateAudioCallWithFile(id: string | number, audioCallData: AudioCallFileUpload): Promise<IAudioCall | null> {
        return BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'updating audio call with file',
            async () => {
                const client = await getServerStrapiClient();

                // Upload new file
                const uploadedFiles = await client.files.upload(audioCallData.file, {
                    fileInfo: {
                        name: audioCallData.file.name,
                        alternativeText: audioCallData.description ?? '',
                    },
                });

                if (!uploadedFiles?.length) {
                    throw new Error('File upload failed');
                }

                const updateData = Object.fromEntries(
                    Object.entries({
                        title: audioCallData.title,
                        assessmentVersion: audioCallData.assessmentVersion,
                        difficulty: audioCallData.difficulty,
                        isActive: audioCallData.isActive,
                        type: audioCallData.type,
                        description: audioCallData.description ?? '',
                        transcription: audioCallData.transcription,
                        rubric: audioCallData.rubric,
                        scenarioKey: audioCallData.scenarioKey,
                        audioUrl: audioCallData.audioUrl,
                        criteria: audioCallData.criteria,
                        file: uploadedFiles[0].id,
                    }).filter(([, v]) => v !== undefined)
                );

                return client.collection(this.COLLECTION).update(String(id), updateData) as unknown as Promise<IAudioCall>;
            }
        );
    }

    /**
     * Delete audio call by ID
     */
    static async deleteAudioCall(id: string | number): Promise<boolean> {
        const result = await BaseServiceHelper.executeSafely(
            this.SERVICE_CONFIG.serviceName,
            'deleting audio call',
            async () => {
                const client = await getServerStrapiClient();
                const audioCallToDelete = await this.getAudioCallById(id);
                if (!audioCallToDelete) {
                    throw new Error(`Audio call with ID ${id} not found`);
                }
                // Delete associated file from media library
                if (audioCallToDelete.file?.id) {
                    await client.files.delete(audioCallToDelete.file.id);
                }
                await client.collection(this.COLLECTION).delete(String(id));
                return true;
            }
        );
        return result ?? false;
    }

    /**
     * Search audio calls with advanced filters
     */
    static async searchAudioCalls(searchTerm: string, filters: Partial<QueryParamsType> = {}): Promise<PaginatedResponse<IAudioCall> | null> {
        const searchFilters = BaseServiceHelper.buildSearchFilters(searchTerm, this.SERVICE_CONFIG.searchFields || []);
        return this.getAudioCalls({
            ...filters,
            filters: { ...filters.filters, ...searchFilters }
        });
    }

    /**
     * Get audio calls with transcriptions
     */
    static async getAudioCallsWithTranscriptions(params: Omit<QueryParamsType, 'filters'> = {}): Promise<PaginatedResponse<IAudioCall> | null> {
        const filters = {
            $and: [
                { transcription: { $ne: null } },
                { transcription: { $ne: '' } }
            ]
        };
        return this.getAudioCalls({ ...params, filters: { ...filters } });
    }

    /**
     * Get audio calls without transcriptions
     */
    static async getAudioCallsWithoutTranscriptions(params: Omit<QueryParamsType, 'filters'> = {}): Promise<PaginatedResponse<IAudioCall> | null> {
        const filters = {
            $or: [
                { transcription: { $null: true } },
                { transcription: { $eq: '' } }
            ]
        };
        return this.getAudioCalls({ ...params, filters: { ...filters } });
    }

    /**
     * Get audio calls with rubrics
     */
    static async getAudioCallsWithRubrics(params: Omit<QueryParamsType, 'filters'> = {}): Promise<PaginatedResponse<IAudioCall> | null> {
        const filters = {
            $and: [
                { rubric: { $ne: null } },
                { rubric: { $ne: '' } }
            ]
        };
        return this.getAudioCalls({ ...params, filters: { ...filters } });
    }

    /**
     * Validate audio call data
     */
    static validateAudioCallData(audioCall: IAudioCall): boolean {
        try {
            return isAudioCall(audioCall) && !!(audioCall.file || audioCall.description);
        } catch (error) {
            console.error('[AudioCallService] Error validating audio call data:', error);
            return false;
        }
    }

    /**
     * Update transcription for existing audio call
     */
    static async updateTranscription(id: string | number, transcription: string): Promise<IAudioCall | null> {
        return this.updateAudioCall(id, { transcription });
    }

    /**
     * Update rubric for existing audio call
     */
    static async updateRubric(id: string | number, rubric: string): Promise<IAudioCall | null> {
        return this.updateAudioCall(id, { rubric });
    }

    /**
     * Get audio file URL from audio call
     */
    static getAudioFileUrl(audioCall: IAudioCall): string | null {
        if (!audioCall.file) return null;

        // If the URL is already absolute, return it
        if (audioCall.file.url.startsWith('http')) {
            return audioCall.file.url;
        }

        // Otherwise, construct the full URL with Strapi base URL
        const strapiBaseUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL?.replace('/api', '') || 'http://localhost:1337';
        return `${strapiBaseUrl}${audioCall.file.url}`;
    }

    /**
     * Check if audio call has valid audio file
     */
    static hasValidAudioFile(audioCall: IAudioCall): boolean {
        return !!(audioCall?.file?.url && audioCall.file.mime?.startsWith('audio/'));
    }
}
