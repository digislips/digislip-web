const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const { buildManifest, generateIconSet } = require('./generate-icons');

describe('buildManifest', () => {
  test('includes brand name, theme color, and icon entries', () => {
    const manifest = buildManifest();

    expect(manifest.name).toBe('DigiSlips');
    expect(manifest.short_name).toBe('DigiSlips');
    expect(manifest.theme_color).toBe('#1558FF');
    expect(manifest.background_color).toBe('#1558FF');
    expect(manifest.icons).toEqual([
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ]);
  });
});

describe('generateIconSet', () => {
  let sourceDir;
  let outDir;
  let sourceIconPath;
  let sourceMonochromePath;

  beforeAll(async () => {
    sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'digislip-icon-src-'));
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'digislip-icon-out-'));
    sourceIconPath = path.join(sourceDir, 'icon.png');
    sourceMonochromePath = path.join(sourceDir, 'mono.png');

    // Synthetic fixtures standing in for the real brand assets: a flat
    // 1024x1024 square (source icon) and a white circle on transparency
    // (source silhouette), just enough to exercise resize/composite.
    await sharp({
      create: { width: 1024, height: 1024, channels: 4, background: { r: 21, g: 88, b: 255, alpha: 1 } },
    }).png().toFile(sourceIconPath);

    const circle = Buffer.from(
      '<svg width="1024" height="1024"><circle cx="512" cy="512" r="400" fill="white"/></svg>'
    );
    await sharp(circle).png().toFile(sourceMonochromePath);

    await generateIconSet({ sourceIconPath, sourceMonochromePath, outDir });
  });

  test('writes large icons resized from the source icon', async () => {
    const expected = {
      'apple-touch-icon.png': 180,
      'icon-192.png': 192,
      'icon-512.png': 512,
    };

    for (const [file, size] of Object.entries(expected)) {
      const meta = await sharp(path.join(outDir, file)).metadata();
      expect(meta.width).toBe(size);
      expect(meta.height).toBe(size);
      expect(meta.format).toBe('png');
    }
  });

  test('writes small favicon PNGs composited onto the gradient', async () => {
    for (const size of [16, 32, 48]) {
      const meta = await sharp(path.join(outDir, `favicon-${size}x${size}.png`)).metadata();
      expect(meta.width).toBe(size);
      expect(meta.height).toBe(size);
    }
  });

  test('bundles the small favicon sizes into a multi-res favicon.ico', () => {
    const icoPath = path.join(outDir, 'favicon.ico');
    expect(fs.existsSync(icoPath)).toBe(true);
    // ICO files start with a fixed 4-byte reserved/type header: 00 00 01 00
    const header = fs.readFileSync(icoPath).subarray(0, 4);
    expect(header).toEqual(Buffer.from([0x00, 0x00, 0x01, 0x00]));
  });
});
