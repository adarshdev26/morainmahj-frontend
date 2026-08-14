#!/usr/bin/env node
/**
 * Ensures OneSignal service worker files exist for web push (copied from public/ on build).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const required = ['OneSignalSDKWorker.js', 'OneSignalSDKUpdaterWorker.js'];
const expected = "importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');";

let failed = false;

for (const dir of ['public', 'dist']) {
  for (const name of required) {
    const path = join(root, dir, name);
    if (!existsSync(path)) {
      console.error(`FAIL: missing ${dir}/${name}`);
      failed = true;
      continue;
    }
    const content = readFileSync(path, 'utf8').trim();
    if (!content.includes('OneSignalSDK.sw.js')) {
      console.error(`FAIL: ${dir}/${name} does not import OneSignalSDK.sw.js`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log('OK: OneSignal web push service worker files present in public/ and dist/');
