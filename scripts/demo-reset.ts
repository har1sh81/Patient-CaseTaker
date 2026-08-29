import { SupabaseRepository } from '../lib/supabase/repository';
import { loadAndSeedScenario } from '../lib/supabase/seed-data';
import * as readline from 'readline';

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function askConfirmation(query: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.toLowerCase() === 'yes' || ans.toLowerCase() === 'y');
  }));
}

async function resetDemo() {
  console.log('--- MediKiosk SIH Demo Reset ---');
  
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: Cannot run demo reset in production environment.');
    process.exit(1);
  }

  if (process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED === 'true') {
    console.error('ERROR: Mock services enabled. Demo reset should target the real Supabase backend with mock data flags.');
    process.exit(1);
  }
  
  if (process.env.DEMO_ENVIRONMENT !== 'true' && process.env.NODE_ENV !== 'development') {
    console.error('ERROR: Environment is not explicitly marked as DEMO or DEVELOPMENT.');
    process.exit(1);
  }

  console.log(`
DEMO RESET
-----------
Patients: 3 synthetic (pat_golden, pat_02, pat_03)
Sessions: 3 synthetic (scenario_standard, scenario_attention, scenario_ayush)
Documents: Associated synthetic documents
Reports: Associated synthetic clinical reports
Export records: Associated synthetic export records
Audit Logs: Associated synthetic audit logs

No non-demo records will be modified.
`);

  const args = process.argv.slice(2);
  if (!args.includes('--force')) {
    const confirmed = await askConfirmation('Are you sure you want to proceed with resetting the demo data? (yes/no): ');
    if (!confirmed) {
      console.log('Reset cancelled.');
      process.exit(0);
    }
  }

  const db = new SupabaseRepository();

  console.log('1. Removing existing demo records safely...');
  try {
    await db.resetDemoData();
    console.log('  Targeted demo records removed successfully.');
  } catch (error) {
    console.error('  Failed to remove targeted demo records:', error);
    process.exit(1);
  }

  console.log('2. Loading Demo Scenarios...');
  
  try {
    await loadAndSeedScenario('standard', db);
    await loadAndSeedScenario('attention', db);
    await loadAndSeedScenario('ayush', db);
    console.log('  Demo scenarios seeded successfully.');
  } catch (error) {
    console.error('  Failed to seed demo scenarios:', error);
    process.exit(1);
  }
  
  console.log('--- Demo Reset Complete ---');
  process.exit(0);
}

resetDemo();
