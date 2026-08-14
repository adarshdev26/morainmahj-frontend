import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '../src');
const re = /base44\.functions\.invoke\(\s*['"]([^'"]+)['"]/g;
const names = new Set();

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8');
      let m;
      while ((m = re.exec(text))) names.add(m[1]);
    }
  }
}

walk(SRC);
const list = [...names].sort();
console.log(list.join('\n'));
console.log('TOTAL', list.length);
