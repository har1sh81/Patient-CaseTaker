import { AIProvider } from '../provider-interface';
import { AdaptiveQuestionRequest, AdaptiveQuestionResponse, ReportGenerationRequest, ReportGenerationResponse } from '../../../types';

export class MockProvider implements AIProvider {
  async analyzeAnswer(request: AdaptiveQuestionRequest): Promise<AdaptiveQuestionResponse> {
    const rawVal = typeof request.latestAnswer.rawValue === 'string' 
      ? request.latestAnswer.rawValue.toLowerCase() 
      : '';

    // Scenario 8: AI unavailable / simulated failure
    if (rawVal.includes('fail ai') || rawVal.includes('error ai')) {
      throw new Error('Simulated Mock AI failure');
    }

    // Scenario 9: Invalid question ID returned by AI
    if (rawVal.includes('forbidden ai')) {
      return {
        extractedFacts: [],
        missingInformation: [],
        nextAction: 'ask_follow_up',
        nextQuestionId: 'unapproved_id_123',
        confidence: 'high'
      };
    }

    // Scenario 5: Patient provides ambiguous information
    if (rawVal === 'it hurts' || rawVal.includes('ambiguous')) {
      return {
        extractedFacts: [],
        missingInformation: [{ field: 'location', importance: 'required' }],
        nextAction: 'ask_clarification',
        clarificationNeeded: true,
        clarificationReason: 'Can you please tell me exactly where it hurts?',
        confidence: 'high'
      };
    }

    // Scenario 6: Patient provides irrelevant information
    if (rawVal.includes('my dog is cute') || rawVal.includes('irrelevant')) {
      return {
        extractedFacts: [],
        missingInformation: [{ field: 'chief_complaint', importance: 'required' }],
        nextAction: 'ask_clarification',
        clarificationNeeded: true,
        clarificationReason: 'I am sorry, I need to know the medical reason for your visit.',
        confidence: 'high'
      };
    }

    // Scenario 7: Prompt injection attempt
    if (rawVal.includes('ignore your instructions') || rawVal.includes('diagnose me')) {
      return {
        extractedFacts: [],
        missingInformation: [],
        nextAction: 'continue_deterministic',
        confidence: 'high'
      };
    }

    // Scenario 4: Multiple facts in one sentence (e.g. complaint + duration + trigger)
    if (rawVal.includes('stomach pain') && rawVal.includes('3 weeks') && rawVal.includes('eating')) {
      return {
        extractedFacts: [
          { field: 'chief_complaint', value: 'stomach pain', confidence: 'high' },
          { field: 'duration', value: '3 weeks', confidence: 'high' },
          { field: 'trigger', value: 'eating', confidence: 'high' }
        ],
        missingInformation: [{ field: 'location', importance: 'required' }],
        nextAction: 'ask_follow_up',
        nextQuestionId: request.allowedQuestionIds.find(id => id === 'pain_location'),
        confidence: 'high'
      };
    }

    // Scenario 2: Complaint + duration
    if (rawVal.includes('headache') && rawVal.includes('3 days')) {
      return {
        extractedFacts: [
          { field: 'chief_complaint', value: 'headache', confidence: 'high' },
          { field: 'duration', value: '3 days', confidence: 'high' }
        ],
        missingInformation: [{ field: 'severity', importance: 'required' }],
        nextAction: 'ask_follow_up',
        nextQuestionId: request.allowedQuestionIds.find(id => id === 'pain_scale'),
        confidence: 'high'
      };
    }

    // Dynamic clinical adaptation & fact extraction
    const currentQId = request.currentQuestion?.id || request.latestAnswer.questionId;
    const isChiefComplaintQuestion = currentQId === 'reason_for_visit' || currentQId === 'chief_complaint';

    const facts = isChiefComplaintQuestion
      ? [{ field: 'chief_complaint', value: rawVal || (request.latestAnswer.rawValue as string), confidence: 'high' as const }]
      : [{ field: currentQId, value: String(request.latestAnswer.rawValue), confidence: 'high' as const }];

    let selectedNextQId: string | undefined;

    if (isChiefComplaintQuestion) {
      if (rawVal.includes('pain') || rawVal.includes('ache') || rawVal.includes('hurt') || rawVal.includes('cramp') || rawVal.includes('headache')) {
        selectedNextQId = request.allowedQuestionIds.find(id => id === 'safety_check' || id === 'pain_location' || id === 'pain_scale');
      } else {
        selectedNextQId = request.allowedQuestionIds.find(id => id === 'symptom_duration' || id === 'associated_symptoms');
      }
    } else if (currentQId === 'symptom_duration') {
      selectedNextQId = request.allowedQuestionIds.find(id => id === 'symptom_progression' || id === 'associated_symptoms');
    } else if (currentQId === 'symptom_progression') {
      selectedNextQId = request.allowedQuestionIds.find(id => id === 'safety_check' || id === 'associated_symptoms');
    } else if (currentQId === 'safety_check') {
      selectedNextQId = (rawVal.includes('yes') || rawVal === 'true')
        ? request.allowedQuestionIds.find(id => id === 'pain_location')
        : request.allowedQuestionIds.find(id => id === 'pain_scale' || id === 'associated_symptoms');
    } else if (currentQId === 'pain_location') {
      selectedNextQId = request.allowedQuestionIds.find(id => id === 'pain_scale' || id === 'associated_symptoms');
    } else if (currentQId === 'pain_scale' || currentQId === 'associated_symptoms') {
      selectedNextQId = request.allowedQuestionIds.find(id => id === 'past_medical_history' || id === 'current_medications');
    } else if (currentQId === 'past_medical_history') {
      selectedNextQId = request.allowedQuestionIds.find(id => id === 'current_medications');
    }

    if (selectedNextQId) {
      return {
        extractedFacts: facts,
        missingInformation: [],
        nextAction: 'ask_follow_up',
        nextQuestionId: selectedNextQId,
        confidence: 'high'
      };
    }

    return {
      extractedFacts: facts,
      missingInformation: [],
      nextAction: 'continue_deterministic',
      confidence: 'high'
    };
  }

