"use strict";
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, ".."),
  types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".json": "application/json",
  };
http
  .createServer((req, res) => {
    let name;
    try {
      name = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    const file = path.resolve(
      root,
      "." + (name === "/" ? "/index.html" : name)
    );
    if (
      !file.startsWith(root + path.sep) ||
      name.split("/").some((x) => x.startsWith(".")) ||
      name.startsWith("/node_modules/")
    ) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
      });
      res.end(data);
    });
  })
  .listen(Number(process.env.PORT) || 8080, "0.0.0.0", () =>
    console.log("ICBC development server on port " + (process.env.PORT || 8080))
  );
