import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  // Use a patient known to have consent in the seeded DB
  const patientId = 'a1111111-1111-4111-8111-000000000001';
  
  console.log('Starting interview for patient:', patientId);
  const startRes = await fetch('http://localhost:3000/api/interview/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId,
      department: 'general_medicine',
      language: 'en',
      consents: {
        share_health_records: true
      }
    })
  });
  
  if (!startRes.ok) {
    const err = await startRes.text();
    console.error('Failed to start:', err);
    return;
  }
  
  const startData = await startRes.json();
  const sessionId = startData.data?.sessionId;
  
  if (!sessionId) {
    console.error('No sessionId in startData');
    return;
  }
  
  console.log('--- Session Started ---');
  
  const answers = [
    'I have stomach pain.',
    'It started yesterday.',
    'It is on the right side.',
    'I also have pain when I urinate.',
  ];

  let currentQuestionId = startData.data.currentQuestion?.id || 'TEST_Q';

  for (const [i, ans] of answers.entries()) {
    console.log(`\nSending answer ${i + 1}: "${ans}"`);
    const res = await fetch(`http://localhost:3000/api/interview/${sessionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        answer: {
          questionId: currentQuestionId,
          inputMethod: 'text',
          value: ans
        }
      })
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`Failed answer ${i+1}:`, data);
    }
    currentQuestionId = data.data?.nextQuestion?.id || 'TEST_Q';
  }

  // After answers, fetch the state from the DB directly to inspect it
  console.log('\n--- Final Interview State in DB ---');
  const { data: sessionData, error } = await supabase
    .from('interview_sessions')
    .select('id, conversation_turns, covered_topics, missing_information, last_answer, turn_count, collected_facts')
    .eq('id', sessionId)
    .single();

  if (error) {
    console.error('Failed to fetch session state:', error);
  } else {
    console.log(JSON.stringify(sessionData, null, 2));
  }
}

run().catch(console.error);
