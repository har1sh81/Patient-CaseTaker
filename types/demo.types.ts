import { z } from 'zod';
import * as schemas from '../schemas/demo.schema';

export type DemoConversationStep = z.infer<typeof schemas.DemoConversationStepSchema>;
export type DemoDocument = z.infer<typeof schemas.DemoDocumentSchema>;
export type DemoScenario = z.infer<typeof schemas.DemoScenarioSchema>;
