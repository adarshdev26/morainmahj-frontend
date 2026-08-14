#!/usr/bin/env node
/**
 * Writes public/.well-known/assetlinks.json for Android App Links verification.
 * iOS uses apple-app-site-association instead — this script does not touch that file.
 *
 * Optional in .env.local:
 *   ANDROID_PLAY_APP_SIGNING_SHA256=...  (Play Console → App integrity, if different from upload key)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const outPath = join(root, 'public/.well-known/assetlinks.json');
const PACKAGE_NAME = 'com.base69de6b05c2b11218fcffdf31.app';

const DEFAULT_UPLOAD_KEY_SHA256 =
  '52:4B:0B:AE:CB:6E:53:3C:6D:65:8E:2B:49:37:1B:E6:D9:89:AB:0E:94:0E:CC:4C:B7:1D:27:0B:5F:C6:36:C3';

function loadEnvLocal() {
  const envPath = join(root, '.env.local');
  try {
    const text = readFileSync(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

function normalizeFingerprint(value) {
  const hex = String(value).replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  if (hex.length !== 64) return null;
  return hex.match(/.{2}/g).join(':');
}

loadEnvLocal();

const fingerprints = [];
const playSigning = normalizeFingerprint(process.env.ANDROID_PLAY_APP_SIGNING_SHA256 || '');

for (const fp of [playSigning, DEFAULT_UPLOAD_KEY_SHA256]) {
  if (fp && !fingerprints.includes(fp)) fingerprints.push(fp);
}

const payload = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: PACKAGE_NAME,
      sha256_cert_fingerprints: fingerprints,
    },
  },
];

writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`[generate-assetlinks] wrote ${outPath} (${fingerprints.length} fingerprint(s))`);
