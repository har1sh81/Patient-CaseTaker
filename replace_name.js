const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content
    .replace(/Arumugam Kandasamy/g, 'Ramesh Kumar')
    .replace(/Arumugam/g, 'Ramesh')
    .replace(/Kandasamy/g, 'Kumar')
    .replace(/arumugam\.k/g, 'ramesh.k')
    .replace(/arumugam_/g, 'ramesh_')
    .replace(/arumugam/g, 'ramesh');
    
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Replaced in ${filePath}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (file === 'node_modules' || file === '.next' || file === '.git' || file === '.gemini') {
      continue;
    }
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath);
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.sql') || filePath.endsWith('.md')) {
      replaceInFile(filePath);
    }
  }
}

walk(__dirname);
