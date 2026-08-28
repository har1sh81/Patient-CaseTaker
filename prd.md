# Product Requirements Document (PRD) - MediKiosk

## Overview
MediKiosk is a patient-facing touchscreen intake kiosk designed to capture patient voice-and-touch histories, extract structured data from scanned medical documents via OCR, evaluate critical safety red flags, and compile them into a printed physical clinical history report for use during consultations.

## Core Chain Workflow
1. Identify (ABHA, Mobile, New patient, Language selection)
2. Consent & Privacy (Voice, Medical-data, Document, AI-processing, Printed-summary, Session timeout, Cleanup, Audit trail)
3. ABHA / ABDM (ABHA-based identification, Consent-based record retrieval, Previous conditions, Medications/prescriptions, Lab reports, Hospital records, FHIR-normalized data)
4. Adaptive Clinical Interview (Voice, Touch, Text, Multilingual, Adaptive follow-up questions, Standard clinical history, HPI, Past medical/surgical, Drugs/allergies, Family history, Personal history, Review of systems)
5. AYUSH (Prakriti, Vikriti, Agni, Koshtha, Diet/lifestyle, Trividha Pariksha, Ashtavidha Pariksha, Dashavidha Pariksha)
6. Red-Flag Detection (Identify predefined urgent symptom combinations, Generate priority/attention flag, Alert hospital/triage staff - Never presented as an AI diagnosis)
7. Document Digitization (Camera/scanner/upload for PDF, JPG/PNG, Printed documents, Handwritten documents, Multilingual documents)
8. Document AI Extraction (Diagnoses/conditions, Medicines, Dose/frequency, Allergies, Surgeries, Lab tests, Values, Reference ranges, Dates)
9. Medical Timeline (Automatically organize records chronologically)
10. Clinical Analysis/Organization (Combine ABDM records, old documents, and current interview, Identify inconsistencies, Highlight abnormal lab values, Flag possible medication conflicts)
11. Final History Summary (Generate structured summary of HPI, PMH, Meds, Allergies, Family/Personal history, ROS, Investigations, Relevant ABDM/Documents, Attention flags)
12. Doctor Dashboard (See patient, complaint, structured history, previous records, document images, extracted info, timeline, attention flags. Edit AI summary and confirm/reject info)
13. Patient Verification (Review important answers, correct mistakes, confirm summary)
14. Report Generation (Professional clinical-history report)
15. Printing (Physical printable report generation)
16. Hospital Integration (Hospital-side access, session association, patient association, clinical history transfer, EMR integration)
17. ABDM/FHIR (Transition to Real ABDM/FHIR Provider from Mock)

## Phase Roadmap
PHASE 0.1 Contracts / Architecture ✅
PHASE 1 Foundation ✅
PHASE 2 Database ✅
PHASE 3 Kiosk Entry ✅
PHASE 4 Session + Privacy ✅
PHASE 5 Voice + Touch ✅
PHASE 6 Conversation Engine ✅
PHASE 7 Adaptive Clinical AI ✅
PHASE 7.5 ABDM / ABHA ✅ Foundation
PHASE 8 Document Capture + Upload
PHASE 9 OCR + Document Extraction
PHASE 10 Clinical Information Extraction
PHASE 11 Medical Timeline + Record Fusion
PHASE 12 Red-Flag / Attention Engine
PHASE 13 AYUSH / Dashavidha Engine
PHASE 14 Final Clinical History Generator
PHASE 15 Doctor Dashboard + Review
PHASE 16 Patient Verification + Report
PHASE 17 Printing
PHASE 18 Hospital / ABDM / FHIR Integration
PHASE 19 Security + Privacy + Audit Hardening
PHASE 20 End-to-End Testing + Demo Hardening
