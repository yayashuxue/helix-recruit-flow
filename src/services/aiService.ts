
import { Message } from '@/types/chat';
import { SequenceStep } from '@/types/sequence';
import { FEATURES } from '@/config/appConfig';
import * as openaiService from './openai';
import * as anthropicService from './anthropic';

// Use the appropriate AI service based on configuration
export const generateCompletion = (messages: Message[]): Promise<string> => {
  return FEATURES.USE_ANTHROPIC 
    ? anthropicService.generateCompletion(messages)
    : openaiService.generateCompletion(messages);
};

export const generateSequence = (position: string, details: string): Promise<SequenceStep[]> => {
  return FEATURES.USE_ANTHROPIC
    ? anthropicService.generateSequence(position, details)
    : openaiService.generateSequence(position, details);
};
