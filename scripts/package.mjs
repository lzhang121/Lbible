import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const releaseDir = path.join(rootDir, "release");

async function readVersion() {
  const manifestPath = path.join(rootDir, "src", "manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  return manifest.version || "0.0.0";
}

async function assertDistReady() {
  const manifestPath = path.join(distDir, "manifest.json");
  try {
    await fs.access(manifestPath);
  } catch {
    throw new Error("dist/ 不存在或未构建。请先运行: npm run build");
  }
}

function createZip(zipPath) {
  const distGlob = path.join(distDir, "*");
  if (process.platform === "win32") {
    const ps = [
      "Compress-Archive",
      `-Path '${distGlob.replace(/'/g, "''")}'`,
      `-DestinationPath '${zipPath.replace(/'/g, "''")}'`,
      "-Force"
    ].join(" ");
    execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: "inherit" });
    return;
  }

  execSync(`cd "${distDir}" && zip -r "${zipPath}" .`, { stdio: "inherit" });
}

async function main() {
  await assertDistReady();
  const version = await readVersion();
  await fs.mkdir(releaseDir, { recursive: true });

  const zipName = `verse-parse-${version}.zip`;
  const zipPath = path.join(releaseDir, zipName);

  await fs.rm(zipPath, { force: true });
  createZip(zipPath);

  console.log(`Package ready: release/${zipName}`);
}

await main();
