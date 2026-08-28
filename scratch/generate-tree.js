const fs = require('fs');
const path = require('path');

const EXCLUDE_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', 'public'];

function generateTree(dir, prefix = '') {
  let output = '';
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (e) {
    return output;
  }

  // Separate directories and files
  const dirs = [];
  const onlyFiles = [];

  for (const file of files) {
    if (EXCLUDE_DIRS.includes(file)) continue;
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) dirs.push(file);
      else onlyFiles.push(file);
    } catch (e) {
      continue;
    }
  }

  const sortedFiles = [...dirs.sort(), ...onlyFiles.sort()];

  for (let i = 0; i < sortedFiles.length; i++) {
    const file = sortedFiles[i];
    const fullPath = path.join(dir, file);
    const isLast = i === sortedFiles.length - 1;
    const marker = isLast ? '└── ' : '├── ';
    
    output += `${prefix}${marker}${file}\n`;
    
    try {
      if (fs.statSync(fullPath).isDirectory()) {
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        output += generateTree(fullPath, nextPrefix);
      }
    } catch (e) {
      // ignore
    }
  }
  return output;
}

const rootDir = process.cwd();
const tree = 'Patient-TakeCare\n' + generateTree(rootDir);
fs.writeFileSync('project_tree.md', '```text\n' + tree + '\n```\n');
console.log('Tree generated in project_tree.md');
