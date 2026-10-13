"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  { chromium } = require("playwright");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "artifacts", "seller-office-assets");
const host = "https://live.irvingcollege.church";
const preview = "/icbc-local-screenshot-preview/";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".txt": "text/plain",
};
async function jpeg(page, name) {
  for (const quality of [90, 85, 80, 75, 65]) {
    const data = await page.screenshot({
      type: "jpeg",
      quality,
      fullPage: false,
    });
    if (data.length < 500000) {
      fs.writeFileSync(path.join(output, name), data);
      return;
    }
  }
  throw new Error("Screenshot exceeds 500 KB: " + name);
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  for (const name of [
    "01-home.jpg",
    "02-sermons.jpg",
    "03-exit-confirmation.jpg",
    "background.jpg",
  ]) {
    const file = path.join(output, name);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  const proxyURL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  let proxy;
  if (proxyURL) {
    const url = new URL(proxyURL);
    proxy = { server: url.protocol + "//" + url.host };
    if (url.username) proxy.username = decodeURIComponent(url.username);
    if (url.password) proxy.password = decodeURIComponent(url.password);
  }
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
    ...(proxy ? { proxy } : {}),
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    // Only app files are locally served. Catalog/media requests go to the real church host.
    // Same-origin virtual hosting avoids localhost CORS without mocking sermon content.
    await page.route(host + preview + "**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      let relative;
      try {
        relative =
          decodeURIComponent(pathname.slice(preview.length)) || "index.html";
      } catch {
        return route.fulfill({ status: 400, body: "" });
      }
      const file = path.resolve(root, relative);
      if (
        !file.startsWith(root + path.sep) ||
        relative.split("/").some((p) => p.startsWith(".")) ||
        !["index.html", "css/", "js/", "assets/"].some(
          (prefix) => relative === prefix || relative.startsWith(prefix)
        ) ||
        !fs.existsSync(file) ||
        !fs.statSync(file).isFile()
      )
        return route.fulfill({ status: 404, body: "" });
      return route.fulfill({
        contentType: types[path.extname(file)] || "application/octet-stream",
        body: fs.readFileSync(file),
      });
    });
    // Forward live catalog bytes through curl's supported proxy/CA configuration.
    // This is live network data, never a fixture; browser TLS verification stays enabled.
    await page.route(host + "/sermons/catalog.json", async (route) => {
      try {
        const data = execFileSync("curl", [
          "--fail",
          "--silent",
          "--show-error",
          "--max-time",
          "20",
          host + "/sermons/catalog.json",
        ]);
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: data,
        });
      } catch {
        return route.abort();
      }
    });
    let catalogStatus = null;
    page.on("response", (r) => {
      if (r.url() === host + "/sermons/catalog.json")
        catalogStatus = r.status();
    });
    await page.goto(host + preview + "index.html", {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    await page.waitForFunction(
      () =>
        document.getElementById("catalog-status").textContent !==
        "Loading sermons…",
      {},
      { timeout: 20000 }
    );
    const sermonCount = await page.locator(".sermon").count();
    await page.locator("#live").focus();
    await jpeg(page, "01-home.jpg");
    if (sermonCount) {
      await page.locator("#browse").click();
      await jpeg(page, "02-sermons.jpg");
    }
    await page.locator("#live").focus();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.keyboard.press("Escape");
    await jpeg(page, "03-exit-confirmation.jpg");
    await page.keyboard.press("Escape");
    // Separate design background: actual computed app colors/gradient, without UI content.
    const colors = await page.evaluate(() => ({
      body: getComputedStyle(document.body).backgroundColor,
      gradient: getComputedStyle(document.getElementById("home"))
        .backgroundImage,
    }));
    const backdrop = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    await backdrop.setContent(
      "<!doctype html><html><body><main></main></body></html>"
    );
    await backdrop.evaluate((c) => {
      document.body.style.cssText = "margin:0;background:" + c.body;
      document.querySelector("main").style.cssText =
        "width:1920px;height:1080px;background-image:" + c.gradient;
    }, colors);
    await jpeg(backdrop, "background.jpg");
    fs.writeFileSync(
      path.join(output, "capture-provenance.json"),
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
            cwd: root,
            encoding: "utf8",
          }).trim(),
          renderer: "Chromium / Playwright, 1920x1080, device scale 1",
          source:
            "Unmodified local application files, served through an in-memory same-origin preview route; not deployed on church server or captured on a physical TV.",
          content:
            "Real catalog fetched at capture time from " +
            host +
            "/sermons/catalog.json through curl TLS/proxy adapter, forwarded without editing bytes. No fixture records. No video/player screenshot captured.",
          catalogHttpStatus: catalogStatus,
          visibleSermons: sermonCount,
          catalogMessage: await page.locator("#catalog-status").textContent(),
          background: colors,
          missingAssets: [
            "Official church logo source (SVG or high-resolution transparent PNG) for transparent-logo.png and 512x423 full-color-icon.png",
          ],
          existingIconIsOfficialLogo: false,
        },
        null,
        2
      )
    );
    console.log(
      "Captured " +
        (sermonCount ? 3 : 2) +
        " genuine browser-rendered app screenshots; " +
        sermonCount +
        " real sermons. Official logo assets remain blocked."
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
