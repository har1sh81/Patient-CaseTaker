import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createDoctor() {
  const email = 'doctor@takecare.health';
  const password = 'Password123!';

  console.log(`Attempting to register doctor account: ${email}...`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'doctor',
      }
    }
  });

  if (error) {
    if (error.message.includes('already registered')) {
      console.log('Doctor account is already registered and ready to use!');
    } else {
      console.error('Error registering doctor:', error.message);
    }
  } else {
    console.log('Successfully registered doctor account!', data.user?.id);
  }
}

createDoctor();
