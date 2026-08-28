# Architecture Documentation

MediKiosk is designed as a modular patient check-in and clinic intake dashboard system built with Next.js (App Router), TypeScript, and Tailwind CSS.

## Key Architectural Layers

1. **Routing (`app/`)**: Segregated dashboards for patient kiosks (`(patient)`) and clinic staff (`(staff)`: doctor, triage, admin).
2. **Components (`components/`)**: Shared design language and interface fragments.
3. **Libraries (`lib/`)**: Core clinical domain logic, voice-to-text, AI clinical summarization, FHIR converters, and database clients.
4. **Data schemas and rules (`data/`)**: Dynamic pathways, red-flags checking configurations, and traditional medicine assessments.
5. **Database (`supabase/`)**: Managed schemas, functions, and relational entities.
