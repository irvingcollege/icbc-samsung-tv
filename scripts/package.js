"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os");
const { spawnSync } = require("node:child_process");
const AdmZip = require("adm-zip");
const { stage } = require("./build");
const { xml, validateManifest } = require("./validate");
const root = path.resolve(__dirname, "..");
function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  if (result.error)
    throw new Error("Cannot run " + command + ": " + result.error.message);
  if (result.status !== 0)
    throw new Error(
      command +
        " failed (exit " +
        result.status +
        "); no release artifact was published"
    );
}
function verifyWidget(file, base, { signed = true } = {}) {
  const zip = new AdmZip(file);
  if (!zip.test()) throw new Error("Widget ZIP integrity check failed");
  const entries = zip.getEntries(),
    names = entries.map((e) => e.entryName);
  if (new Set(names).size !== names.length)
    throw new Error("Duplicate widget entries");
  for (const name of names)
    if (
      !/^(index\.html|config\.xml|author-signature\.xml|signature1\.xml|(?:css|js|assets)\/[^\\]*)$/.test(
        name
      ) ||
      name.split("/").includes("..") ||
      name
        .split("/")
        .some(
          (part) =>
            part.startsWith(".") ||
            /\.(p12|pfx|pem|key)$/i.test(part) ||
            part === "profiles.xml"
        )
    )
      throw new Error("Unexpected widget entry: " + name);
  for (const name of [
    "index.html",
    "config.xml",
    "assets/icon.png",
    "js/app.js",
    "js/catalog.js",
    "js/platform.js",
    "css/app.css",
    "assets/vendor/hls.min.js",
    "assets/vendor/HLS-LICENSE.txt",
  ])
    if (!zip.getEntry(name)) throw new Error("Missing widget entry: " + name);
  validateManifest(zip.readAsText("config.xml"), base);
  if (!signed) {
    if (zip.getEntry("author-signature.xml") || zip.getEntry("signature1.xml"))
      throw new Error("Unsigned widget must not contain signing files");
    return names;
  }
  for (const name of ["author-signature.xml", "signature1.xml"]) {
    if (!zip.getEntry(name)) throw new Error("Missing widget entry: " + name);
    const signature = xml(zip.readAsText(name));
    if (
      signature.documentElement.localName !== "Signature" ||
      signature.documentElement.namespaceURI !==
        "http://www.w3.org/2000/09/xmldsig#" ||
      !signature.getElementsByTagNameNS(
        "http://www.w3.org/2000/09/xmldsig#",
        "SignatureValue"
      ).length
    )
      throw new Error("Missing XML signature structure: " + name);
  }
  // Structure/CRC checks complement SDK signing; they do not verify certificate trust.
  return names;
}
function packageApp() {
  const profile = process.env.TIZEN_SECURITY_PROFILE,
    cli = process.env.TIZEN_CLI || "tizen";
  if (!profile)
    throw new Error(
      "Set TIZEN_SECURITY_PROFILE to an existing Samsung certificate profile name. Keep certificates and passwords in the local Tizen secure profile; do not put them in this repository."
    );
  const source = stage(),
    work = fs.mkdtempSync(path.join(os.tmpdir(), "icbc-tizen-"));
  try {
    const built = path.join(work, "build"),
      output = path.join(work, "package");
    fs.mkdirSync(output);
    run(cli, ["build-web", "--output", built, "--", source]);
    run(cli, [
      "package",
      "-t",
      "wgt",
      "-s",
      profile,
      "-o",
      output,
      "--",
      built,
    ]);
    const files = fs
      .readdirSync(output)
      .filter((name) => name.endsWith(".wgt"));
    if (files.length !== 1)
      throw new Error("Expected exactly one newly generated signed .wgt");
    const file = path.join(output, files[0]);
    verifyWidget(file, source);
    const dest = path.join(root, "artifacts");
    fs.mkdirSync(dest, { recursive: true });
    if (fs.lstatSync(dest).isSymbolicLink())
      throw new Error("Refusing symlink artifact directory");
    const version = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"))
    ).version;
    const target = path.join(dest, "icbc-tv-" + version + ".wgt");
    fs.copyFileSync(file, target);
    console.log(
      "SDK-signed widget written to " +
        target +
        ". Signature trust and device compatibility still require Samsung validation."
    );
    return target;
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}
if (require.main === module) {
  try {
    packageApp();
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
module.exports = { packageApp, verifyWidget };
