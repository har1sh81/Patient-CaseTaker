import {
  PatientSchema,
  ConsentSchema,
  IntakeSessionSchema,
  AdaptiveQuestionResponseSchema,
  createApiResponseSchema,
} from '../schemas';
import { z } from 'zod';

describe('MediKiosk Contract Validation Suite', () => {
  it('should validate a valid patient record successfully', () => {
    const validPatient = {
      id: 'pat_01',
      identification: {
        hospitalNumber: 'HSP-100245',
        abhaReference: 'ABHA-DEMO-001',
      },
      demographics: {
        firstName: 'Jane',
        fullName: 'Jane Doe',
        age: 36,
        gender: 'female',
      },
      createdAt: '2026-08-26T10:30:00Z',
    };

    const result = PatientSchema.safeParse(validPatient);
    if (!result.success) {
      throw new Error(`Patient validation failed: ${result.error.message}`);
    }
  });

  it('should reject an invalid patient record (missing required fields)', () => {
    const invalidPatient = {
      id: 'pat_01',
      demographics: {
        // Missing firstName and fullName
        lastName: 'Doe',
      },
      createdAt: '2026-08-26T10:30:00Z',
    };

    const result = PatientSchema.safeParse(invalidPatient);
    if (result.success) {
      throw new Error('Invalid patient record was incorrectly marked valid');
    }
  });

  it('should validate a valid consent record successfully', () => {
    const validConsent = {
      id: 'con_01',
      patientId: 'pat_01',
      sessionId: 'ses_01',
      consentVersion: 'v1.0',
      permissions: {
        intakeCollection: true,
        voiceProcessing: true,
        documentProcessing: true,
        aiAssistedStructuring: true,
        reportGeneration: true,
      },
      accepted: true,
      acceptedAt: '2026-08-26T10:31:00Z',
      language: 'en',
      source: 'touchscreen',
    };

    const result = ConsentSchema.safeParse(validConsent);
    if (!result.success) {
      throw new Error(`Consent validation failed: ${result.error.message}`);
    }
  });

  it('should validate a valid intake session record successfully', () => {
    const validSession = {
      id: 'ses_01',
      patientId: 'pat_01',
      status: 'active',
      language: 'en',
      departmentMode: 'standard',
      consentId: 'con_01',
      startedAt: '2026-08-26T10:30:00Z',
      currentStep: 'intake_questions',
      progress: {
        completedSections: ['consent'],
        pendingSections: ['chief_complaint', 'hpi'],
        percentage: 10,
      },
      cleanupStatus: {
        temporaryDataDeleted: false,
      },
    };

    const result = IntakeSessionSchema.safeParse(validSession);
    if (!result.success) {
      throw new Error(`Session validation failed: ${result.error.message}`);
    }
  });

  it('should validate a valid AI adaptive response successfully', () => {
    const validAiResponse = {
      extractedFacts: [
        {
          field: 'chiefComplaint',
          value: 'Headache',
          confidence: 'high',
        },
        {
          field: 'duration',
          value: '2 days',
          confidence: 'medium',
        },
      ],
      missingInformation: [
        {
          field: 'severity',
          importance: 'required',
        },
      ],
      nextAction: 'ask_question',
      nextQuestion: {
        id: 'hpi_severity',
        section: 'hpi',
        question: 'How severe is the headache?',
        purpose: 'Establish severity',
        inputType: 'scale',
      },
      confidence: 'high',
    };

    const result = AdaptiveQuestionResponseSchema.safeParse(validAiResponse);
    if (!result.success) {
      throw new Error(`AI response validation failed: ${result.error.message}`);
    }
  });

  it('should validate standard API response wrapper successfully', () => {
    const ApiResponseSchema = createApiResponseSchema(z.object({ token: z.string() }));
    const validResponse = {
      success: true,
      data: {
        token: 'auth-xyz-123',
      },
      meta: {
        timestamp: '2026-08-26T10:30:00Z',
      },
    };

    const result = ApiResponseSchema.safeParse(validResponse);
    if (!result.success) {
      throw new Error(`API validation failed: ${result.error.message}`);
    }
  });
});
