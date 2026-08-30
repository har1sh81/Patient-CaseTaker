# MediKiosk — Physical Demo & Device Runbook

## 1. Overview & Architecture Boundaries
MediKiosk is designed for hybrid local/cloud deployment in clinical kiosk environments:

- **LOCAL INTELLIGENCE**:
  - Multilingual Browser Speech Recognition (Chromium Web Speech API)
  - Local Clinical NLP (`LocalClinicalNLP`)
  - Local Neural Semantic Embeddings (`all-MiniLM-L6-v2`)
  - Multi-Stage Hybrid Retrieval Engine (`HybridClinicalRetrievalEngine`)
  - Deterministic Report Composer (`composeConsultationSummary`)
  - Server-Side WinAnsi PDF Generator (`pdf-lib`)
- **CLOUD DATABASE**:
  - Hosted Supabase PostgreSQL & pgvector (`*.supabase.co`)
- **MOCK INTEGRATIONS**:
  - ABDM Consent & ABHA M1/M2 Gateway
  - Hospital Information System (HIS) Export

---

## 2. Laptop & Network Setup

### A. Local Area Network (LAN) Setup
To allow physical smartphones on the same Wi-Fi network to scan QR codes and upload documents to the laptop:

1. Obtain laptop's local IPv4 address:
   - Windows: `ipconfig` (e.g. `192.168.1.15`)
2. Export `NEXT_PUBLIC_APP_URL` and start Next.js bound to all network interfaces (`0.0.0.0`):
   ```bash
   $env:NEXT_PUBLIC_APP_URL="http://192.168.1.15:3000"
   npm run dev -- -H 0.0.0.0
   ```
3. Open `http://192.168.1.15:3000` on the laptop browser.

### B. Vercel / HTTPS Setup
For cloud demonstration over HTTPS:
1. Set `NEXT_PUBLIC_APP_URL=https://medikiosk.vercel.app` in Vercel Environment Variables.
2. QR codes will automatically encode `https://medikiosk.vercel.app/upload?token=...`.

---

## 3. Physical Smartphone Demonstration Flow

```
Kiosk QR Display (Laptop)
         │
         ▼ (Camera Scan)
Smartphone Upload Page (`/upload?token=...`)
         │
         ▼ (Take Photo / Upload Document)
Supabase Storage Bucket
         │
         ▼ (Real-time Session Event)
Kiosk Document Extraction (OCR + Local NLP)
         │
         ▼
Patient Review & Confirmation
         │
         ▼
PDF Generated + Doctor Queue Sync
```

1. **Step 1 — Session Start**: Patient selects language (English, Hindi, Tamil) on laptop kiosk.
2. **Step 2 — Interactive Intake**: Patient speaks or types symptoms. Local NLP extracts structured clinical facts in real time.
3. **Step 3 — QR Document Link**: Patient navigates to `/kiosk/documents`. Laptop renders QR code.
4. **Step 4 — Phone Camera Scan**: Operator scans QR code using a physical Android or iOS phone camera.
5. **Step 5 — Mobile Document Upload**: Phone opens `/upload?token=...`, captures photo of prescription/lab report, and submits upload.
6. **Step 6 — Kiosk Sync**: Laptop kiosk receives real-time notification, extracts OCR text, and merges facts into the clinical record.
7. **Step 7 — Review & Confirmation**: Patient reviews summary, edits facts if necessary, and clicks **Confirm & Submit**.
8. **Step 8 — Doctor Handoff**: Case arrives in Doctor Workspace queue (`/doctor`). Doctor views consultation summary, clicks PDF preview, and executes hospital export.

---

## 4. Emergency Fallback Procedures

| Component | Potential Issue | Emergency Fallback Procedure |
|---|---|---|
| **Voice Input** | Noisy room / Browser speech error | Click **"Type Instead"** and enter text manually via touchscreen/keyboard. |
| **Phone Upload** | Phone Wi-Fi disconnected / QR blocked | Click **"Upload File directly from Kiosk"** button on laptop screen. |
| **OCR Extraction** | Blur / Low-quality photo | Kiosk displays raw document preview; patient selects manual symptom confirmation. |
| **Cloud Database** | Brief internet disruption | System operates on cached local session state; syncs upon reconnection. |
| **Doctor Queue** | Queue auto-refresh delay | Click **"Refresh Cases"** button on Doctor Dashboard. |

---

## 5. Security & Isolation Verification
- **Patient Authorization**: QR tokens are cryptographically bound to a single `sessionId` with a 10-minute expiration window (`generateUploadToken`).
- **Patient Data Isolation**: Database queries strictly enforce `WHERE patient_id = :id`. Attempting to access Patient B records via Patient A session returns `403 Forbidden`.
