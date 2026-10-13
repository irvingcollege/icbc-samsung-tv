"use strict";
const fs = require("node:fs");
const path = require("node:path");
const acorn = require("acorn");
const { DOMParser } = require("@xmldom/xmldom");
const root = path.resolve(__dirname, "..");
const W = "http://www.w3.org/ns/widgets";
const T = "http://tizen.org/ns/widgets";
function assert(ok, message) {
  if (!ok) throw new Error(message);
}
function xml(text) {
  assert(!/<!DOCTYPE/i.test(text), "DOCTYPE is not permitted");
  return new DOMParser({
    onError: (level, message) => {
      throw new Error("Invalid XML: " + message);
    },
  }).parseFromString(text, "application/xml");
}
function validateManifest(text, base = root) {
  const doc = xml(text),
    widget = doc.documentElement;
  assert(
    widget.localName === "widget" && widget.namespaceURI === W,
    "Expected W3C widget namespace"
  );
  function one(ns, name) {
    const list = doc.getElementsByTagNameNS(ns, name);
    assert(list.length === 1, "Expected one " + name);
    return list[0];
  }
  const app = one(T, "application"),
    pkg = app.getAttribute("package");
  assert(
    /^[A-Za-z0-9]{10}$/.test(pkg),
    "Tizen package ID must be 10 alphanumeric characters"
  );
  assert(
    app.getAttribute("id").startsWith(pkg + ".") &&
      /^[A-Za-z0-9.]+$/.test(app.getAttribute("id")),
    "Application ID must start with package ID"
  );
  assert(
    app.getAttribute("required_version") === "4.0",
    "Review compatibility before changing minimum Tizen version"
  );
  assert(
    /^\d+\.\d+\.\d+$/.test(widget.getAttribute("version")),
    "Widget version must be major.minor.patch"
  );
  assert(
    widget.getAttribute("version") ===
      JSON.parse(fs.readFileSync(path.join(root, "package.json"))).version,
    "Widget and npm versions must match"
  );
  assert(
    one(T, "profile").getAttribute("name") === "tv-samsung",
    "Samsung TV profile required"
  );
  const privileges = Array.from(
    doc.getElementsByTagNameNS(T, "privilege"),
    (el) => el.getAttribute("name")
  );
  const expected = [
    "http://tizen.org/privilege/internet",
    "http://tizen.org/privilege/tv.inputdevice",
    "http://developer.samsung.com/privilege/avplay",
  ];
  assert(
    expected.every((p) => privileges.includes(p)) &&
      privileges.length === expected.length,
    "Unexpected or missing privilege"
  );
  const access = one(W, "access");
  assert(
    access.getAttribute("origin") === "https://live.irvingcollege.church",
    "Only the church media host is allowed"
  );
  const metadata = Array.from(doc.getElementsByTagNameNS(T, "metadata"));
  assert(
    metadata.some(
      (el) =>
        el.getAttribute("key") ===
          "http://samsung.com/tv/metadata/screen.size" &&
        el.getAttribute("value") === "1920x1080"
    ),
    "1080p Samsung display metadata required"
  );
  const content = one(W, "content").getAttribute("src"),
    icon = one(W, "icon").getAttribute("src");
  for (const file of [content, icon]) {
    assert(
      file && !path.isAbsolute(file) && !file.split(/[\\/]/).includes(".."),
      "Unsafe resource path"
    );
    assert(fs.existsSync(path.join(base, file)), "Missing resource: " + file);
  }
  const image = fs.readFileSync(path.join(base, icon));
  assert(
    image
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      image.readUInt32BE(16) === 117 &&
      image.readUInt32BE(20) === 117,
    "TV widget icon must be 117x117 PNG"
  );
  const settings = one(T, "setting");
  assert(
    settings.getAttribute("screen-orientation") === "landscape" &&
      settings.getAttribute("hwkey-event") === "enable",
    "Landscape and hardware key events required"
  );
  return {
    version: widget.getAttribute("version"),
    id: app.getAttribute("id"),
  };
}
function validateRuntime(base = root) {
  for (const file of fs
    .readdirSync(path.join(base, "js"))
    .filter((file) => file.endsWith(".js")))
    acorn.parse(fs.readFileSync(path.join(base, "js", file), "utf8"), {
      ecmaVersion: 5,
    });
  const html = fs.readFileSync(path.join(base, "index.html"), "utf8");
  assert(
    html.includes("$WEBAPIS/webapis/webapis.js"),
    "Samsung WebAPIs loader missing"
  );
  assert(html.includes("application/avplayer"), "Native AVPlay object missing");
  assert(
    html.includes("Content-Security-Policy") && !html.includes("'unsafe-eval'"),
    "Restrictive CSP required"
  );
}
function validateContent(base = root) {
  function walk(directory) {
    for (const name of fs.readdirSync(directory)) {
      const file = path.join(directory, name),
        stat = fs.lstatSync(file);
      assert(
        !stat.isSymbolicLink(),
        "Production files must not be symlinks: " + name
      );
      assert(
        !name.startsWith(".") &&
          !/\.(p12|pfx|pem|key)$/i.test(name) &&
          name !== "profiles.xml",
        "Non-production or credential file: " + name
      );
      if (stat.isDirectory()) walk(file);
    }
  }
  for (const name of ["assets", "css", "js"]) walk(path.join(base, name));
}
function validate(base = root) {
  const result = validateManifest(
    fs.readFileSync(path.join(base, "config.xml"), "utf8"),
    base
  );
  validateRuntime(base);
  validateContent(base);
  return result;
}
if (require.main === module) {
  try {
    const result = validate();
    console.log(
      "Samsung manifest and ES5 runtime validated: " +
        result.id +
        " v" +
        result.version
    );
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
module.exports = { validate, validateManifest, validateRuntime, xml };
