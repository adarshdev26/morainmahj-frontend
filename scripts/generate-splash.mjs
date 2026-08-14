import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const navy = '#1e2d4d';
const navyLight = '#253660';
const white = '#e8eaf0';

const splashSvg = `<svg width="2732" height="2732" viewBox="0 0 2732 2732" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="diamonds" x="0" y="0" width="180" height="180" patternUnits="userSpaceOnUse">
      <rect width="180" height="180" fill="${navy}"/>
      <rect x="90" y="0" width="127" height="127" transform="rotate(45 90 0)" fill="none" stroke="${navyLight}" stroke-width="1.5" opacity="0.5"/>
    </pattern>
  </defs>
  <rect width="2732" height="2732" fill="url(#diamonds)"/>
  <svg x="966" y="966" width="800" height="800" viewBox="0 0 120 120" fill="none">
    <rect x="60" y="4" width="79" height="79"
      transform="rotate(45 60 4)"
      stroke="${white}" stroke-width="1.5" fill="none"/>
    <rect x="60" y="16" width="62" height="62"
      transform="rotate(45 60 16)"
      stroke="${white}" stroke-width="0.75" fill="none"/>
    <text x="50%" y="54%"
      dominant-baseline="middle"
      text-anchor="middle"
      font-family="serif"
      font-weight="300"
      font-size="52"
      fill="${white}">M</text>
  </svg>
</svg>`;

const targets = [
  { dir: 'android/app/src/main/res/drawable',          w: 2732, h: 2732 },
  { dir: 'android/app/src/main/res/drawable-land-hdpi', w: 1920, h: 1280 },
  { dir: 'android/app/src/main/res/drawable-land-mdpi', w: 1280, h: 800  },
  { dir: 'android/app/src/main/res/drawable-land-xhdpi',  w: 1920, h: 1280 },
  { dir: 'android/app/src/main/res/drawable-land-xxhdpi', w: 1920, h: 1280 },
  { dir: 'android/app/src/main/res/drawable-land-xxxhdpi',w: 1920, h: 1280 },
  { dir: 'android/app/src/main/res/drawable-port-hdpi',   w: 1080, h: 1920 },
  { dir: 'android/app/src/main/res/drawable-port-mdpi',   w: 800,  h: 1280 },
  { dir: 'android/app/src/main/res/drawable-port-xhdpi',  w: 1080, h: 1920 },
  { dir: 'android/app/src/main/res/drawable-port-xxhdpi', w: 1080, h: 1920 },
  { dir: 'android/app/src/main/res/drawable-port-xxxhdpi',w: 1080, h: 1920 },
];

async function generate() {
  for (const { dir, w, h } of targets) {
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, 'splash.png');

    await sharp(Buffer.from(splashSvg))
      .resize(w, h)
      .png()
      .toFile(dest);

    console.log(`✅ ${dest} (${w}x${h})`);
  }
  console.log('\nAll splash screens generated!');
}

generate().catch(console.error);
