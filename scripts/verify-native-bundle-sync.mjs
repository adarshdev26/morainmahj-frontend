#!/usr/bin/env node
/**
 * Verifies dist/, android/, and ios/ Capacitor web assets are identical.
 * Run after: npm run build && npx cap sync
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const distAssets = join(root, 'dist/assets');
const androidAssets = join(root, 'android/app/src/main/assets/public/assets');
const iosAssets = join(root, 'ios/App/App/public/assets');

function md5(filePath) {
  return createHash('md5').update(readFileSync(filePath)).digest('hex');
}

function listJsHashes(dir) {
  if (!existsSync(dir)) return null;
  const map = new Map();
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.js')) continue;
    map.set(name, md5(join(dir, name)));
  }
  return map;
}

function entryIndexChunk(platformRoot) {
  const htmlPath = join(platformRoot, 'index.html');
  if (!existsSync(htmlPath)) return null;
  const html = readFileSync(htmlPath, 'utf8');
  const match = html.match(/src="\/assets\/(index-[^"]+\.js)"/);
  return match?.[1] ?? null;
}

const dist = listJsHashes(distAssets);
const android = listJsHashes(androidAssets);
const ios = listJsHashes(iosAssets);

if (!dist) {
  console.error('FAIL: dist/assets missing — run npm run build');
  process.exit(1);
}

let failed = false;

for (const [label, platform] of [
  ['android', android],
  ['ios', ios],
]) {
  if (!platform) {
    console.error(`FAIL: ${label} assets missing — run npx cap sync ${label}`);
    failed = true;
    continue;
  }

  const missingOnPlatform = [...dist.keys()].filter((f) => !platform.has(f));
  const extraOnPlatform = [...platform.keys()].filter((f) => !dist.has(f));
  const hashMismatches = [...dist.keys()].filter(
    (f) => platform.has(f) && platform.get(f) !== dist.get(f),
  );

  if (missingOnPlatform.length) {
    console.error(`FAIL ${label}: missing ${missingOnPlatform.length} chunk(s) from dist`);
    missingOnPlatform.slice(0, 5).forEach((f) => console.error(`  - ${f}`));
    failed = true;
  }
  if (extraOnPlatform.length) {
    console.error(`FAIL ${label}: ${extraOnPlatform.length} stale chunk(s) not in dist`);
    extraOnPlatform.slice(0, 5).forEach((f) => console.error(`  - ${f}`));
    failed = true;
  }
  if (hashMismatches.length) {
    console.error(`FAIL ${label}: ${hashMismatches.length} chunk hash mismatch(es)`);
    hashMismatches.slice(0, 5).forEach((f) => {
      console.error(`  - ${f}: dist=${dist.get(f)} ${label}=${platform.get(f)}`);
    });
    failed = true;
  }
  if (!missingOnPlatform.length && !extraOnPlatform.length && !hashMismatches.length) {
    console.log(`OK ${label}: ${platform.size} JS chunks match dist/`);
  }
}

for (const [label, assetsDir, platformRoot] of [
  ['dist', distAssets, join(root, 'dist')],
  ['android', androidAssets, join(root, 'android/app/src/main/assets/public')],
  ['ios', iosAssets, join(root, 'ios/App/App/public')],
]) {
  const chunk = entryIndexChunk(platformRoot);
  if (!chunk) continue;
  const text = readFileSync(join(assetsDir, chunk), 'utf8');
  const hasAndroidOrigin = text.includes('https://localhost');
  const hasIosOrigin = text.includes('capacitor://localhost');
  console.log(
    `${label} main ${chunk}: androidOrigin=${hasAndroidOrigin} iosOrigin=${hasIosOrigin}`,
  );
}

const checkinChunks = [...dist.keys()].filter(
  (n) => n.startsWith('CheckIn-') && !n.includes('Button'),
);
if (checkinChunks.length) {
  const name = checkinChunks[0];
  console.log(`CheckIn chunk: ${name}`);
  for (const [label, platform] of [
    ['dist', dist],
    ['android', android],
    ['ios', ios],
  ]) {
    if (!platform?.has(name)) continue;
    const text = readFileSync(
      join(
        label === 'dist'
          ? distAssets
          : label === 'android'
            ? androidAssets
            : iosAssets,
        name,
      ),
      'utf8',
    );
    console.log(
      `  ${label}: md5=${platform.get(name)} backToHome=${text.includes('Back to Home')} checkInAnother=${text.includes('Check In Another')}`,
    );
  }
}

if (failed) process.exit(1);
console.log('PASS: native bundles are in sync with dist/');
