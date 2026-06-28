import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

async function collectJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectJsFiles(path));
    } else if (entry.name.endsWith(".js")) {
      files.push(path);
    }
  }

  return files;
}

const root = fileURLToPath(new URL("..", import.meta.url));
const files = await collectJsFiles(root);

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

console.log(`Checked ${files.length} JavaScript files.`);
