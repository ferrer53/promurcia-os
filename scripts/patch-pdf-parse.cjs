const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules', 'pdf-parse', 'index.js');
if (!fs.existsSync(file)) {
  console.log('pdf-parse not installed, skipping patch');
  process.exit(0);
}

let src = fs.readFileSync(file, 'utf8');
const before = 'let isDebugMode = !module.parent;';
const after = 'let isDebugMode = false;';

if (src.includes(after)) {
  console.log('pdf-parse already patched');
  process.exit(0);
}

if (!src.includes(before)) {
  console.warn('pdf-parse index.js does not match expected pattern, skipping patch');
  process.exit(0);
}

src = src.replace(before, after);
fs.writeFileSync(file, src, 'utf8');
console.log('pdf-parse patched to disable debug test block');
