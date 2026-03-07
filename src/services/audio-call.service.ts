/**
 * Audio Calls Service for Server Actions
 * Direct integration with fetch-client for managing audio calls
 */
import fetchApi from "@/lib/fetch-client";
import { IAudioCall, AudioCallFileUpload, isAudioCall, PaginatedResponse, UpdateAudioCallData, QueryParamsType } from '@/types';
import BaseServiceHelper, { ServiceConfig } from './base-service.helper';

export default class AudioCallService {
    private static readonly BASE_URL = '/audio-calls';
    private static readonly SERVICE_CONFIG: ServiceConfig = {
        serviceName: 'AudioCallService',
        searchFields: ['description', 'transcription', 'rubric'],
        defaultSort: 'createdAt:desc'
    };

    /**
     * Get audio calls with pagination and filters
     */
    static async getAudioCalls(params: QueryParamsType = {}): Promise<PaginatedResponse<IAudioCall> | null> {
        // Add populate=* by default if not specified
        const paramsWithPopulate = {
            populate: '*',
            ...params
        };

        const queryString = BaseServiceHelper.buildQueryString(paramsWithPopulate, this.SERVICE_CONFIG);
        const url = `${this.BASE_URL}?${queryString}`;

        BaseServiceHelper.logRequest(this.SERVICE_CONFIG.serviceName, url, paramsWithPopulate);
        console.log('[Audio call service] Fetching audio calls with params:', paramsWithPopulate);

        return BaseServiceHelper.handleApiRequest(
            this.SERVICE_CONFIG.serviceName,
            'fetching audio calls',
            () => fetchApi.get<PaginatedResponse<IAudioCall>>(url),
            paramsWithPopulate
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
                const response = await fetchApi.get<{ data: IAudioCall }>(`${this.BASE_URL}/${id}?populate=*`);
                return response.data;
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
                // PASO 1: Subir el archivo primero
                const uploadFormData = new FormData();
                uploadFormData.append('files', audioCallData.file);

                // Opcionalmente, agregar metadatos del archivo
                uploadFormData.append('fileInfo', JSON.stringify({
                    name: audioCallData.file.name,
                    alternativeText: audioCallData.description || '',
                }));

                console.log('[createAudioCall] Uploading file...');
                const uploadResponse = await fetchApi.post(
                    '/upload',
                    uploadFormData
                );

                console.log('[createAudioCall] uploadResponse:', uploadResponse);

                // Verificar que el archivo se subió correctamente
                if (!uploadResponse || uploadResponse.length === 0) {
                    throw new Error('File upload failed');
                }

                const uploadedFileId = uploadResponse[0].id; // o .id según tu API

                // PASO 2: Crear la entrada CON el archivo asociado
                const entryData = {
                    description: audioCallData.description || '',
                    transcription: audioCallData.transcription || undefined,
                    rubric: audioCallData.rubric || undefined,
                    file: uploadedFileId, // Asociar el archivo aquí
                };

                // Limpiar undefined
                const cleanData = Object.fromEntries(
                    Object.entries(entryData).filter(([_, value]) => value !== undefined)
                );

                console.log('[createAudioCall] Creating entry with file:', cleanData);

                const registeredAudioCall = await fetchApi.post(
                    this.BASE_URL,
                    { data: cleanData }
                );

                console.log('[createAudioCall] Entry created:', registeredAudioCall);

                return registeredAudioCall.data;
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
                const response = await fetchApi.put<{ data: IAudioCall }>(
                    `${this.BASE_URL}/${id}`,
                    { data }
                );
                return response.data;
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
                const formData = new FormData();

                // Add the new audio file
                formData.append('files.file', audioCallData.file);

                // Add the data fields - only include fields that exist in backend schema
                const data = {
                    description: audioCallData.description || '',
                    transcription: audioCallData.transcription || undefined,
                    rubric: audioCallData.rubric || undefined,
                };

                // Remove undefined fields to avoid sending them
                const cleanData = Object.fromEntries(
                    Object.entries(data).filter(([_, value]) => value !== undefined)
                );

                formData.append('data', JSON.stringify(cleanData));

                const response = await fetchApi.put<{ data: IAudioCall }>(
                    `${this.BASE_URL}/${id}`,
                    formData
                );
                return response.data;
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
                const audioCallToDelete = await this.getAudioCallById(id);
                if (!audioCallToDelete) {
                    throw new Error(`Audio call with ID ${id} not found`);
                }
                await fetchApi.delete('/upload/files/' + audioCallToDelete.file?.id);
                await fetchApi.delete(`${this.BASE_URL}/${id}`);
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