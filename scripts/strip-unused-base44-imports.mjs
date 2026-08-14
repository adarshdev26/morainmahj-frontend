import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '../src');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'migration_export') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

let n = 0;
for (const file of walk(SRC)) {
  if (file.replace(/\\/g, '/').endsWith('/api/base44Client.js')) continue;
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes("from '@/api/base44Client'") && !text.includes('from "@/api/base44Client"')) {
    continue;
  }
  if (/\bbase44\./.test(text)) {
    console.log('KEEP', path.relative(path.resolve(SRC, '..'), file));
    continue;
  }
  const next = text.replace(
    /import\s*\{\s*base44\s*\}\s*from\s*['"]@\/api\/base44Client['"];?\r?\n?/,
    '',
  );
  if (next !== text) {
    fs.writeFileSync(file, next);
    n += 1;
    console.log('stripped', path.relative(path.resolve(SRC, '..'), file));
  }
}
console.log(`stripped ${n} files`);
