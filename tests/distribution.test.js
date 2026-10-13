"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  { spawnSync } = require("node:child_process");
const AdmZip = require("adm-zip");
const { validateManifest, validateRuntime } = require("../scripts/validate");
const { stage } = require("../scripts/build");
const { verifyWidget } = require("../scripts/package");
const root = path.resolve(__dirname, ".."),
  config = fs.readFileSync(path.join(root, "config.xml"), "utf8");
test("manifest rejects missing privileges, wrong IDs and malformed XML", () => {
  assert.equal(validateManifest(config).version, "1.0.0");
  for (const bad of [
    config.replace("tv-samsung", "mobile"),
    config.replace('package="ICBCTV2026"', 'package="bad"'),
    config.replace("http://tizen.org/privilege/internet", "unknown"),
    config.replace("</widget>", "</wrong>"),
  ])
    assert.throws(() => validateManifest(bad));
});
test("runtime remains parseable by older TV JavaScript engines", () =>
  validateRuntime());
test("production staging removes stale development files and validates signed widget structure", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "icbc-test-"));
  try {
    const source = path.join(temp, "dist");
    stage(source);
    fs.writeFileSync(path.join(source, "secret.p12"), "fake");
    stage(source);
    assert.equal(fs.existsSync(path.join(source, "secret.p12")), false);
    assert.deepEqual(fs.readdirSync(source).sort(), [
      "assets",
      "config.xml",
      "css",
      "index.html",
      "js",
    ]);
    const zip = new AdmZip();
    zip.addLocalFolder(source);
    const signature =
      '<Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignatureValue>test-only</SignatureValue></Signature>';
    for (const name of ["author-signature.xml", "signature1.xml"])
      zip.addFile(name, Buffer.from(signature));
    const widget = path.join(temp, "fake.wgt");
    zip.writeZip(widget);
    assert.ok(verifyWidget(widget, source).includes("config.xml"));
    zip.addFile("private.p12", Buffer.from("fake"));
    zip.writeZip(widget);
    assert.throws(
      () => verifyWidget(widget, source),
      /Unexpected widget entry/
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
test("packager fails without a Samsung profile and does not pretend to create a widget", () => {
  const result = spawnSync(process.execPath, ["scripts/package.js"], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, TIZEN_SECURITY_PROFILE: "" },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /TIZEN_SECURITY_PROFILE/);
});

test("bundled HLS matches the integrity-checked locked dependency and includes its license", () => {
  assert.ok(
    fs
      .readFileSync(path.join(root, "assets/vendor/hls.min.js"))
      .equals(
        fs.readFileSync(path.join(root, "node_modules/hls.js/dist/hls.min.js"))
      )
  );
  assert.ok(
    fs
      .readFileSync(path.join(root, "assets/vendor/HLS-LICENSE.txt"))
      .equals(fs.readFileSync(path.join(root, "node_modules/hls.js/LICENSE")))
  );
  require("acorn").parse(
    fs.readFileSync(path.join(root, "assets/vendor/hls.min.js"), "utf8"),
    { ecmaVersion: 5 }
  );
});
