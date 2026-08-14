#!/usr/bin/env node
/**
 * Ensures Android App Link intent filters stay correct after `npx cap sync`.
 * Android-only — does not touch iOS or apple-app-site-association.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const manifestPath = join(root, 'android/app/src/main/AndroidManifest.xml');

const WWW_BLOCK = `
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data
                    android:scheme="https"
                    android:host="www.morainmahj.com"
                    android:pathPrefix="/mobile-auth-return" />
            </intent-filter>`;

if (!existsSync(manifestPath)) {
  console.warn('[patch-android-app-links] android manifest not found — run npx cap add android first');
  process.exit(0);
}

let manifest = readFileSync(manifestPath, 'utf8');
let changed = false;

if (manifest.includes('android:host="www.morainmahj.com"')) {
  manifest = manifest.replace(WWW_BLOCK, '');
  changed = true;
}

if (!manifest.includes('android:host="morainmahj.com"')) {
  console.error('[patch-android-app-links] missing morainmahj.com app link intent-filter');
  process.exit(1);
}

if (changed) {
  writeFileSync(manifestPath, manifest, 'utf8');
  console.log('[patch-android-app-links] removed www.morainmahj.com intent-filter');
} else {
  console.log('[patch-android-app-links] AndroidManifest.xml already correct');
}
