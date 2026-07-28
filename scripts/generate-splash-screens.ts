import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { APPLE_SPLASH_SCREENS } from "../lib/constants/apple-splash-screens";
import {
  SPLASH_DIR,
  WASHI_BG,
  writeBrandCoreAssets,
} from "./brand-asset-utils";

const LOGO_SCALE = 0.22;

const WASHI_GRAIN_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
  <filter id="n">
    <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.18 0 0 0 0 0.14 0 0 0 0 0.08 0 0 0 0.55 0"/>
  </filter>
  <rect width="256" height="256" filter="url(#n)"/>
</svg>`;

async function washiBackground(width: number, height: number): Promise<Buffer> {
  const base = await sharp({
    create: { width, height, channels: 4, background: WASHI_BG },
  })
    .png()
    .toBuffer();

  const grain = await sharp(Buffer.from(WASHI_GRAIN_SVG))
    .resize(width, height, { fit: "fill" })
    .ensureAlpha()
    .png()
    .toBuffer();

  return sharp(base)
    .composite([{ input: grain, blend: "multiply" }])
    .png()
    .toBuffer();
}

async function renderSplash(
  width: number,
  height: number,
  logoSource: Buffer
): Promise<Buffer> {
  const logoSize = Math.round(Math.min(width, height) * LOGO_SCALE);
  const logo = await sharp(logoSource)
    .resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();

  const background = await washiBackground(width, height);

  return sharp(background)
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 6, adaptiveFiltering: true })
    .toBuffer();
}

async function main() {
  const { squareTransparent: logo } = await writeBrandCoreAssets();
  const outDir = path.join(SPLASH_DIR, "light");
  await mkdir(outDir, { recursive: true });

  for (const screen of APPLE_SPLASH_SCREENS) {
    const buffer = await renderSplash(screen.width, screen.height, logo);
    const filename = `${screen.id}.png`;
    await writeFile(path.join(outDir, filename), buffer);
    console.log(`Wrote public/splash/light/${filename}`);
  }

  console.log(`Generated ${APPLE_SPLASH_SCREENS.length} light washi splash screens.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
