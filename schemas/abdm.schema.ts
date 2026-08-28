import { z } from 'zod';
import { ISODateStringSchema } from './common.schema';

// Represents raw records returned by an ABDM provider before normalization
export const RawHealthRecordPayloadSchema = z.object({
  patientAbha: z.string(),
  recordsFetched: z.number(),
  lastUpdated: ISODateStringSchema,
  
  // A raw representation of conditions from the provider
  conditions: z.array(z.object({
    id: z.string(),
    code: z.string().optional(),
    display: z.string(),
    clinicalStatus: z.string(),
    dateRecorded: z.string().optional(),
    sourceFacility: z.string().optional(),
  })).optional(),

  // A raw representation of medications
  medications: z.array(z.object({
    id: z.string(),
    drugName: z.string(),
    status: z.string(),
    dosageInstruction: z.string().optional(),
    prescribedDate: z.string().optional(),
  })).optional(),

  // A raw representation of past procedures/surgeries
  procedures: z.array(z.object({
    id: z.string(),
    procedureName: z.string(),
    date: z.string().optional(),
    performer: z.string().optional(),
  })).optional(),
});
