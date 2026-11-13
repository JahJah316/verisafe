// A tiny local web server so the website can load the files in /core.
// Run it with:  node dev-server.js   then open http://localhost:3000
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const server = createServer(async (req, res) => {
  let pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (pathname === "/") {
    res.writeHead(302, { Location: "/website/index.html" });
    res.end();
    return;
  }

  const filePath = join(root, pathname);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(8137, "127.0.0.1", () => {
  console.log("Verisafe is running at http://127.0.0.1:8137  (press Ctrl+C to stop)");
});