import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const PWA_SOURCE = path.join(ROOT, "public", "logonew.png");
const TAB_SOURCE = path.join(ROOT, "public", "readmeimage.png");
const ICONS_DIR = path.join(ROOT, "public", "icons");
const APP_DIR = path.join(ROOT, "app");

const WHITE_BG = { r: 255, g: 255, b: 255, alpha: 1 } as const;
const BLACK_BG = { r: 0, g: 0, b: 0, alpha: 1 } as const;

const PWA_SIZES = {
  "favicon-48.png": 48,
  "apple-touch-icon.png": 180,
  "icon-192.png": 192,
  "icon-512.png": 512,
} as const;

const TAB_SIZES = {
  "favicon-16.png": 16,
  "favicon-32.png": 32,
} as const;

async function renderIcon(
  source: string,
  size: number,
  background: typeof WHITE_BG,
  paddingRatio = 0.06
) {
  const padding = Math.round(size * paddingRatio);
  const inner = size - padding * 2;

  return sharp(source)
    .resize(inner, inner, {
      fit: "contain",
      background,
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  await mkdir(ICONS_DIR, { recursive: true });

  for (const [filename, size] of Object.entries(PWA_SIZES)) {
    const buffer = await renderIcon(PWA_SOURCE, size, WHITE_BG);
    await writeFile(path.join(ICONS_DIR, filename), buffer);
    console.log(`Wrote public/icons/${filename} (${size}x${size}, logonew)`);
  }

  for (const [filename, size] of Object.entries(TAB_SIZES)) {
    const buffer = await renderIcon(TAB_SOURCE, size, BLACK_BG);
    await writeFile(path.join(ICONS_DIR, filename), buffer);
    console.log(`Wrote public/icons/${filename} (${size}x${size}, readmeimage)`);
  }

  const appIcon = await renderIcon(TAB_SOURCE, 32, BLACK_BG);
  await writeFile(path.join(APP_DIR, "icon.png"), appIcon);
  console.log("Wrote app/icon.png (32x32, readmeimage)");

  const appleIcon = await renderIcon(PWA_SOURCE, 180, WHITE_BG);
  await writeFile(path.join(APP_DIR, "apple-icon.png"), appleIcon);
  console.log("Wrote app/apple-icon.png (180x180, logonew)");

  const favicon32 = await renderIcon(TAB_SOURCE, 32, BLACK_BG);
  const favicon16 = await renderIcon(TAB_SOURCE, 16, BLACK_BG);
  try {
    const toIco = (await import("to-ico")).default;
    const ico = await toIco([favicon16, favicon32]);
    await writeFile(path.join(APP_DIR, "favicon.ico"), ico);
    await writeFile(path.join(ROOT, "public", "favicon.ico"), ico);
    console.log("Wrote app/favicon.ico and public/favicon.ico (readmeimage)");
  } catch {
    await writeFile(path.join(APP_DIR, "favicon.ico"), favicon32);
    console.log("Wrote app/favicon.ico (32px PNG fallback, readmeimage)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
