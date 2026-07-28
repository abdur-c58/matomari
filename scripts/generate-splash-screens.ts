import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  APPLE_SPLASH_SCREENS,
  type SplashTheme,
} from "../lib/constants/apple-splash-screens";
import {
  BLACK_BG,
  SPLASH_DIR,
  WHITE_BG,
  type RgbaBackground,
  writeBrandCoreAssets,
} from "./brand-asset-utils";

const LOGO_SCALE = 0.22;

/** Dark splash: white logo on black (invert trimmed logo). */
async function prepareDarkLogo(): Promise<Buffer> {
  const { squareTransparent } = await writeBrandCoreAssets();

  return sharp(squareTransparent)
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
  const { squareTransparent: lightLogo } = await writeBrandCoreAssets();
  const darkLogo = await prepareDarkLogo();

  await generateTheme("light", WHITE_BG, lightLogo);
  await generateTheme("dark", BLACK_BG, darkLogo);

  console.log(`Generated ${APPLE_SPLASH_SCREENS.length * 2} splash screens.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
