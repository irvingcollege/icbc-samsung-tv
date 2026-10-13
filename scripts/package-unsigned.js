"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os");
const AdmZip = require("adm-zip");
const { stage } = require("./build");
const { verifyWidget } = require("./package");
const root = path.resolve(__dirname, "..");
function packageUnsigned(destination = path.join(root, "artifacts")) {
  const source = stage(),
    zip = new AdmZip();
  function add(directory) {
    for (const name of fs.readdirSync(directory).sort()) {
      const file = path.join(directory, name),
        stat = fs.lstatSync(file);
      if (stat.isDirectory()) add(file);
      else {
        const relative = path.relative(source, file).split(path.sep).join("/");
        zip.addFile(relative, fs.readFileSync(file));
        // Fixed DOS time, no source permissions or user metadata: repeatable development archive.
        zip.getEntry(relative).header.time = new Date(1980, 0, 1, 0, 0, 0);
      }
    }
  }
  add(source);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "icbc-unsigned-"));
  try {
    const file = path.join(temp, "unsigned.wgt");
    zip.writeZip(file);
    verifyWidget(file, source, { signed: false });
    fs.mkdirSync(destination, { recursive: true });
    if (fs.lstatSync(destination).isSymbolicLink())
      throw new Error("Refusing symlink artifact directory");
    const version = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"))
    ).version;
    const target = path.join(
      destination,
      "icbc-tv-" + version + "-unsigned.wgt"
    );
    fs.copyFileSync(file, target);
    console.log(
      "Unsigned development widget: " +
        target +
        "\nNo Samsung SDK validation or signing was performed. This artifact is not ready for TV installation or Seller Office submission."
    );
    return target;
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
if (require.main === module) {
  try {
    packageUnsigned();
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
module.exports = { packageUnsigned };
