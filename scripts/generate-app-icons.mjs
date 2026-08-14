/**
 * Generate iOS and Android app icons from the Logo monogram.
 *
 * Android adaptive icons need separate layers:
 * - background: solid navy (via @color/ic_launcher_background)
 * - foreground: white monogram on transparent PNG (no baked-in background)
 *
 * Legacy ic_launcher.png / iOS use the full composite (navy + monogram).
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const NAVY = '#1e2d4d';
/** Pure white monogram — must stay high-contrast on the navy adaptive background. */
const WHITE = '#FFFFFF';

const monogramPaths = `
  <rect x="60" y="4" width="79" height="79"
    transform="rotate(45 60 4)"
    stroke="${WHITE}" stroke-width="1.5" fill="none"/>
  <rect x="60" y="16" width="62" height="62"
    transform="rotate(45 60 16)"
    stroke="${WHITE}" stroke-width="0.75" fill="none"/>
  <text x="60" y="65"
    dominant-baseline="middle"
    text-anchor="middle"
    font-family="Georgia, 'Times New Roman', serif"
    font-weight="300"
    font-size="52"
    fill="${WHITE}">M</text>
`;

/** Monogram group transform: scale + center on 120×120 artboard. */
function monogramGroup(scale) {
  return `<g transform="translate(60 60) scale(${scale}) translate(-60 -60)">
    ${monogramPaths}
  </g>`;
}

/** iOS — full-bleed monogram (looks good on squircle). */
const svgFull = `<svg width="1024" height="1024" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <rect width="120" height="120" fill="${NAVY}"/>
  ${monogramGroup(1)}
</svg>`;

/** Android legacy launcher — padded monogram like other Play Store icons. */
const svgAndroidLauncher = `<svg width="1024" height="1024" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <rect width="120" height="120" fill="${NAVY}"/>
  ${monogramGroup(0.68)}
</svg>`;

/**
 * Adaptive-icon foreground: transparent canvas, monogram in the 66dp safe zone.
 * ~0.56 scale keeps diamond tips inside the circular mask on Pixel launchers.
 */
const svgForeground = `<svg width="108" height="108" viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(54 54) scale(0.56) translate(-60 -60)">
    ${monogramPaths}
  </g>
</svg>`;

const androidSizes = [
  { dir: 'mipmap-mdpi', size: 48, fg: 108 },
  { dir: 'mipmap-hdpi', size: 72, fg: 162 },
  { dir: 'mipmap-xhdpi', size: 96, fg: 216 },
  { dir: 'mipmap-xxhdpi', size: 144, fg: 324 },
  { dir: 'mipmap-xxxhdpi', size: 192, fg: 432 },
];

const resBase = 'android/app/src/main/res';
const iosIconPath =
  'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png';

async function writePng(svg, size, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const buf = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  fs.writeFileSync(dest, buf);
  console.log(`✅ ${dest} (${size}×${size})`);
}

async function generate() {
  // iOS
  await writePng(svgFull, 1024, iosIconPath);

  // Android
  for (const { dir, size, fg } of androidSizes) {
    const base = path.join(resBase, dir);
    await writePng(svgAndroidLauncher, size, path.join(base, 'ic_launcher.png'));
    await writePng(svgAndroidLauncher, size, path.join(base, 'ic_launcher_round.png'));
    await writePng(svgForeground, fg, path.join(base, 'ic_launcher_foreground.png'));
  }

  console.log('\nDone! Icons generated.');
  console.log('Ensure android/.../values/ic_launcher_background.xml uses #1e2d4d');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
