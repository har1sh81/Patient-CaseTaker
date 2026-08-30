# MediKiosk — SIH Presentation Emergency Fallback Checklist

## One-Page Operator Fallback Guide

| Failure Point | Symptom | Emergency Action | Expected Outcome |
|---|---|---|---|
| **Voice Input Error** | Noisy room / Microphone permission denied / Speech API timeout | Click **"Type Instead"** button on screen and type patient symptoms via keyboard/touchscreen. | Session proceeds cleanly without voice dependency. |
| **QR Scan Failure** | Smartphone Wi-Fi disconnected / Camera app fails to scan | Click **"Upload File directly from Kiosk"** button on laptop kiosk. | Operator selects sample prescription file directly from laptop disk. |
| **OCR Failure** | Blurred photo upload / Extraction returns empty text | Kiosk displays raw document preview image; patient manually confirms symptoms during review. | Handoff report preserves uploaded document link without corrupting facts. |
| **Doctor Queue Delay** | Case does not immediately appear on Doctor Dashboard | Click **"Refresh Cases"** button on top-right of Doctor Dashboard UI. | Doctor Dashboard re-fetches latest finalized cases from database. |
| **Database Disruption** | Internet connection drop to cloud PostgreSQL | Kiosk displays local error alert and operates on cached session state until re-connected. | Zero data loss or crash; operator explains cloud database boundary. |
| **Mock Export Error** | Mock Hospital / ABDM export fails | UI displays **"Export Failed — Retryable"** status badge with retry button. | Demonstrates safe failure handling and idempotency. |

---

## Pre-Demo 60-Second Setup Checklist
1. **Laptop Network**: Connected to Wi-Fi; `NEXT_PUBLIC_APP_URL` set to LAN IPv4 (`http://<LAN-IP>:3000`).
2. **Smartphone Network**: Connected to same Wi-Fi network; camera app open.
3. **Environment**: `AI_PROVIDER=local` verified.
4. **Clean Demo Reset**: Run `npm run demo:reset -- --force` before starting rehearsal.
5. **Doctor Browser Tab**: Open `/doctor` tab logged in with doctor credentials.
