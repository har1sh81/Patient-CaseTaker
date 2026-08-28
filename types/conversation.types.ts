import { z } from 'zod';
import * as schemas from '../schemas/conversation.schema';

export type ClinicalSection = z.infer<typeof schemas.ClinicalSectionSchema>;
export type QuestionInputType = z.infer<typeof schemas.QuestionInputTypeSchema>;
export type QuestionOption = z.infer<typeof schemas.QuestionOptionSchema>;
export type FollowUpRule = z.infer<typeof schemas.FollowUpRuleSchema>;
export type Question = z.infer<typeof schemas.QuestionSchema>;
export type ConversationAnswer = z.infer<typeof schemas.ConversationAnswerSchema>;
export type ConversationSpeaker = z.infer<typeof schemas.ConversationSpeakerSchema>;
export type ConversationMessage = z.infer<typeof schemas.ConversationMessageSchema>;
export type ConversationState = z.infer<typeof schemas.ConversationStateSchema>;
export type ConversationEngineStatus = z.infer<typeof schemas.ConversationEngineStatusSchema>;
