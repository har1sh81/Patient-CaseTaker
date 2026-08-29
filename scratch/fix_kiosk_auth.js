const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      walkSync(dirFile, filelist);
    } else if (dirFile.endsWith('route.ts')) {
      filelist.push(dirFile);
    }
  }
  return filelist;
};

const kioskRoutes = walkSync(path.join(__dirname, '..', 'app/api/kiosk'));

const authCheck = `
    if (process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED !== 'true') {
      const { createClient } = require('@/lib/supabase/server');
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== session.patientId) {
        return NextResponse.json({ error: 'Unauthorized access to session' }, { status: 403 });
      }
    }
`;

kioskRoutes.forEach((routePath) => {
  let content = fs.readFileSync(routePath, 'utf8');

  // Strip out previously injected bad block
  if (content.includes("error: 'Unauthorized access to session'")) {
    content = content.replace(authCheck, '');
    
    // Now insert it correctly AFTER the session !session check
    // Strategy: Look for `return NextResponse.json({ error: 'Session not found' }, { status: 404 });` or similar
    // and insert it right after the closing brace `}`.
    
    let regex = /(if\s*\(!session\)\s*\{\s*return NextResponse\.json\(\{[^}]+\},\s*\{[^}]+\}\);\s*\})/g;
    let match = regex.exec(content);
    if (match) {
        content = content.replace(match[1], match[1] + "\n" + authCheck);
    } else {
        // If there's no null check for session, but there is `const session = await db.getSession(`
        let sessionDecl = /(const\s+session\s*=\s*await\s+db\.getSession\([^)]+\);)/g;
        let sMatch = sessionDecl.exec(content);
        if (sMatch) {
            content = content.replace(sMatch[1], sMatch[1] + "\n" + authCheck);
        }
    }

    fs.writeFileSync(routePath, content);
    console.log('Fixed auth in', routePath);
  }
});
