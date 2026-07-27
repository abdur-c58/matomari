import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const ROOT = path.join(import.meta.dirname, "..");
export const BRAND_DIR = path.join(ROOT, "public", "brand");
export const ICONS_DIR = path.join(ROOT, "public", "icons");
export const APP_DIR = path.join(ROOT, "app");
export const SPLASH_DIR = path.join(ROOT, "public", "splash");

export const SOURCE = path.join(BRAND_DIR, "matomari-logo-source.png");
export const TRANSPARENT_OUT = path.join(BRAND_DIR, "matomari-logo-transparent.png");
export const TRIMMED_OUT = path.join(BRAND_DIR, "matomari-logo-trimmed.png");
export const SQUARE_OUT = path.join(BRAND_DIR, "matomari-logo-square.png");
export const FAVICON_SOURCE_OUT = path.join(BRAND_DIR, "matomari-logo-favicon-source.png");

export type RgbaBackground = { r: number; g: number; b: number; alpha: number };

export const WHITE_BG: RgbaBackground = { r: 255, g: 255, b: 255, alpha: 1 };
export const BLACK_BG: RgbaBackground = { r: 0, g: 0, b: 0, alpha: 1 };
export const PARCHMENT_BG: RgbaBackground = { r: 246, g: 240, b: 229, alpha: 1 };

export async function padToSquare(
  source: Buffer,
  background: RgbaBackground,
  outerRatio = 0.08
): Promise<Buffer> {
  const meta = await sharp(source).metadata();
  const maxDim = Math.max(meta.width ?? 0, meta.height ?? 0);
  const outer = Math.max(8, Math.round(maxDim * outerRatio));

  return sharp(source)
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

export async function renderIcon(
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
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

export async function writeBrandCoreAssets() {
  await mkdir(BRAND_DIR, { recursive: true });

  // Canonical transparent logo is hand-authored (AI); scripts only derive sizes from it.
  const transparent = await readFile(TRANSPARENT_OUT);
  const squareTransparent = await padToSquare(transparent, {
    r: 0,
    g: 0,
    b: 0,
    alpha: 0,
  });
  const faviconSource = await padToSquare(transparent, PARCHMENT_BG, 0.12);

  await writeFile(TRIMMED_OUT, transparent);
  await writeFile(SQUARE_OUT, squareTransparent);
  await writeFile(FAVICON_SOURCE_OUT, faviconSource);

  return {
    transparent,
    trimmed: transparent,
    squareTransparent,
    faviconSource,
  };
}
