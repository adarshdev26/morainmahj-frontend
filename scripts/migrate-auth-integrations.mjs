/**
 * Replace base44.auth / integrations / users / entity.subscribe with REST services.
 *
 * Usage: node scripts/migrate-auth-integrations.mjs --all
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

function ensureImport(source, names, from) {
  const re = new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${from.replace(/[./]/g, '\\$&')}['"];?`);
  const m = source.match(re);
  if (m) {
    const have = new Set(
      m[1]
        .split(',')
        .map((p) => p.trim().split(/\s+as\s+/)[0])
        .filter(Boolean),
    );
    const missing = names.filter((n) => !have.has(n));
    if (!missing.length) return source;
    return source.replace(re, (full, inner) => {
      const trimmed = inner.trim().replace(/,\s*$/, '');
      return `import { ${trimmed}, ${missing.join(', ')} } from '${from}';`;
    });
  }
  const line = `import { ${names.join(', ')} } from '${from}';\n`;
  if (source.includes("from '@/api/base44Client'")) {
    return source.replace(
      /import\s*\{\s*base44\s*\}\s*from\s*['"]@\/api\/base44Client['"];?\r?\n?/,
      (m) => `${m}${line}`,
    );
  }
  return source.replace(/^(import .+\r?\n)/m, `$1${line}`);
}

function stillNeedsBase44(source) {
  return (
    /base44\.(auth|integrations|users|functions|entities)\./.test(source) ||
    /\bbase44\b/.test(source.replace(/from ['"]@\/api\/base44Client['"]/, ''))
  );
}

function transform(source) {
  let next = source;
  let touched = false;

  // integrations
  if (next.includes('base44.integrations.Core.')) {
    next = next.replace(/base44\.integrations\.Core\.UploadFile\(/g, 'uploadFile(');
    next = next.replace(/base44\.integrations\.Core\.UploadPrivateFile\(/g, 'uploadPrivateFile(');
    next = next.replace(/base44\.integrations\.Core\.CreateFileSignedUrl\(/g, 'createFileSignedUrl(');
    next = next.replace(/base44\.integrations\.Core\.SendEmail\(/g, 'sendEmail(');
    const names = [];
    if (next.includes('uploadFile(')) names.push('uploadFile');
    if (next.includes('uploadPrivateFile(')) names.push('uploadPrivateFile');
    if (next.includes('createFileSignedUrl(')) names.push('createFileSignedUrl');
    if (next.includes('sendEmail(')) names.push('sendEmail');
    next = ensureImport(next, names, '@/services/integrationsApi');
    touched = true;
  }

  // users.inviteUser
  if (next.includes('base44.users.inviteUser')) {
    next = next.replace(/base44\.users\.inviteUser\(/g, 'inviteUser(');
    next = ensureImport(next, ['inviteUser'], '@/services/usersApi');
    touched = true;
  }

  // entity.subscribe
  if (/base44\.entities\.\w+\.subscribe\(/.test(next)) {
    next = next.replace(/base44\.entities\.\w+\.subscribe\(/g, 'subscribe(');
    next = ensureImport(next, ['subscribe'], '@/services/realtime');
    touched = true;
  }

  // auth methods
  const authMap = [
    ['base44.auth.me(', 'authMe('],
    ['base44.auth.updateMe(', 'updateMe('],
    ['base44.auth.setToken(', 'setToken('],
    ['base44.auth.isAuthenticated(', 'checkAuthenticated('],
    ['base44.auth.redirectToLogin(', 'redirectToLogin('],
    ['base44.auth.loginViaEmailPassword(', 'loginViaEmailPassword('],
    ['base44.auth.register(', 'register('],
    ['base44.auth.verifyOtp(', 'verifyOtp('],
    ['base44.auth.resetPasswordRequest(', 'resetPasswordRequest('],
    ['base44.auth.signOut(', 'signOut('],
    ['base44.auth.logout(', 'logout('],
  ];

  const authImports = new Set();
  for (const [from, to] of authMap) {
    if (next.includes(from)) {
      next = next.split(from).join(to);
      const importName = to.replace('(', '');
      // authMe is alias for me
      authImports.add(importName === 'authMe' ? 'me as authMe' : importName);
      touched = true;
    }
  }

  if (authImports.size) {
    // Normalize me as authMe when we used authMe(
    const names = [...authImports];
    next = ensureImport(next, names, '@/services/authApi');
  }

  // Drop base44 import if unused
  if (touched && !stillNeedsBase44(next)) {
    next = next.replace(
      /import\s*\{\s*base44\s*\}\s*from\s*['"]@\/api\/base44Client['"];?\r?\n?/,
      '',
    );
  }

  // Fix authMe → use me if we imported me as authMe incorrectly with checkAuthenticated only
  return { source: next, changed: next !== source };
}

function main() {
  const all = process.argv.includes('--all');
  const args = process.argv.slice(2).filter((a) => a !== '--all');
  const files = all ? walk(SRC) : args.map((a) => path.resolve(ROOT, a));

  let n = 0;
  for (const file of files) {
    const norm = file.replace(/\\/g, '/');
    if (norm.endsWith('/api/base44Client.js')) continue;
    if (norm.endsWith('/lib/AuthContext.jsx')) continue;
    if (norm.endsWith('/services/authApi.js')) continue;
    if (!fs.existsSync(file)) continue;
    const before = fs.readFileSync(file, 'utf8');
    const { source, changed } = transform(before);
    if (!changed) continue;
    fs.writeFileSync(file, source);
    n += 1;
    console.log('updated', path.relative(ROOT, file));
  }
  console.log(`done: ${n} files`);
}

main();
