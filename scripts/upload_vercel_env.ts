import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

function uploadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf8');
  
  const lines = envContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    
    // Remove surrounding quotes if they exist
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    console.log(`Uploading ${key}...`);
    try {
      execSync(`npx vercel env add ${key} production,preview,development`, {
        input: value,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      console.log(`✅ Successfully uploaded ${key}`);
    } catch (e: any) {
      console.error(`❌ Failed to upload ${key}:`, e?.stderr?.toString() || e.message);
    }
  }
}

uploadEnv();
