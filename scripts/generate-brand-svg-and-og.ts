import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import potrace from "potrace";

const ROOT = path.join(import.meta.dirname, "..");
const SRC = path.join(ROOT, "public", "brand", "matomari-logo-transparent.png");
const OUT_SVG = path.join(ROOT, "public", "brand", "matomari-logo.svg");
const OUT_OG_JPG = path.join(ROOT, "public", "og.jpg");
const OUT_OG_APP = path.join(ROOT, "app", "opengraph-image.jpg");
const OUT_TWITTER_APP = path.join(ROOT, "app", "twitter-image.jpg");

function traceSvg(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    potrace.trace(
      buffer,
      {
        color: "#000000",
        background: "transparent",
        threshold: 128,
        turdSize: 40,
        optTolerance: 0.35,
      },
      (err: Error | null, svg: string) => {
        if (err) reject(err);
        else resolve(svg);
      }
    );
  });
}

async function makeSvg() {
  const mask = await sharp(SRC)
    .ensureAlpha()
    .resize({ width: 1200, withoutEnlargement: true })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .greyscale()
    .normalise()
    .threshold(200)
    .png()
    .toBuffer();

  const rawSvg = await traceSvg(mask);
  const paths = [...rawSvg.matchAll(/<path[^>]*d="([^"]+)"[^/]*\/>/g)].map(
    (m) => m[1]
  );
  if (paths.length === 0) throw new Error("potrace produced no paths");

  const d = paths[0];
  const nums = d
    .replace(/[MLHVCSQTAZmlhvcsqtaz]/g, " ")
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((n) => Number.isFinite(n));

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i];
    const y = nums[i + 1];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  const pad = 16;
  minX = Math.floor(minX - pad);
  minY = Math.floor(minY - pad);
  maxX = Math.ceil(maxX + pad);
  maxY = Math.ceil(maxY + pad);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" role="img" aria-label="Matomari">
  <path fill="#000" d="${d}"/>
</svg>
`;

  await writeFile(OUT_SVG, svg, "utf8");
  console.log(`Wrote ${OUT_SVG} (${Buffer.byteLength(svg)} bytes)`);
}

async function makeOgJpeg() {
  const existing = await readFile(path.join(ROOT, "public", "og.jpg")).catch(
    async () => {
      // Rebuild from previous AI PNG if jpg missing but png still around in assets.
      const png = await readFile(path.join(ROOT, "public", "og.png")).catch(
        () => null
      );
      if (!png) {
        throw new Error("No OG source found (public/og.jpg or public/og.png)");
      }
      return png;
    }
  );

  const buffer = await sharp(existing)
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .jpeg({ quality: 78, mozjpeg: true, chromaSubsampling: "4:2:0" })
    .toBuffer();

  await writeFile(OUT_OG_JPG, buffer);
  await writeFile(OUT_OG_APP, buffer);
  await writeFile(OUT_TWITTER_APP, buffer);
  console.log(`Wrote OG JPEG ${buffer.length} bytes`);
}

async function main() {
  await mkdir(path.join(ROOT, "public", "brand"), { recursive: true });
  await makeSvg();
  await makeOgJpeg();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
