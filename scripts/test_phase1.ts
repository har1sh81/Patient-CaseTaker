import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  // We'll just call the REST API endpoints directly for testing since it's a locally running server on port 3000
  // Fetch patient from test DB
  const { data: p } = await supabase.from('patients').select('id').limit(1).single();
  const patientId = p?.id || '00000000-0000-0000-0000-000000000001';
  
  console.log('Starting interview...');
  const startRes = await fetch('http://localhost:3000/api/interview/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId,
      department: 'general_medicine',
      language: 'en',
    })
  });
  
  if (!startRes.ok) {
    const err = await startRes.text();
    console.error('Failed to start:', err);
    return;
  }
  
  const startData = await startRes.json();
  console.log('Start data:', startData);
  
  const sessionId = startData.data?.sessionId;
  
  if (!sessionId) {
    console.error('No sessionId in startData');
    return;
  }
  
  console.log('Sending first answer (stomach pain)...');
  const ans1Res = await fetch(`http://localhost:3000/api/interview/${sessionId}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      answer: {
        questionId: startData.data.currentQuestion?.id || 'TEST_Q1',
        inputMethod: 'voice',
        value: 'I have stomach pain.'
      }
    })
  });
  
  const ans1Data = await ans1Res.json();
  console.log('Answer 1 data:', JSON.stringify(ans1Data, null, 2));

  console.log('Sending second answer (urination pain)...');
  const ans2Res = await fetch(`http://localhost:3000/api/interview/${sessionId}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      answer: {
        questionId: ans1Data.data?.nextQuestion?.id || 'TEST_Q2',
        inputMethod: 'voice',
        value: 'I also have pain when I urinate.'
      }
    })
  });
  
  const ans2Data = await ans2Res.json();
  console.log('Answer 2 data:', JSON.stringify(ans2Data, null, 2));
}

run().catch(console.error);
