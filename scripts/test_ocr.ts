import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runOcrTest() {
  console.log('--- Starting OCR Flow Test ---');
  const patientId = 'a1111111-1111-4111-8111-000000000001';

  // 1. Start an intake session
  console.log('1. Starting Intake Session...');
  const startRes = await fetch('http://localhost:3000/api/kiosk/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patient: {
        id: patientId,
        identification: { hospitalNumber: 'HSP-TEST' },
        demographics: { firstName: 'Test', fullName: 'Test Patient' },
      },
      language: 'en',
      departmentMode: 'standard',
      permissions: {
        intakeCollection: true,
        voiceProcessing: true,
        documentProcessing: true,
        aiAssistedStructuring: true,
        reportGeneration: true
      }
    })
  });
  
  if (!startRes.ok) throw new Error(await startRes.text());
  const sessionId = (await startRes.json()).session.id;
  console.log(`Session Created: ${sessionId}`);



  // 3. Initiate Upload Session for a document
  console.log('3. Initiating Document Upload...');
  const uploadRes = await fetch('http://localhost:3000/api/kiosk/documents/upload-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  });
  
  if (!uploadRes.ok) throw new Error(await uploadRes.text());
  const { token } = await uploadRes.json();
  console.log(`Upload Token Created.`);

  // 4. Upload dummy file to endpoint...
  console.log('4. Uploading dummy image...');
  // A 1x1 transparent PNG
  const dummyImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
  
  const formData = new FormData();
  formData.append('token', token);
  formData.append('category', 'laboratory_report');
  formData.append('file', new Blob([dummyImage], { type: 'image/png' }), 'test-lab-report.png');

  const s3Res = await fetch('http://localhost:3000/api/kiosk/documents', {
    method: 'POST',
    body: formData as any
  });

  if (!s3Res.ok) throw new Error(`Upload to storage failed: ${s3Res.status} ${await s3Res.text()}`);
  const { document } = await s3Res.json();
  const documentId = document.id;
  console.log(`Document ID Created: ${documentId}`);

  // 5. Trigger OCR
  console.log('5. Triggering OCR API...');
  const ocrRes = await fetch(`http://localhost:3000/api/kiosk/documents/${documentId}/ocr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  });

  if (!ocrRes.ok) {
    console.error('OCR API failed:', await ocrRes.text());
    return;
  }
  const ocrData = await ocrRes.json();
  console.log('OCR Output:');
  console.log(JSON.stringify(ocrData, null, 2));
}

runOcrTest().catch(console.error);
