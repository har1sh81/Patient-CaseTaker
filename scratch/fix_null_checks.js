const fs = require('fs');

const filesToFix = [
  'app/api/kiosk/documents/[documentId]/ocr/route.ts',
  'app/api/kiosk/documents/[documentId]/route.ts',
  'app/api/kiosk/documents/route.ts',
  'app/api/kiosk/documents/upload-session/route.ts',
  'app/api/kiosk/interview/report/generate/route.ts'
];

filesToFix.forEach(relPath => {
  let content = fs.readFileSync(relPath, 'utf8');
  let regex = /if \(process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED !== 'true'\) \{\s+const \{ createClient \} = require\('@\/lib\/supabase\/server'\);\s+const supabase = await createClient\(\);\s+const \{ data: \{ user \} \} = await supabase.auth.getUser\(\);\s+if \(!user \|\| user.id !== session.patientId\) \{\s+return NextResponse.json\(\{ error: 'Unauthorized access to session' \}, \{ status: 403 \}\);\s+\}\s+\}/g;
  
  // Remove the block
  content = content.replace(regex, '');
  
  // Find where `if (!session)` is and insert it right after the closing brace
  // If there is no `if (!session)`, we must add it.
  if (content.includes('if (!session)')) {
    let ifSessionRegex = /(if\s*\(!session\)\s*\{[^}]+\})/g;
    let match = ifSessionRegex.exec(content);
    if (match) {
        content = content.replace(match[1], match[1] + "\n" + `
    if (process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED !== 'true') {
      const { createClient } = require('@/lib/supabase/server');
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== session.patientId) {
        return NextResponse.json({ error: 'Unauthorized access to session' }, { status: 403 });
      }
    }
`);
    }
  } else {
    // Add `if (!session)`
    let getSessionRegex = /(const\s+session\s*=\s*await\s+db\.getSession\([^)]+\);)/g;
    let sMatch = getSessionRegex.exec(content);
    if (sMatch) {
        content = content.replace(sMatch[1], sMatch[1] + "\n" + `
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED !== 'true') {
      const { createClient } = require('@/lib/supabase/server');
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== session.patientId) {
        return NextResponse.json({ error: 'Unauthorized access to session' }, { status: 403 });
      }
    }
`);
    }
  }
  
  fs.writeFileSync(relPath, content);
  console.log('Fixed', relPath);
});
