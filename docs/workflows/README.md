# Clinical Intake Workflows

This document outlines the standard patient intake and triage processes within the clinic.

## 1. Patient Check-In & Voice Intake
- Patient arrives at the kiosk and completes identification.
- Kiosk initiates a speech-to-text recording capturing the chief complaint and history of present illness.
- Audio is processed; transcript is parsed for vitals and red flags.

## 2. Staff Triage
- Triage staff dashboard shows a real-time prioritized queue.
- Red flags and critical symptoms (e.g. chest pain, hypertension) elevate the priority.
- Staff reviews the AI summary and manually adds vitals.

## 3. Consultation Handoff
- Doctor views the structured summary (SOAP note format) and initiates the consult.
- Sync command uploads final encounter record to EMR.
