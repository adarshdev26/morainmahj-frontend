/**
 * Historical helper: replace base44.functions.invoke(...) with callAction(...) → /api/actions/*.
 *
 * callAction returns the bare JSON body (not { data, status }).
 *
 * Usage:
 *   node scripts/migrate-functions-to-rest.mjs --all
 *   node scripts/migrate-functions-to-rest.mjs src/pages/Home.jsx
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'migration_export') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function stillNeedsBase44(source) {
  return (
    /base44\.(auth|integrations|users)\./.test(source) ||
    /base44\.entities\./.test(source) ||
    /base44\.functions\./.test(source)
  );
}

function ensureCallActionImport(source) {
  if (source.includes('callAction') && source.includes("from '@/services/actions'")) {
    return source;
  }
  const line = `import { callAction } from '@/services/actions';`;
  if (source.includes("from '@/services/actions'")) {
    return source.replace(
      /import\s*\{([^}]+)\}\s*from\s*['"]@\/services\/actions['"];?/,
      (full, inner) => {
        if (inner.includes('callAction')) return full;
        return `import { ${inner.trim().replace(/,\s*$/, '')}, callAction } from '@/services/actions';`;
      },
    );
  }
  if (source.includes("from '@/api/base44Client'")) {
    return source.replace(
      /import\s*\{\s*base44\s*\}\s*from\s*['"]@\/api\/base44Client['"];?/,
      (m) => `${m}\n${line}`,
    );
  }
  return source.replace(/^(import .+\r?\n)/m, `$1${line}\n`);
}

function maybeDropBase44Import(source) {
  if (stillNeedsBase44(source)) return source;
  return source.replace(
    /import\s*\{\s*base44\s*\}\s*from\s*['"]@\/api\/base44Client['"];?\r?\n?/,
    '',
  );
}

function transform(source) {
  if (!source.includes('base44.functions.invoke')) {
    return { source, changed: false };
  }

  let next = source.replace(/base44\.functions\.invoke\(/g, 'callAction(');
  next = ensureCallActionImport(next);
  next = maybeDropBase44Import(next);
  return { source: next, changed: next !== source };
}

function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--all');
  const all = process.argv.includes('--all');
  const files = all ? walk(SRC) : args.map((a) => path.resolve(ROOT, a));

  if (!files.length) {
    console.error('Pass --all or one or more file paths');
    process.exit(1);
  }

  let changedCount = 0;
  for (const file of files) {
    const before = fs.readFileSync(file, 'utf8');
    const { source, changed } = transform(before);
    if (!changed) continue;
    fs.writeFileSync(file, source);
    changedCount += 1;
    console.log('updated', path.relative(ROOT, file));
  }
  console.log(`Done. ${changedCount} file(s) changed.`);
}

main();
