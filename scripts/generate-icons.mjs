import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const iconsDir = path.join(rootDir, "src", "icons");
const source = path.join(iconsDir, "icon-source.png");
const sizes = [16, 48, 128];

async function main() {
  await fs.mkdir(iconsDir, { recursive: true });

  const sourceBuffer = await fs.readFile(source);
  const meta = await sharp(sourceBuffer).metadata();
  const side = Math.min(meta.width || 512, meta.height || 512);

  // Square crop from center, then resize for crisp toolbar icons.
  const squareBuffer = await sharp(sourceBuffer)
    .extract({
      left: Math.floor(((meta.width || side) - side) / 2),
      top: Math.floor(((meta.height || side) - side) / 2),
      width: side,
      height: side
    })
    .png()
    .toBuffer();

  await fs.writeFile(source, squareBuffer);

  for (const size of sizes) {
    await sharp(squareBuffer)
      .resize(size, size, { fit: "fill" })
      .png()
      .toFile(path.join(iconsDir, `icon${size}.png`));
    console.log(`Generated icon${size}.png`);
  }

  console.log("Icons generated from icon-source.png");
}

await main();
