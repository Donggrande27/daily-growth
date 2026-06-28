import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 3000);

loadEnvFile(join(root, ".env.local"));

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      const apiName = url.pathname.replace("/api/", "");
      const apiPath = join(root, "api", `${apiName}.js`);

      if (!existsSync(apiPath)) {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }

      const mod = await import(`${pathToFileURL(apiPath).href}?t=${Date.now()}`);
      await mod.default(req, res);
      return;
    }

    const publicPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = join(root, "public", publicPath);
    const data = await readFile(filePath);
    res.setHeader("Content-Type", mimeTypes[extname(filePath)] || "application/octet-stream");
    res.end(data);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(error.message);
  }
});

server.listen(port, () => {
  console.log(`Daily Growth Agent running at http://localhost:${port}`);
});

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    process.env[key] = value;
  }
}
