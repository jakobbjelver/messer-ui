// Tiny static server shared by sink-check, mark and contact-sheet. No dependencies.
//
//   const server = await serve(ROOT, { fallback: "fixtures/kitchen-sink.html" });
//   server.url   // http://127.0.0.1:<port>
//   server.close()

import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".png": "image/png",
};

export async function serve(root, { fallback = null } = {}) {
  const base = path.resolve(root);
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "");
    if (!rel && fallback) rel = fallback;
    const file = path.join(base, rel);
    if (!file.startsWith(base) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  const port = await new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(server.address().port)),
  );
  return { url: `http://127.0.0.1:${port}`, port, close: () => server.close() };
}
