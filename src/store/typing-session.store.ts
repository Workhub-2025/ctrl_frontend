import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
    TYPING_ACCURACY_THRESHOLD,
    TYPING_ROUND_COUNT,
    TYPING_TIME_LIMIT_PER_ROUND_SECONDS,
    TYPING_WPM_THRESHOLD,
} from '@/lib/assessment-catalog-defaults';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TypingRun = {
    id: string;
    text: string;
    type: 'practice' | 'test';
    difficulty?: TypingDifficulty;
};

export type TypingDifficulty = 'Base' | 'Intermediate' | 'Extreme';

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
    alreadyCompleted?: boolean;
    completedAt?: string | null;
    score?: number | null;
};

export type SubmissionStatus = 'idle' | 'submitting' | 'submitted' | 'error';

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_TYPING_CONFIG: TypingConfig = {
    roundCount: TYPING_ROUND_COUNT,
    timeLimitPerRound: TYPING_TIME_LIMIT_PER_ROUND_SECONDS,
    minWpm: TYPING_WPM_THRESHOLD,
    minAccuracy: TYPING_ACCURACY_THRESHOLD,
    difficulty: 'Base',
    version: '1.0.0',
};

// ─── Store ────────────────────────────────────────────────────────────────────

interface TypingSessionState {
    /** Attempt document id returned by session init (legacy typing store field name). */
    sessionId: string | null;
    /** documentId del assessment definition (para relacionar el resultado final) */
    assessmentId: string | null;
    /** Textos seleccionados aleatoriamente para esta sesión */
    runs: TypingRun[];
    /** Parámetros de configuración del assessment (desde Strapi) */
    config: TypingConfig;
    alreadyCompleted: boolean;
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
            alreadyCompleted: false,
            submissionStatus: 'idle',

            setSession: (data) =>
                set(
                    {
                        sessionId: data.sessionId,
                        assessmentId: data.assessmentId,
                        runs: data.runs,
                        config: data.config,
                        alreadyCompleted: data.alreadyCompleted === true,
                        submissionStatus: data.alreadyCompleted ? 'submitted' : 'idle',
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
                        alreadyCompleted: false,
                        submissionStatus: 'idle',
                    },
                    false,
                    'typingSession/clear'
                ),
        }),
        { name: 'TypingSessionStore' }
    )
);
