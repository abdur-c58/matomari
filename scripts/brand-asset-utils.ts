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
/** Light washi — matches `--background` in globals.css */
export const WASHI_BG: RgbaBackground = { r: 210, g: 197, b: 164, alpha: 1 };

function sampleCornerBackground(
  data: Buffer,
  width: number,
  height: number,
  channels: number
): { r: number; g: number; b: number } {
  const points = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width / 2), 0],
    [0, Math.floor(height / 2)],
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const [x, y] of points) {
    const i = (y * width + x) * channels;
    r += data[i] ?? 0;
    g += data[i + 1] ?? 0;
    b += data[i + 2] ?? 0;
  }
  const n = points.length;
  return { r: r / n, g: g / n, b: b / n };
}

function colorDistance(
  r: number,
  g: number,
  b: number,
  bg: { r: number; g: number; b: number }
) {
  return Math.hypot(r - bg.r, g - bg.g, b - bg.b);
}

/** Remove baked-in checkerboard transparency previews (common AI export artifact). */
export async function stripCheckerboard(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const nearWhite = r > 235 && g > 235 && b > 235;
    const nearGray =
      Math.abs(r - g) < 12 &&
      Math.abs(g - b) < 12 &&
      r > 175 &&
      r < 245;
    if (nearWhite || nearGray) {
      data[i + 3] = 0;
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

/**
 * Derive a real alpha logo from the parchment source — keeps the ink gradient,
 * drops the paper background.
 */
export async function extractLogoFromSource(
  source: Buffer,
  tolerance = 48
): Promise<Buffer> {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bg = sampleCornerBackground(data, info.width, info.height, info.channels);

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const a = data[i + 3] ?? 255;
    if (a < 8 || colorDistance(r, g, b, bg) < tolerance) {
      data[i + 3] = 0;
    } else {
      data[i + 3] = 255;
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

export async function resizeSquare(source: Buffer, size: number): Promise<Buffer> {
  return sharp(source)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

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

  const source = await readFile(SOURCE);
  const extractedTransparent = await extractLogoFromSource(source);
  const transparent = await stripCheckerboard(extractedTransparent);
  const squareSource = await padToSquare(source, PARCHMENT_BG, 0.04);
  const squareTransparent = await padToSquare(transparent, {
    r: 0,
    g: 0,
    b: 0,
    alpha: 0,
  });
  const faviconSource = await padToSquare(transparent, PARCHMENT_BG, 0.12);

  await writeFile(TRANSPARENT_OUT, transparent);
  await writeFile(TRIMMED_OUT, transparent);
  await writeFile(SQUARE_OUT, squareTransparent);
  await writeFile(FAVICON_SOURCE_OUT, faviconSource);

  return {
    source,
    squareSource,
    transparent,
    trimmed: transparent,
    squareTransparent,
    faviconSource,
  };
}
