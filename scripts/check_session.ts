import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('interview_sessions')
    .select('id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error fetching:', error);
  } else {
    console.log('Recent 5 sessions:');
    data.forEach(d => console.log(d.id, d.status, d.created_at));
  }
}
check();
