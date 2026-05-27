import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const iconsDir = path.join(rootDir, "src", "icons");
const source = path.join(iconsDir, "icon-source.png");
const sizes = [16, 48, 128];

async function removeRedAccents(inputBuffer) {
  const { data, info } = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;

  for (let i = 0; i < data.length; i += ch) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const isRed = r > 110 && g < 95 && b < 95 && r > g + 25 && r > b + 25;
    if (!isRed) continue;
    data[i] = 132;
    data[i + 1] = 134;
    data[i + 2] = 138;
    if (ch === 4) data[i + 3] = 255;
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: ch }
  }).png().toBuffer();
}

const sourceBuffer = await fs.readFile(source);
const cleanedBuffer = await removeRedAccents(sourceBuffer);
await fs.writeFile(source, cleanedBuffer);

for (const size of sizes) {
  await sharp(cleanedBuffer)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(iconsDir, `icon${size}.png`));
  console.log(`Generated icon${size}.png`);
}
