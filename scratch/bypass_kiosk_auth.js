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

kioskRoutes.forEach((routePath) => {
  let content = fs.readFileSync(routePath, 'utf8');

  // Match the auth check block regex
  const regex = /if\s*\(\s*process\.env\.NEXT_PUBLIC_MOCK_SERVICES_ENABLED\s*!==\s*'true'\s*\)\s*\{\s*const\s*\{\s*createClient\s*\}\s*=\s*require\('@\/lib\/supabase\/server'\);\s*const\s*supabase\s*=\s*await\s*createClient\(\);\s*const\s*\{\s*data:\s*\{\s*user\s*\}\s*\}\s*=\s*await\s*supabase\.auth\.getUser\(\);\s*if\s*\(\s*!user\s*\|\|\s*user\.id\s*!==\s*session\.patientId\s*\)\s*\{\s*return\s*NextResponse\.json\(\{\s*error:\s*'Unauthorized\s+access\s+to\s+session'\s*\}\s*,\s*\{\s*status:\s*403\s*\}\s*\);\s*\}\s*\}/g;

  if (regex.test(content)) {
    content = content.replace(regex, `if (process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED !== 'true' && process.env.NODE_ENV !== 'development' && process.env.DEMO_ENVIRONMENT !== 'true') {
      const { createClient } = require('@/lib/supabase/server');
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== session.patientId) {
        return NextResponse.json({ error: 'Unauthorized access to session' }, { status: 403 });
      }
    }`);
    fs.writeFileSync(routePath, content);
    console.log('Bypassed auth in:', path.basename(routePath));
  }
});
