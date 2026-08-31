# MediKiosk Project File Organization Map

This document organizes and groups all codebase files by their technical layer (Frontend, Backend, Logic/Services, Data/Types, Database, etc.) to make it easy to find and manage files.

---

## 🎨 1. Frontend / UI Layer (Client-Side)

### 📌 Pages & Routing (`app/` folders)
- **Patient Kiosk Pages** (`app/(patient)/kiosk/`)
  - [page.tsx](file:///c:/Users/haris/OneDrive/projects/Patient-TakeCare/app/(patient)/kiosk/page.tsx) — Main kiosk portal landing page (Consent & ABHA)
  - [interview/page.tsx](file:///c:/Users/haris/OneDrive/projects/Patient-TakeCare/app/(patient)/kiosk/interview/page.tsx) — Conversational AI patient intake page
  - [documents/page.tsx](file:///c:/Users/haris/OneDrive/projects/Patient-TakeCare/app/(patient)/kiosk/documents/page.tsx) — File upload and OCR capture interface
  - [timeline/page.tsx](file:///c:/Users/haris/OneDrive/projects/Patient-TakeCare/app/(patient)/kiosk/timeline/page.tsx) — Interactive patient clinical history timeline
  - [review/page.tsx](file:///c:/Users/haris/OneDrive/projects/Patient-TakeCare/app/(patient)/kiosk/review/page.tsx) — Final patient review, summary corrections, and doctor handoff
- **Doctor Dashboard Pages** (`app/(doctor)/doctor/`)
  - [page.tsx](file:///c:/Users/haris/OneDrive/projects/Patient-TakeCare/app/(doctor)/doctor/page.tsx) — Case queue listing all incoming patient sessions
  - [patient/[sessionId]/page.tsx](file:///c:/Users/haris/OneDrive/projects/Patient-TakeCare/app/(doctor)/doctor/patient/%5BsessionId%5D/page.tsx) — Doctor portal case view (clinical history review, section verification, and FHIR export controls)
- **General Pages**
  - [login/page.tsx](file:///c:/Users/haris/OneDrive/projects/Patient-TakeCare/app/login/page.tsx) — Doctor portal login page
  - [upload/page.tsx](file:///c:/Users/haris/OneDrive/projects/Patient-TakeCare/app/upload/page.tsx) — Standalone document upload page
  - [demo/page.tsx](file:///c:/Users/haris/OneDrive/projects/Patient-TakeCare/app/demo/page.tsx) — Pre-seeded demo scenarios hub
  - [page.tsx](file:///c:/Users/haris/OneDrive/projects/Patient-TakeCare/app/page.tsx) — Default Next.js landing entrypoint

### 🧩 UI Components (`components/`)
- **UI Core elements** (`components/ui/`) — Reusable base design system components (buttons, cards, badges, dialogs, progress bars, etc.)
- **Adaptive Interaction Elements** (`components/interaction/`)
  - Voice inputs, on-screen keyboard, numeric fields, multiple-choice rendering, and mic permission helpers.
- **Kiosk Interface Blocks** (`components/kiosk/`)
  - Question cards, question pathway renderers, custom kiosk layout wrappers.
- **Documents & OCR Components** (`components/documents/`)
  - Document capturing, listing, and QR-code companion upload visualizer.
- **Clinical Viewers** (`components/timeline/`, `components/print/`)
  - Medical timeline visualizers and printing/report formatting stylesheets.

### 🪝 React Hooks (`hooks/`)
- [use-speech-recognition.ts](file:///c:/Users/haris/OneDrive/projects/Patient-TakeCare/hooks/use-speech-recognition.ts) — Web speech hook for patient voice inputs
- [use-tts.ts](file:///c:/Users/haris/OneDrive/projects/Patient-TakeCare/hooks/use-tts.ts) — Text-To-Speech audio output hook
- [use-toast.ts](file:///c:/Users/haris/OneDrive/projects/Patient-TakeCare/hooks/use-toast.ts) — UI notification triggers

---

## ⚙️ 2. Backend / API Layer (Server-Side Routes)

All API route files are located in `app/api/` and act as the secure backend controllers:

### 🏥 Kiosk Patient Intake API (`app/api/kiosk/`)
- **Session Management:**
  - `session/` — Creates, fetches, and ends patient sessions
  - `session/cleanup/` — Deletes temporary patient data and session items post-intake
- **ABDM Integration:**
  - `abdm/consent/` — Initiates/verifies patient consent requests
  - `abdm/records/` — Requests health information records via ABDM gateway
- **Document Processing & OCR:**
  - `documents/` — Uploads and updates files
  - `documents/upload-session/` — Links mobile upload sessions via QR-code
  - `documents/[documentId]/` — Fetches document metadata
  - `documents/[documentId]/ocr/` — Runs OCR on uploaded documents
  - `documents/[documentId]/extract/` — Extracts structured facts from documents using LLMs
- **AI Interview Engine:**
  - `interview/session/` — Generates next adaptive interview question
  - `interview/adaptive/` — Realtime feedback loops for adaptive logic
  - `interview/answers/` — Persists and processes answers
  - `interview/attention/` — Evaluates real-time red-flags
  - `interview/timeline/` — Retrieves the raw patient intake timeline
  - `interview/timeline/reconstruct/` — Cleans and builds a unified timeline
  - `interview/report/generate/` — Computes the draft clinical history report

### 🧑‍⚕️ Doctor Case API (`app/api/doctor/`)
- `cases/` — Retrieves active cases queue
- `cases/[sessionId]/` — Retrieves/updates session summary data
- `cases/[sessionId]/update/` — Edits individual clinical fields
- `cases/[sessionId]/resolve-conflict/` — Resolves data conflict resolutions
- `cases/[sessionId]/finalize/` — Commits final edits and locks the case
- `cases/[sessionId]/export/fhir/` — Maps finalized case into a FHIR bundle
- `cases/[sessionId]/export/hospital/` — Transmits FHIR data to hospital HIS adapter
- `cases/[sessionId]/export/abdm/` — Submits clinical records to ABDM gateway
- `cases/[sessionId]/export/status/` — Status monitoring of external HIS/ABDM sync

### 🔐 System Middleware
- [middleware.ts](file:///c:/Users/haris/OneDrive/projects/Patient-TakeCare/middleware.ts) — Enforces route protection rules on `/doctor/*` and updates user session cookies.

---

## 🧠 3. Business Logic, Adapters & Services (`lib/`)

These modules perform core calculations, format data, and interface with external AI and gateway services.

- **`lib/supabase/`** — DB access patterns. Contains repository definitions, storage file management, mock database adapters (`mock-db.ts`), and seeders.
- **`lib/ai/`** — Adaptive prompting factories, schemas, and LLM implementations for Gemini.
- **`lib/abdm/`** — ABDM integration models, wrappers, and mock endpoints.
- **`lib/conversation/`** — Conversational states, validation, progress tracking, and pathway routing.
- **`lib/documents/`** — Document classifiers, parser engines, text sanitizers, and clinical summaries.
- **`lib/ocr/`** — Text extraction interfaces (mock and cloud adapters).
- **`lib/fhir/`** — Maps medical histories to interoperable FHIR resource bundles.
- **`lib/attention/`** — Real-time red flag triggers and hazard scanning algorithms.
- **`lib/timeline/`** — Merges patient statements, medical records, and ABDM data into unified timelines.
- **`lib/voice/`** — Web speech integration frameworks, language definitions, and audio mocks.

---

## 🗄️ 4. Data, Types & Schemas

- **Static Clinical Rules & Mocks** (`data/`)
  - Configs for red flags, AYUSH regulations, triage pathway trees, and pre-seeded case files (`standard-patient.json`).
- **Zod Data Verification Schemas** (`schemas/`)
  - Strictly defines validation structures for patients, sessions, documents, clinical records, API payloads, etc.
- **TypeScript Model Declarations** (`types/`)
  - Repository of standard interfaces matching Zod verification specifications.

---

## 🛢️ 5. Database & Infrastructure (`supabase/`)

- **Supabase Migrations** (`supabase/migrations/`)
  - [20260826000000_init.sql](file:///c:/Users/haris/OneDrive/projects/Patient-TakeCare/supabase/migrations/20260826000000_init.sql) — Sets up the structural schema (13 tables, indexes, schemas)
  - [20260827000000_schema.sql](file:///c:/Users/haris/OneDrive/projects/Patient-TakeCare/supabase/migrations/20260827000000_schema.sql) — Core schemas updates
  - `20260828000000_security_rls.sql` — Row Level Security (RLS) configuration rules
- **Supabase Local Setup**
  - `supabase/seed.sql` — SQL operations to seed local databases

---

## 🧪 6. Scripting & Tests

- **Development CLI tools** (`scripts/`)
  - `demo-reset.ts` — CLI tool to clean up synthetic records from mock database
- **Verification Scripts** (`scratch/`)
  - Playgrounds for testing adaptive AI logic, OCR functions, and the complete E2E Golden Path.
- **Unit and Integration Suites** (`tests/`)
  - Core service tests

---

## 📋 7. Configuration Files (Root)

- `.env.local` / `.env.example` — Environment settings
- `next.config.ts` — NextJS configuration
- `tsconfig.json` — TypeScript setup configurations
- `eslint.config.mjs` — Linting rules configurations
- `package.json` — Core script dependencies
