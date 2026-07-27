import sharp from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "public", "readmeimage.png");
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
const BG = "#000000";

async function fontBase64(filePath: string): Promise<string> {
  const buf = await readFile(filePath);
  return buf.toString("base64");
}

async function main() {
  const [boldB64, regularB64, logoBuf] = await Promise.all([
    fontBase64(FONT_BOLD),
    fontBase64(FONT_REGULAR),
    readFile(SOURCE),
  ]);

  const logoHeight = 380;
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
  <rect x="0" y="${HEIGHT - 4}" width="${WIDTH / 4}" height="4" fill="#3b82f6"/>
  <rect x="${WIDTH / 4}" y="${HEIGHT - 4}" width="${WIDTH / 4}" height="4" fill="#8b5cf6"/>
  <rect x="${WIDTH / 2}" y="${HEIGHT - 4}" width="${WIDTH / 4}" height="4" fill="#f59e0b"/>
  <rect x="${(WIDTH * 3) / 4}" y="${HEIGHT - 4}" width="${WIDTH / 4}" height="4" fill="#10b981"/>
  <text x="560" y="248" font-family="RHD" font-weight="700" font-size="88" fill="#ffffff">Matomari</text>
  <text x="560" y="312" font-family="RHD" font-weight="400" font-size="36" fill="#a3a3a3">Japanese Learning</text>
  <line x1="560" y1="348" x2="1120" y2="348" stroke="#262626" stroke-width="2"/>
  <text x="560" y="404" font-family="RHD" font-weight="400" font-size="28" fill="#737373">Personalized Japanese learning through language scenes</text>
  <text x="560" y="468" font-family="RHD" font-weight="400" font-size="22" fill="#525252">Listen · Shadow · Recall · Language scenes</text>
</svg>`);

  const logoLeft = 80;
  const logoTop = Math.round((HEIGHT - logoHeight) / 2);

  await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: BG,
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
