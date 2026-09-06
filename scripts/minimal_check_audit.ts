async function runApiAudit() {
  const baseUrl = 'http://localhost:3000';
  console.log("=== RUNNING API END-TO-END AUDIT ===");

  try {
    // 1. Identify Patient
    console.log("\n1. Looking up patient ABHA-002...");
    const lookupRes = await fetch(`${baseUrl}/api/kiosk/lookup?abhaReference=ABHA-002`);
    const lookupData = await lookupRes.json();
    
    if (!lookupData.success || !lookupData.patient) {
      console.error("Lookup failed:", lookupData);
      process.exit(1);
    }
    const patientId = lookupData.patient.id;
    console.log(`Found Patient: ${lookupData.patient.demographics.fullName} (ID: ${patientId})`);

    // 2. Start Session
    console.log(`\n2. Starting session for patient ${patientId}...`);
    const sessionRes = await fetch(`${baseUrl}/api/kiosk/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient: lookupData.patient,
        language: 'en',
        departmentMode: 'standard',
        permissions: {
          intakeCollection: true,
          voiceProcessing: true,
          documentProcessing: true,
          aiAssistedStructuring: true,
          reportGeneration: true,
        }
      })
    });
    const sessionData = await sessionRes.json();
    
    if (!sessionData.success || !sessionData.session) {
      console.error("Session creation failed:", sessionData);
      process.exit(1);
    }
    const sessionId = sessionData.session.id;
    console.log(`Session created: ${sessionId}`);

    // 3. Post an answer
    console.log("\n3. Posting an answer...");
    const answerRes = await fetch(`${baseUrl}/api/kiosk/interview/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answer: {
          id: 'ans_' + Math.random().toString(36).substr(2, 9),
          sessionId,
          patientId,
          questionId: 'q_primary_complaint',
          rawValue: 'Severe headache for 2 days',
          inputMethod: 'keyboard',
          answeredAt: new Date().toISOString(),
          section: 'chief_complaint',
          provenance: { source: 'patient_voice' },
          editedByPatient: false
        }
      })
    });
    const answerData = await answerRes.json();
    if (!answerData.success) {
      console.error("Answer posting failed:", answerData);
      process.exit(1);
    }
    console.log("Answer posted successfully!");

    // 4. Check Timeline (Documents/History)
    console.log("\n4. Generating Timeline...");
    const timelineRes = await fetch(`${baseUrl}/api/kiosk/interview/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    const timelineData = await timelineRes.json();
    if (!timelineData.success) {
      console.error("Timeline generation failed:", timelineData);
      process.exit(1);
    }
    console.log(`Timeline generated successfully with ${timelineData.data.records.length} records.`);

    // 5. Confirm Session (Handoff to Doctor)
    console.log("\n5. Confirming session and sending to doctor...");
    const confirmRes = await fetch(`${baseUrl}/api/kiosk/review/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, patientConfirmed: true })
    });
    const confirmData = await confirmRes.json();
    if (!confirmData.success) {
      console.error("Session confirm failed:", confirmData);
      process.exit(1);
    }
    console.log("Session confirmed! Assigned to:", confirmData.doctorAssignment.doctorName);

    // 6. Verify Doctor Cases
    console.log("\n6. Verifying Doctor Queue...");
    // Mock the doctor auth check via environment variable or just bypass if DEMO_ENVIRONMENT=true
    const casesRes = await fetch(`${baseUrl}/api/doctor/cases`);
    const casesData = await casesRes.json();
    
    if (casesData.error) {
       console.error("Failed to fetch doctor cases:", casesData);
       process.exit(1);
    }
    
    const foundCase = casesData.cases.find((c: any) => c.session.id === sessionId);
    if (!foundCase) {
       console.error("Session missing from doctor queue!");
       process.exit(1);
    }
    console.log(`Found session ${sessionId} in doctor queue! Chief Complaint: ${foundCase.chiefComplaint}`);

    console.log("\n=== AUDIT COMPLETED SUCCESSFULLY ===");

  } catch (err) {
    console.error("Audit script failed:", err);
    process.exit(1);
  }
}

runApiAudit();
