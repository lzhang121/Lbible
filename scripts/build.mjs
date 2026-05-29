import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const distDir = path.join(rootDir, "dist");
const kuromojiDir = path.join(rootDir, "node_modules", "kuromoji");

async function main() {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });

  await copyRecursive(path.join(srcDir, "analyzer"), path.join(distDir, "analyzer"));
  await copyRecursive(path.join(srcDir, "icons"), path.join(distDir, "icons"));
  await copyFile("manifest.json");
  await copyFile("background.js");
  await copyFile("content.js");
  await copyFile("extract-selection.js");
  await copyFile("sidepanel.html");
  await copyFile("sidepanel.js");
  await copyFile("sidepanel.css");
  await copyFile("vp-theme.css");
  await copyFile("options.html");
  await copyFile("options.css");
  await copyFile("options.js");

  await fs.mkdir(path.join(distDir, "vendor"), { recursive: true });
  await fs.mkdir(path.join(distDir, "vendor", "dict"), { recursive: true });

  await fs.copyFile(
    path.join(kuromojiDir, "build", "kuromoji.js"),
    path.join(distDir, "vendor", "kuromoji.js")
  );
  await fs.copyFile(
    path.join(rootDir, "src", "vendor", "tiny_segmenter.js"),
    path.join(distDir, "vendor", "tiny_segmenter.js")
  );
  await copyRecursive(
    path.join(kuromojiDir, "dict"),
    path.join(distDir, "vendor", "dict")
  );

  await fs.copyFile(
    path.join(rootDir, "schemas", "analysis-result.schema.json"),
    path.join(distDir, "analysis-result.schema.json")
  );

  console.log("Build complete: dist/");
}

async function copyFile(fileName) {
  await fs.copyFile(path.join(srcDir, fileName), path.join(distDir, fileName));
}

async function copyRecursive(source, destination) {
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyRecursive(sourcePath, destinationPath);
    } else {
      await fs.copyFile(sourcePath, destinationPath);
    }
  }
}

await main();
