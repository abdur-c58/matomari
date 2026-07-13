import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const PWA_SOURCE = path.join(ROOT, "public", "logonew.png");
const TAB_SOURCE = path.join(ROOT, "public", "readmeimage.png");
const ICONS_DIR = path.join(ROOT, "public", "icons");
const APP_DIR = path.join(ROOT, "app");

type RgbaBackground = { r: number; g: number; b: number; alpha: number };

const WHITE_BG: RgbaBackground = { r: 255, g: 255, b: 255, alpha: 1 };
const BLACK_BG: RgbaBackground = { r: 0, g: 0, b: 0, alpha: 1 };

/** Outer breathing room after trim — keeps maskable icons from feeling cramped. */
const PWA_OUTER_MARGIN_RATIO = 0.055;
const TAB_PADDING_RATIO = 0.06;

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

/** Trim whitespace, center on square canvas, add a small uniform margin. */
async function preparePwaSource(source: string, background: RgbaBackground): Promise<Buffer> {
  const trimmed = await sharp(source).trim({ threshold: 12 }).toBuffer();
  const meta = await sharp(trimmed).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const maxDim = Math.max(width, height);
  const outer = Math.max(8, Math.round(maxDim * PWA_OUTER_MARGIN_RATIO));

  return sharp(trimmed)
    .resize(maxDim, maxDim, {
      fit: "contain",
      background,
      kernel: sharp.kernel.lanczos3,
    })
    .extend({
      top: outer,
      bottom: outer,
      left: outer,
      right: outer,
      background,
    })
    .png()
    .toBuffer();
}

async function renderIcon(
  source: string | Buffer,
  size: number,
  background: RgbaBackground,
  paddingRatio = 0
) {
  const padding = Math.round(size * paddingRatio);
  const inner = size - padding * 2;

  return sharp(source)
    .resize(inner, inner, {
      fit: "contain",
      background,
      kernel: sharp.kernel.lanczos3,
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background,
    })
    .png({ compressionLevel: 6, adaptiveFiltering: true })
    .toBuffer();
}

async function main() {
  await mkdir(ICONS_DIR, { recursive: true });

  const pwaPrepared = await preparePwaSource(PWA_SOURCE, WHITE_BG);
  const preparedMeta = await sharp(pwaPrepared).metadata();
  console.log(
    `Prepared logonew canvas: ${preparedMeta.width}x${preparedMeta.height} (trim + ${PWA_OUTER_MARGIN_RATIO * 100}% margin)`
  );

  for (const [filename, size] of Object.entries(PWA_SIZES)) {
    const buffer = await renderIcon(pwaPrepared, size, WHITE_BG, 0);
    await writeFile(path.join(ICONS_DIR, filename), buffer);
    console.log(`Wrote public/icons/${filename} (${size}x${size}, logonew)`);
  }

  for (const [filename, size] of Object.entries(TAB_SIZES)) {
    const buffer = await renderIcon(TAB_SOURCE, size, BLACK_BG, TAB_PADDING_RATIO);
    await writeFile(path.join(ICONS_DIR, filename), buffer);
    console.log(`Wrote public/icons/${filename} (${size}x${size}, readmeimage)`);
  }

  const appIcon = await renderIcon(TAB_SOURCE, 32, BLACK_BG, TAB_PADDING_RATIO);
  await writeFile(path.join(APP_DIR, "icon.png"), appIcon);
  console.log("Wrote app/icon.png (32x32, readmeimage)");

  const appleIcon = await renderIcon(pwaPrepared, 180, WHITE_BG, 0);
  await writeFile(path.join(APP_DIR, "apple-icon.png"), appleIcon);
  console.log("Wrote app/apple-icon.png (180x180, logonew)");

  const favicon32 = await renderIcon(TAB_SOURCE, 32, BLACK_BG, TAB_PADDING_RATIO);
  const favicon16 = await renderIcon(TAB_SOURCE, 16, BLACK_BG, TAB_PADDING_RATIO);
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
