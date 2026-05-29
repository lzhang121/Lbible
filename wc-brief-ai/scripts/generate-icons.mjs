import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "..", "icons");
const source = path.join(iconsDir, "icon-source.png");

const sourceBuffer = await fs.readFile(source);
const meta = await sharp(sourceBuffer).metadata();
const size = Math.min(meta.width, meta.height);
const ballCrop = Math.round(size * 0.72);
const left = Math.round((meta.width - ballCrop) / 2);
const top = Math.round(size * 0.06);

for (const px of [48, 128]) {
  await sharp(sourceBuffer)
    .resize(px, px, { fit: "cover" })
    .png()
    .toFile(path.join(iconsDir, `icon${px}.png`));
  console.log(`icon${px}.png`);
}

await sharp(sourceBuffer)
  .extract({ left, top, width: ballCrop, height: ballCrop })
  .resize(16, 16, { fit: "contain", background: { r: 15, g: 23, b: 42, alpha: 1 } })
  .png()
  .toFile(path.join(iconsDir, "icon16.png"));
console.log("icon16.png (ball-focused)");
