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

  // We are looking for something like:
  // const session = await db.getSession(sessionId);
  // if (!session) { ... }
  
  // We can insert our auth check after `if (!session) { ... }`
  if (content.includes('await db.getSession(') && !content.includes("error: 'Unauthorized access to session'")) {
    const lines = content.split('\n');
    let injectIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('await db.getSession(')) {
        // Find end of the null check
        for (let j = i + 1; j < i + 10; j++) {
          if (lines[j] && lines[j].includes('return NextResponse.json') && lines[j].includes('not found')) {
            // Find the closing brace of the if statement
            for (let k = j; k < j + 5; k++) {
              if (lines[k] && lines[k].includes('}')) {
                injectIndex = k + 1;
                break;
              }
            }
            break;
          }
        }
        break;
      }
    }
    
    if (injectIndex !== -1) {
      lines.splice(injectIndex, 0, authCheck);
      fs.writeFileSync(routePath, lines.join('\n'));
      console.log('Patched', routePath);
    } else {
       // if there's no null check, just inject right after `await db.getSession`
       for (let i = 0; i < lines.length; i++) {
         if (lines[i].includes('await db.getSession(')) {
            lines.splice(i + 1, 0, authCheck);
            fs.writeFileSync(routePath, lines.join('\n'));
            console.log('Patched without null check', routePath);
            break;
         }
       }
    }
  }
});
