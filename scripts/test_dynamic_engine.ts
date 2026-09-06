import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const PATIENT_ID = 'a1111111-1111-4111-8111-000000000001';

async function runScenario(name: string, initialComplaint: string, nextAnswers: string[]) {
  console.log(`\n=== Running Scenario: ${name} ===`);
  console.log(`Initial Complaint: "${initialComplaint}"`);

  // Start Session
  const startRes = await fetch('http://localhost:3000/api/interview/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId: PATIENT_ID,
      department: 'general_medicine',
      language: 'en',
      chiefComplaint: initialComplaint
    })
  });

  if (!startRes.ok) {
    console.error('Start failed:', await startRes.text());
    return;
  }

  const startData = await startRes.json();
  const sessionId = startData.data?.sessionId;
  let currentQuestion = startData.data?.currentQuestion;

  console.log(`\n[Assistant (Initial)]: ${currentQuestion?.text || '(none)'}`);

  // Loop through follow up answers
  for (const ans of nextAnswers) {
    console.log(`\n[Patient]: ${ans}`);
    
    const ansRes = await fetch(`http://localhost:3000/api/interview/${sessionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: currentQuestion?.id || 'unknown',
        answer: ans,
        inputMethod: 'text'
      })
    });

    const ansData = await ansRes.json();
    if (!ansRes.ok) {
      console.error(`[Error submitting answer]`, ansData);
      break;
    }

    currentQuestion = ansData.data?.nextQuestion;
    console.log(`[Assistant (Dynamic)]: ${currentQuestion?.text || '(none)'}`);
    
    if (ansData.data?.status === 'completed' || ansData.data?.status === 'terminated_for_safety') {
      console.log(`Session ended with status: ${ansData.data.status}`);
      break;
    }
  }
}

async function runAll() {
  await runScenario('1. Chest Pain', 'I have chest pain', ['It started an hour ago.']);
  await runScenario('2. Stomach Pain', 'I have stomach pain', ['It is mostly on the right side.']);
  await runScenario('3. Headache', 'My head hurts', ['No, I have no fever, just a headache.']);
  await runScenario('4. Fever', 'I have a high fever', ['It has been 3 days now.']);
  await runScenario('5. Unknown/Rare (Snake bite)', 'I was bitten by a snake', ['It was a green snake.']);
}

runAll().catch(console.error);
