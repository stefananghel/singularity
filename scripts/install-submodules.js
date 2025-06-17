const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '../src');

function installRecursively(dir) {
  // Skip node_modules
  if (path.basename(dir) === 'node_modules') return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  if (entries.some(entry => entry.name === 'package.json')) {
    console.log(`Installing dependencies in ${dir}`);
    execSync('npm install', { stdio: 'inherit', cwd: dir });
  }

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      installRecursively(path.join(dir, entry.name));
    }
  }
}

installRecursively(baseDir);
