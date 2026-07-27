import sharp from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { TRANSPARENT_OUT, WHITE_BG, writeBrandCoreAssets } from "./brand-asset-utils";

const ROOT = path.join(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "og.png");
const FONT_BOLD = path.join(
  ROOT,
  "node_modules",
  "@fontsource",
  "red-hat-display",
  "files",
  "red-hat-display-latin-700-normal.woff"
);
const FONT_REGULAR = path.join(
  ROOT,
  "node_modules",
  "@fontsource",
  "red-hat-display",
  "files",
  "red-hat-display-latin-400-normal.woff"
);

const WIDTH = 1200;
const HEIGHT = 630;
const BG = "#f6f0e5";

async function fontBase64(filePath: string): Promise<string> {
  const buf = await readFile(filePath);
  return buf.toString("base64");
}

async function main() {
  await writeBrandCoreAssets();

  const [boldB64, regularB64, logoBuf] = await Promise.all([
    fontBase64(FONT_BOLD),
    fontBase64(FONT_REGULAR),
    readFile(TRANSPARENT_OUT),
  ]);

  const logoHeight = 360;
  const logo = await sharp(logoBuf)
    .resize({ height: logoHeight, fit: "contain", background: BG })
    .png()
    .toBuffer();

  const logoMeta = await sharp(logo).metadata();
  const logoWidth = logoMeta.width ?? logoHeight;

  const textSvg = Buffer.from(`<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: 'RHD';
        src: url('data:font/woff;base64,${boldB64}') format('woff');
        font-weight: 700;
      }
      @font-face {
        font-family: 'RHD';
        src: url('data:font/woff;base64,${regularB64}') format('woff');
        font-weight: 400;
      }
    </style>
  </defs>
  <rect x="34" y="34" width="${WIDTH - 68}" height="${HEIGHT - 68}" rx="28" fill="#fbf7ef" stroke="#d9cdb6" stroke-width="2"/>
  <text x="540" y="232" font-family="RHD" font-weight="700" font-size="88" fill="#1f170f">Matomari</text>
  <text x="540" y="292" font-family="RHD" font-weight="400" font-size="34" fill="#6f6356">Japanese learning through language scenes</text>
  <line x1="540" y1="328" x2="1070" y2="328" stroke="#d9cdb6" stroke-width="2"/>
  <text x="540" y="390" font-family="RHD" font-weight="400" font-size="26" fill="#594e42">Listen · Shadow · Recall</text>
  <text x="540" y="438" font-family="RHD" font-weight="400" font-size="26" fill="#594e42">Create scenes · Build fluency · Study daily</text>
</svg>`);

  const logoLeft = 92;
  const logoTop = Math.round((HEIGHT - logoHeight) / 2);

  await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: WHITE_BG,
    },
  })
    .composite([
      { input: logo, left: logoLeft, top: logoTop },
      { input: textSvg, left: 0, top: 0 },
    ])
    .png()
    .toFile(OUT);

  console.log(`Wrote ${OUT} (${WIDTH}x${HEIGHT})`);
  console.log(`Logo: ${logoWidth}x${logoHeight}px at (${logoLeft}, ${logoTop})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
