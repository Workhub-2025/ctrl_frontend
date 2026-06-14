import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TypingRun = {
    id: string;
    text: string;
    type: 'practice' | 'test';
    difficulty?: TypingDifficulty;
};

export type TypingDifficulty = 'Base' | 'Intermediate' | 'Advanced';

export type TypingConfig = {
    roundCount: number;
    timeLimitPerRound: number;
    minWpm: number;
    minAccuracy: number;
    difficulty: TypingDifficulty;
    version: string;
};

export type TypingSessionData = {
    sessionId: string | null;
    assessmentId: string | null;
    runs: TypingRun[];
    config: TypingConfig;
};

export type SubmissionStatus = 'idle' | 'submitting' | 'submitted' | 'error';

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_TYPING_CONFIG: TypingConfig = {
    roundCount: 1,
    timeLimitPerRound: 90,
    minWpm: 32,
    minAccuracy: 90,
    difficulty: 'Base',
    version: '1.0.0',
};

// ─── Store ────────────────────────────────────────────────────────────────────

interface TypingSessionState {
    /** documentId del assessment-progress creado por sessionInit */
    sessionId: string | null;
    /** documentId del assessment definition (para relacionar el resultado final) */
    assessmentId: string | null;
    /** Textos seleccionados aleatoriamente para esta sesión */
    runs: TypingRun[];
    /** Parámetros de configuración del assessment (desde Strapi) */
    config: TypingConfig;
    /** Estado del envío de resultados — permite bloquear el exit durante submission */
    submissionStatus: SubmissionStatus;

    // Acciones
    setSession: (data: TypingSessionData) => void;
    setSubmissionStatus: (status: SubmissionStatus) => void;
    clearSession: () => void;
}

export const useTypingSessionStore = create<TypingSessionState>()(
    devtools(
        (set) => ({
            sessionId: null,
            assessmentId: null,
            runs: [],
            config: DEFAULT_TYPING_CONFIG,
            submissionStatus: 'idle',

            setSession: (data) =>
                set(
                    {
                        sessionId: data.sessionId,
                        assessmentId: data.assessmentId,
                        runs: data.runs,
                        config: data.config,
                    },
                    false,
                    'typingSession/setSession'
                ),

            setSubmissionStatus: (status) =>
                set(
                    { submissionStatus: status },
                    false,
                    'typingSession/setSubmissionStatus'
                ),

            clearSession: () =>
                set(
                    {
                        sessionId: null,
                        assessmentId: null,
                        runs: [],
                        config: DEFAULT_TYPING_CONFIG,
                        submissionStatus: 'idle',
                    },
                    false,
                    'typingSession/clear'
                ),
        }),
        { name: 'TypingSessionStore' }
    )
);
