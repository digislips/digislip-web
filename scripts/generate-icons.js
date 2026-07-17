const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const LARGE_SIZES = [
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
];

const SMALL_SIZES = [16, 32, 48];

// Both source assets bake in Android's adaptive-icon safe-zone padding
// (the receipt only fills ~52% of the 1024px canvas). Crop to the
// receipt's bounding box plus ~30% breathing room so it actually fills
// the square icon instead of floating in a sea of gradient.
const RECEIPT_CROP = { left: 158, top: 146, width: 706, height: 706 };

function buildManifest() {
  return {
    name: 'DigiSlips',
    short_name: 'DigiSlips',
    theme_color: '#1558FF',
    background_color: '#1558FF',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}

function gradientSquareSvg(size) {
  return Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1558FF"/>
          <stop offset="100%" stop-color="#00C96A"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#g)"/>
    </svg>
  `);
}

// Minimal ICO container: a header, one 16-byte directory entry per image,
// then the raw PNG bytes for each — the modern (Vista+) PNG-in-ICO format
// that every current OS/browser reads, without needing an ICO-encoding lib.
function buildIco(images) {
  const HEADER_SIZE = 6;
  const ENTRY_SIZE = 16;
  const header = Buffer.alloc(HEADER_SIZE);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = HEADER_SIZE + ENTRY_SIZE * images.length;
  const entries = [];
  for (const { size, buffer } of images) {
    const entry = Buffer.alloc(ENTRY_SIZE);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height (0 means 256)
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset from start of file
    entries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.buffer)]);
}

async function makeSmallFavicon(sourceMonochromePath, size) {
  const glyphSize = Math.round(size * 0.92);
  const glyph = await sharp(sourceMonochromePath)
    .extract(RECEIPT_CROP)
    .resize(glyphSize, glyphSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .tint('#FEFDFB')
    .toBuffer();

  return sharp(gradientSquareSvg(size))
    .composite([{ input: glyph, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function generateIconSet({ sourceIconPath, sourceMonochromePath, outDir }) {
  fs.mkdirSync(outDir, { recursive: true });

  await Promise.all(
    LARGE_SIZES.map(({ file, size }) =>
      sharp(sourceIconPath).extract(RECEIPT_CROP).resize(size, size).png().toFile(path.join(outDir, file))
    )
  );

  const smallBuffers = await Promise.all(
    SMALL_SIZES.map((size) => makeSmallFavicon(sourceMonochromePath, size))
  );

  await Promise.all(
    SMALL_SIZES.map((size, i) =>
      fs.promises.writeFile(path.join(outDir, `favicon-${size}x${size}.png`), smallBuffers[i])
    )
  );

  const icoBuffer = buildIco(SMALL_SIZES.map((size, i) => ({ size, buffer: smallBuffers[i] })));
  await fs.promises.writeFile(path.join(outDir, 'favicon.ico'), icoBuffer);
}

function iconHeadTags() {
  return [
    '<link rel="icon" href="/favicon.ico" sizes="32x32">',
    '<link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16">',
    '<link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
    '<meta name="theme-color" content="#1558FF">',
  ]
    .map((line) => `  ${line}`)
    .join('\n');
}

module.exports = { buildManifest, generateIconSet, iconHeadTags };
