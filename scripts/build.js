"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, ".."),
  out = path.join(root, "dist");
fs.mkdirSync(out, { recursive: true });
for (const name of ["index.html", "config.xml", "css", "js", "assets"])
  fs.cpSync(path.join(root, name), path.join(out, name), { recursive: true });
console.log(
  "Production files staged in dist/. Sign/package with the Samsung Tizen SDK.",
);
