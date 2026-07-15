import { callSimulationV2Renderer } from './call-simulation-v2';
import { prioritisationV2Renderer } from './prioritisation-v2';
import { shortTermMemoryV2Renderer } from './short-term-memory-v2';
import { situationalJudgementV2Renderer } from './situational-judgement-v2';
import { typingV2Renderer } from './typing-v2';

export const generatedAssessmentRenderers = [callSimulationV2Renderer, prioritisationV2Renderer, shortTermMemoryV2Renderer, situationalJudgementV2Renderer, typingV2Renderer] as const;
