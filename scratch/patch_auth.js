const fs = require('fs');
const path = require('path');

const doctorRoutes = [
  'app/api/doctor/cases/[sessionId]/update/route.ts',
  'app/api/doctor/cases/[sessionId]/route.ts',
  'app/api/doctor/cases/[sessionId]/resolve-conflict/route.ts',
  'app/api/doctor/cases/[sessionId]/finalize/route.ts',
  'app/api/doctor/cases/[sessionId]/export/status/route.ts',
  'app/api/doctor/cases/[sessionId]/export/hospital/route.ts',
  'app/api/doctor/cases/[sessionId]/export/fhir/route.ts',
  'app/api/doctor/cases/route.ts',
  'app/api/doctor/cases/[sessionId]/export/abdm/route.ts',
];

const authCheck = `
    const { createClient } = require('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
`;

doctorRoutes.forEach((routePath) => {
  const fullPath = path.join(__dirname, '..', routePath);
  let content = fs.readFileSync(fullPath, 'utf8');

  // Add import if missing
  if (!content.includes("import { createClient }")) {
    content = content.replace("import { NextResponse } from 'next/server';", "import { NextResponse } from 'next/server';\nimport { createClient } from '@/lib/supabase/server';");
  }

  // Insert auth check right after try {
  if (!content.includes("role !== 'doctor'")) {
    content = content.replace(
      /try\s*\{/,
      `try {\n    const supabase = await createClient();\n    const { data: { user } } = await supabase.auth.getUser();\n    if (!user || user.app_metadata?.role !== 'doctor') {\n      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });\n    }\n`
    );
    fs.writeFileSync(fullPath, content);
    console.log('Patched', routePath);
  }
});
