"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const { validate } = require("./validate");
const root = path.resolve(__dirname, "..");
const PRODUCTION = ["index.html", "config.xml", "css", "js", "assets"];
function stage(output = path.join(root, "dist")) {
  validate();
  if (fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink())
    throw new Error("Refusing symlink output directory");
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  for (const name of PRODUCTION)
    fs.cpSync(path.join(root, name), path.join(output, name), {
      recursive: true,
    });
  validate(output);
  return output;
}
if (require.main === module) {
  try {
    console.log("Validated production files staged in " + stage());
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
module.exports = { stage, PRODUCTION };
