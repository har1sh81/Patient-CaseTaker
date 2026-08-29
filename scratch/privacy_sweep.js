const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  if (!fs.existsSync(dir)) return filelist;
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      walkSync(dirFile, filelist);
    } else if (dirFile.endsWith('.ts') || dirFile.endsWith('.tsx')) {
      filelist.push(dirFile);
    }
  });
  return filelist;
};

const files = [...walkSync('./app/api'), ...walkSync('./lib')];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;

  // Replace console.log containing variables like patient, fhirBundle, etc.
  const lines = content.split('\n');
  const newLines = lines.map(line => {
    if (line.includes('console.log(') || line.includes('console.error(')) {
       if (line.includes('fhirBundle') || line.includes('patient') || line.includes('session') || line.includes('text') || line.includes('transcript')) {
         // If it's a simple error log, keep it. 
         // If it's logging payload, strip the payload.
         if (line.includes('JSON.stringify(')) {
             changed = true;
             return line.replace(/,\s*JSON\.stringify\(.*?\)(?:\.substring\([^)]+\))?\s*\+?\s*'.*?'/g, '')
                        .replace(/,\s*JSON\.stringify\(.*?\)/g, '');
         }
       }
    }
    return line;
  });

  if (changed) {
    fs.writeFileSync(f, newLines.join('\n'));
    console.log('Swept', f);
  }
});
