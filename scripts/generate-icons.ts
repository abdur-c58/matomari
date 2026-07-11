import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "public", "logonew.png");
const ICONS_DIR = path.join(ROOT, "public", "icons");
const APP_DIR = path.join(ROOT, "app");

const SIZES = {
  "favicon-16.png": 16,
  "favicon-32.png": 32,
  "favicon-48.png": 48,
  "apple-touch-icon.png": 180,
  "icon-192.png": 192,
  "icon-512.png": 512,
} as const;

async function renderIcon(size: number, paddingRatio = 0.06) {
  const padding = Math.round(size * paddingRatio);
  const inner = size - padding * 2;

  return sharp(SOURCE)
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  await mkdir(ICONS_DIR, { recursive: true });

  for (const [filename, size] of Object.entries(SIZES)) {
    const buffer = await renderIcon(size);
    await writeFile(path.join(ICONS_DIR, filename), buffer);
    console.log(`Wrote public/icons/${filename} (${size}x${size})`);
  }

  const appIcon = await renderIcon(32);
  await writeFile(path.join(APP_DIR, "icon.png"), appIcon);
  console.log("Wrote app/icon.png (32x32)");

  const appleIcon = await renderIcon(180);
  await writeFile(path.join(APP_DIR, "apple-icon.png"), appleIcon);
  console.log("Wrote app/apple-icon.png (180x180)");

  const favicon32 = await renderIcon(32);
  const favicon16 = await renderIcon(16);
  try {
    const toIco = (await import("to-ico")).default;
    const ico = await toIco([favicon16, favicon32]);
    await writeFile(path.join(APP_DIR, "favicon.ico"), ico);
    await writeFile(path.join(ROOT, "public", "favicon.ico"), ico);
    console.log("Wrote app/favicon.ico and public/favicon.ico");
  } catch {
    await writeFile(path.join(APP_DIR, "favicon.ico"), favicon32);
    console.log("Wrote app/favicon.ico (32px PNG fallback)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
