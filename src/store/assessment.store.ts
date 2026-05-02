import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface AssessmentState {
    activeAssessmentId: string | null;
    currentStep: number;
    totalSteps: number;
    answers: Record<string, unknown>;
    integrityEvents: string[];
    setActiveAssessment: (id: string, totalSteps: number) => void;
    recordAnswer: (questionId: string, answer: unknown) => void;
    addIntegrityEvent: (event: string) => void;
    resetAssessment: () => void;
}

export const useAssessmentStore = create<AssessmentState>()(
    devtools((set) => ({
        activeAssessmentId: null,
        currentStep: 0,
        totalSteps: 0,
        answers: {},
        integrityEvents: [],
        setActiveAssessment: (id, totalSteps) =>
            set(
                { activeAssessmentId: id, totalSteps, currentStep: 0, answers: {}, integrityEvents: [] },
                false,
                'assessment/setActive'
            ),
        recordAnswer: (questionId, answer) =>
            set(
                (state) => ({
                    answers: { ...state.answers, [questionId]: answer },
                    currentStep: state.currentStep + 1,
                }),
                false,
                'assessment/recordAnswer'
            ),
        addIntegrityEvent: (event) =>
            set(
                (state) => ({ integrityEvents: [...state.integrityEvents, event] }),
                false,
                'assessment/integrityEvent'
            ),
        resetAssessment: () =>
            set(
                {
                    activeAssessmentId: null,
                    currentStep: 0,
                    totalSteps: 0,
                    answers: {},
                    integrityEvents: [],
                },
                false,
                'assessment/reset'
            ),
    }))
);
