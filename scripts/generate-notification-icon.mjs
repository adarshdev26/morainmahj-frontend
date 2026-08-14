import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Notification icons MUST be white on transparent - Android requirement
const svgNotif = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="60" y="4" width="79" height="79"
    transform="rotate(45 60 4)"
    stroke="white" stroke-width="2" fill="none"/>
  <rect x="60" y="16" width="62" height="62"
    transform="rotate(45 60 16)"
    stroke="white" stroke-width="1" fill="none"/>
  <text x="50%" y="54%"
    dominant-baseline="middle"
    text-anchor="middle"
    font-family="serif"
    font-weight="300"
    font-size="52"
    fill="white">M</text>
</svg>`;

const sizes = [
  { folder: 'drawable-mdpi',    size: 24  },
  { folder: 'drawable-hdpi',    size: 36  },
  { folder: 'drawable-xhdpi',   size: 48  },
  { folder: 'drawable-xxhdpi',  size: 72  },
  { folder: 'drawable-xxxhdpi', size: 96  },
  { folder: 'drawable',         size: 96  },
];

const resBase = 'android/app/src/main/res';

async function generate() {
  for (const { folder, size } of sizes) {
    const dir = path.join(resBase, folder);
    fs.mkdirSync(dir, { recursive: true });

    const dest = path.join(dir, 'ic_stat_onesignal_default.png');
    await sharp(Buffer.from(svgNotif(size)))
      .resize(size, size)
      .png()
      .toFile(dest);

    console.log(`✅ ${dest} (${size}x${size})`);
  }
  console.log('\nNotification icons generated!');
}

generate().catch(console.error);
