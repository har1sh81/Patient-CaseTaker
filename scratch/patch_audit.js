const fs = require('fs');
const path = require('path');

function insertBefore(filePath, searchString, insertString) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('saveAuditLog(')) return; // Already patched
  
  // ensure crypto randomUUID is imported if used
  if (!content.includes('import { randomUUID } from')) {
    content = content.replace(/import { NextResponse } from 'next\/server';/, "import { NextResponse } from 'next/server';\nimport { randomUUID } from 'crypto';");
  }

  const parts = content.split(searchString);
  if (parts.length === 2) {
    fs.writeFileSync(filePath, parts[0] + insertString + searchString + parts[1]);
    console.log('Patched audit in', filePath);
  }
}

const finalizePath = path.join(__dirname, '../app/api/doctor/cases/[sessionId]/finalize/route.ts');
const finalizeAudit = `
    await db.saveAuditLog({
      id: \`log_\${randomUUID()}\`,
      sessionId,
      action: 'physician_finalized',
      timestamp: new Date().toISOString(),
      metadata: { actor: user.id }
    });
    `;
insertBefore(finalizePath, 'return NextResponse.json({ success: true });', finalizeAudit);

const conflictPath = path.join(__dirname, '../app/api/doctor/cases/[sessionId]/resolve-conflict/route.ts');
const conflictAudit = `
    await db.saveAuditLog({
      id: \`log_\${randomUUID()}\`,
      sessionId,
      action: 'conflict_resolved',
      timestamp: new Date().toISOString(),
      metadata: { actor: user.id, flagId, decision }
    });
    `;
insertBefore(conflictPath, 'return NextResponse.json({ success: true, flag: updatedFlag });', conflictAudit);

const confirmPath = path.join(__dirname, '../app/api/kiosk/review/confirm/route.ts');
const confirmAudit = `
    await db.saveAuditLog({
      id: \`log_\${randomUUID()}\`,
      sessionId,
      action: 'patient_confirmed',
      timestamp: new Date().toISOString(),
      metadata: { actor: session.patientId }
    });
    `;
// Wait, in confirm route, it does `await db.updateSession(...)`
insertBefore(confirmPath, 'return NextResponse.json({', confirmAudit);