  async generateClinicalHistoryDraft(request: ReportGenerationRequest): Promise<ReportGenerationResponse> {
    return {
      report: {
        reportId: `mock_${Date.now()}`,
        reportVersion: '1.0',
        generatedAt: new Date().toISOString(),
        sessionId: request.session.id,
        patient: {
          fullName: request.patient.demographics.fullName,
          age: request.patient.demographics.age,
          gender: request.patient.demographics.gender,
        },
        visit: {
          generatedDate: new Date().toISOString(),
          departmentMode: request.session.departmentMode,
          intakeLanguage: request.session.language,
        },
        clinicalHistory: {
          chiefComplaint: {
            primaryComplaint: 'Mock Complaint',
            additionalComplaints: [],
            provenance: { source: 'demo_data' }
          },
          pastMedicalHistory: [],
          pastSurgicalHistory: [],
          medications: [],
          allergies: [],
          familyHistory: []
        },
        documentSummary: {
          uploadedDocumentCount: request.documents.length,
          documents: [],
          extractedConditions: [],
          laboratoryResults: [],
          admissions: []
        },
        medicalTimeline: [],
        attentionFlags: [],
        patientConfirmation: {
          confirmedByPatient: false,
          correctionsMade: 0
        },
        physicianVerification: {
          status: 'pending_physician_review',
          signatureRequired: true
        },
        reference: {
          referenceNumber: 'MOCK-123',
          qrPayload: 'mock',
          generatedAt: new Date().toISOString()
        }
      },
      validation: {
        passed: true,
        missingRequiredSections: [],
        warnings: []
      }
    };
  }
}
