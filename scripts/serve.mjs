import http from "node:http";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";
const root = path.resolve("out");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".json": "application/json",
  ".txt": "text/plain",
};
http
  .createServer(async (req, res) => {
    try {
      const requestPath = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      let target = path.resolve(root, "." + requestPath);
      if (target !== root && !target.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      try {
        if ((await stat(target)).isDirectory()) target = path.join(target, "index.html");
      } catch (error) {
        if (error.code !== "ENOENT" || path.extname(target)) throw error;
        // Next static export emits clean routes as room.html / fortune.html.
        target += ".html";
      }
      const body = await readFile(target);
      res.writeHead(200, {
        "Content-Type":
          types[path.extname(target)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(3000, "127.0.0.1", () =>
    console.log("Soul Cat preview: http://127.0.0.1:3000"),
  );
