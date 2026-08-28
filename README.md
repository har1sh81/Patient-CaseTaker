# MediKiosk

MediKiosk is a patient-facing touchscreen intake kiosk built with Next.js (App Router), TypeScript, and Tailwind CSS. It is designed to capture patient voice-and-touch histories, extract structured data from scanned medical documents via OCR, evaluate critical safety red flags, and compile them into a **printed physical clinical history report** for use during consultations.

## Directory Structure

```
MediKiosk/
│
├── app/                  # Next.js pages and Route Handlers
│   ├── (patient)/        # Patient touchscreen interface
│   │   └── kiosk/        # Intake, identification, document scan, & confirmation
│   │
│   ├── demo/             # Preconfigured scenario loaders for hackathon demos
│   ├── api/              # Health checks, print logs, and OCR endpoint handlers
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/           # UI Elements
│   ├── ui/               # Lower-level design tokens (shadcn/ui placeholders)
│   ├── common/           # Shared structures (e.g., KioskHeader, PrintTemplate)
│   ├── kiosk/            # Touchscreen components (Language selectors, Keyboard, Consent)
│   ├── conversation/     # Speech transcribers and audio playback controls
│   ├── documents/        # PDF and image uploads / previewers
│   ├── summary/          # SOAP clinical summary panels
│   └── demo/             # Sandbox scenario configurations
│
├── lib/                  # Core modules
│   ├── ai/               # AI prompt orchestrator (symptom parser, report compiler)
│   ├── voice/            # Voice capturing and playback hooks
│   ├── clinical/         # Clinical utilities and vitals parsing rules
│   ├── red-flags/        # Predefined rule engine for emergency triggers
│   ├── documents/        # Document OCR wrappers
│   ├── ayush/            # Ayurvedic Prakriti scoring and Ahara-Vihara logic
│   ├── fhir/             # FHIR JSON resource mapping converters
│   ├── integrations/     # Mock sync log helper for external audits
│   ├── supabase/         # PostgreSQL connection client
│   ├── auth/             # Basic kiosk user session verification
│   └── utils/            # General helpers
│
├── hooks/                # Custom React hooks
├── types/                # TypeScript interfaces
├── schemas/              # Zod validation schemas
│
├── data/                 # Static mock lists and clinical pathways
│   ├── demo-patients/
│   ├── demo-documents/
│   ├── question-pathways/
│   └── red-flag-rules/
│
├── public/               # Static assets (icons, audio cues, PDFs)
│
├── supabase/             # Database migrations and seed scripts
│   ├── migrations/
│   └── seed.sql
│
├── docs/                 # System documentation
│   ├── architecture/
│   ├── api/
│   └── workflows/
│
├── tests/                # Testing suites
```

## Intake Workflow

```text
Patient -> Kiosk Touchscreen -> Language -> ID & Consent -> Voice & Touch Interview -> Scanned Records -> OCR & AI Structuring -> Red-Flag Rules -> Printed History Report
```

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env.local` and configure your API keys:
```bash
cp .env.example .env.local
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to start the touchscreen kiosk.
