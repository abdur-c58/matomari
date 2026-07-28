import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  APP_DIR,
  ICONS_DIR,
  PARCHMENT_BG,
  WHITE_BG,
  BLACK_BG,
  SQUARE_OUT,
  FAVICON_SOURCE_OUT,
  renderIcon,
  writeBrandCoreAssets,
} from "./brand-asset-utils";

const ROOT = path.join(import.meta.dirname, "..");

const TAB_PADDING_RATIO = 0.08;

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

async function main() {
  await mkdir(ICONS_DIR, { recursive: true });
  const { squareTransparent, faviconSource } = await writeBrandCoreAssets();
  const preparedMeta = await sharp(squareTransparent).metadata();
  console.log(`Prepared brand icon canvas: ${preparedMeta.width}x${preparedMeta.height}`);

  for (const [filename, size] of Object.entries(PWA_SIZES)) {
    const buffer = await renderIcon(squareTransparent, size, WHITE_BG, 0);
    await writeFile(path.join(ICONS_DIR, filename), buffer);
    console.log(`Wrote public/icons/${filename} (${size}x${size}, transparent logo)`);
  }

  for (const [filename, size] of Object.entries(TAB_SIZES)) {
    const buffer = await renderIcon(faviconSource, size, PARCHMENT_BG, TAB_PADDING_RATIO);
    await writeFile(path.join(ICONS_DIR, filename), buffer);
    console.log(`Wrote public/icons/${filename} (${size}x${size}, dedicated favicon)`);
  }

  const appIcon = await renderIcon(squareTransparent, 512, {
    r: 0,
    g: 0,
    b: 0,
    alpha: 0,
  });
  await writeFile(path.join(APP_DIR, "icon.png"), appIcon);
  console.log("Wrote app/icon.png (512x512, transparent app icon)");

  const appleIcon = await renderIcon(squareTransparent, 180, WHITE_BG, 0);
  await writeFile(path.join(APP_DIR, "apple-icon.png"), appleIcon);
  console.log("Wrote app/apple-icon.png (180x180, transparent logo)");

  const favicon32 = await renderIcon(FAVICON_SOURCE_OUT, 32, PARCHMENT_BG, TAB_PADDING_RATIO);
  const favicon16 = await renderIcon(FAVICON_SOURCE_OUT, 16, PARCHMENT_BG, TAB_PADDING_RATIO);
  try {
    const toIco = (await import("to-ico")).default;
    const ico = await toIco([favicon16, favicon32]);
    await writeFile(path.join(APP_DIR, "favicon.ico"), ico);
    await writeFile(path.join(ROOT, "public", "favicon.ico"), ico);
    console.log("Wrote app/favicon.ico and public/favicon.ico (dedicated favicon)");
  } catch {
    await writeFile(path.join(APP_DIR, "favicon.ico"), favicon32);
    console.log("Wrote app/favicon.ico (32px PNG fallback, dedicated favicon)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
