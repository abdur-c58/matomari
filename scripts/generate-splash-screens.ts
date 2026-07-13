import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  APPLE_SPLASH_SCREENS,
  type SplashTheme,
} from "../lib/constants/apple-splash-screens";

const ROOT = path.join(import.meta.dirname, "..");
const PWA_SOURCE = path.join(ROOT, "public", "logonew.png");
const SPLASH_DIR = path.join(ROOT, "public", "splash");

type RgbaBackground = { r: number; g: number; b: number; alpha: number };

const WHITE_BG: RgbaBackground = { r: 255, g: 255, b: 255, alpha: 1 };
const BLACK_BG: RgbaBackground = { r: 0, g: 0, b: 0, alpha: 1 };

const LOGO_SCALE = 0.22;

async function prepareLogoSource(background: RgbaBackground): Promise<Buffer> {
  const trimmed = await sharp(PWA_SOURCE).trim({ threshold: 12 }).toBuffer();
  const meta = await sharp(trimmed).metadata();
  const maxDim = Math.max(meta.width ?? 0, meta.height ?? 0);
  const outer = Math.max(8, Math.round(maxDim * 0.055));

  return sharp(trimmed)
    .resize(maxDim, maxDim, { fit: "contain", background, kernel: sharp.kernel.lanczos3 })
    .extend({ top: outer, bottom: outer, left: outer, right: outer, background })
    .png()
    .toBuffer();
}

/** Dark splash: white logo on black (invert trimmed logo). */
async function prepareDarkLogo(): Promise<Buffer> {
  const trimmed = await sharp(PWA_SOURCE).trim({ threshold: 12 }).toBuffer();
  const meta = await sharp(trimmed).metadata();
  const maxDim = Math.max(meta.width ?? 0, meta.height ?? 0);
  const outer = Math.max(8, Math.round(maxDim * 0.055));

  return sharp(trimmed)
    .resize(maxDim, maxDim, { fit: "contain", background: BLACK_BG, kernel: sharp.kernel.lanczos3 })
    .extend({ top: outer, bottom: outer, left: outer, right: outer, background: BLACK_BG })
    .negate({ alpha: false })
    .png()
    .toBuffer();
}

async function renderSplash(
  width: number,
  height: number,
  background: RgbaBackground,
  logoSource: Buffer
): Promise<Buffer> {
  const logoSize = Math.round(Math.min(width, height) * LOGO_SCALE);
  const logo = await sharp(logoSource)
    .resize(logoSize, logoSize, {
      fit: "contain",
      background,
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();

  return sharp({
    create: { width, height, channels: 4, background },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 6, adaptiveFiltering: true })
    .toBuffer();
}

async function generateTheme(
  theme: SplashTheme,
  background: RgbaBackground,
  logoSource: Buffer
) {
  const outDir = path.join(SPLASH_DIR, theme);
  await mkdir(outDir, { recursive: true });

  for (const screen of APPLE_SPLASH_SCREENS) {
    const buffer = await renderSplash(screen.width, screen.height, background, logoSource);
    const filename = `${screen.id}.png`;
    await writeFile(path.join(outDir, filename), buffer);
    console.log(`Wrote public/splash/${theme}/${filename}`);
  }
}

async function main() {
  const lightLogo = await prepareLogoSource(WHITE_BG);
  const darkLogo = await prepareDarkLogo();

  await generateTheme("light", WHITE_BG, lightLogo);
  await generateTheme("dark", BLACK_BG, darkLogo);

  console.log(`Generated ${APPLE_SPLASH_SCREENS.length * 2} splash screens.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
