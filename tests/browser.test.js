"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  { chromium } = require("playwright"),
  { spawn } = require("node:child_process");
let server, browser, page;
test.before(async () => {
  server = spawn(process.execPath, ["scripts/serve.js"], {
    env: { ...process.env, PORT: "8091" },
    stdio: ["ignore", "pipe", "inherit"],
  });
  await new Promise((resolve) => server.stdout.once("data", resolve));
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
});
test.after(async () => {
  if (browser) await browser.close();
  if (server) server.kill();
});
async function home(body, status = 200) {
  await page.unrouteAll();
  await page.route("**/catalog.json", (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    })
  );
  await page.goto("http://127.0.0.1:8091");
  await page.waitForFunction(
    () =>
      document.getElementById("catalog-status").textContent !==
      "Loading sermons…"
  );
}
test("TV navigation, catalog rendering, player and return focus", async () => {
  await home({
    sermons: [
      {
        title: "Hope <script>alert(1)</script>",
        file: "hope.mp4",
        speaker: "Pastor",
      },
    ],
  });
  assert.equal(
    await page.locator("#live").evaluate((el) => el === document.activeElement),
    true
  );
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page
      .locator("#browse")
      .evaluate((el) => el === document.activeElement),
    true
  );
  await page.keyboard.press("Enter");
  assert.equal(
    await page
      .locator(".sermon")
      .evaluate((el) => el === document.activeElement),
    true
  );
  assert.equal(await page.locator(".sermon script").count(), 0);
  await page.route("**/hope.mp4", (r) => r.abort());
  await page.keyboard.press("Enter");
  await page.waitForFunction(() =>
    document
      .getElementById("player-status")
      .textContent.match(/Unable|could not start/)
  );
  assert.equal(await page.locator("#player").isVisible(), true);
  await page.keyboard.press("Escape");
  assert.equal(
    await page
      .locator(".sermon")
      .evaluate((el) => el === document.activeElement),
    true
  );
});
test("empty, failed and malformed catalogs give recoverable messages", async () => {
  await home([]);
  assert.match(
    await page.locator("#catalog-status").textContent(),
    /No sermons/
  );
  await home({}, 503);
  assert.match(
    await page.locator("#catalog-status").textContent(),
    /Check your connection/
  );
  await home({ wrong: [] });
  assert.match(
    await page.locator("#catalog-status").textContent(),
    /could not be read/
  );
  await page.route("**/catalog.json", (r) =>
    r.fulfill({
      contentType: "application/json",
      body: '[{"file":"recovered.mp4","title":"Recovered"}]',
    })
  );
  await page.locator("#refresh").click();
  await page.waitForSelector(".sermon");
  assert.equal(await page.locator(".sermon span").textContent(), "Recovered");
});
test("Back opens exit confirmation and Stay returns home", async () => {
  await home([]);
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator("#exit-dialog").evaluate((el) => el.open),
    true
  );
  await page.keyboard.press("Enter");
  assert.equal(
    await page.locator("#exit-dialog").evaluate((el) => el.open),
    false
  );
  assert.equal(
    await page.locator("#live").evaluate((el) => el === document.activeElement),
    true
  );
});
test("archived MP4 plays, pauses and returns using remote controls", async () => {
  await home([{ title: "Playback check", file: "fixture.mp4" }]);
  await page.route("**/fixture.mp4", (r) =>
    r.fulfill({
      contentType: "video/mp4",
      path: require("node:path").join(__dirname, "fixtures/sermon.mp4"),
    })
  );
  await page.locator(".sermon").click();
  await page.waitForFunction(
    () => document.getElementById("video").currentTime > 0
  );
  await page.keyboard.press("MediaPlayPause");
  await page.waitForFunction(() => document.getElementById("video").paused);
  await page.keyboard.press("MediaPlayPause");
  await page.waitForFunction(() => !document.getElementById("video").paused);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#home").isVisible(), true);
  assert.equal(
    await page.locator("#video").evaluate((el) => el.getAttribute("src")),
    null
  );
});
test("live stream failure is recoverable and live seeking is disabled", async () => {
  await home([]);
  await page.route("https://cdn.jsdelivr.net/**", (r) => r.abort());
  await page.route("**/stream.m3u8", (r) => r.abort());
  await page.locator("#live").click();
  await page.waitForFunction(() =>
    /unavailable|could not|offline/.test(
      document.getElementById("player-status").textContent
    )
  );
  assert.equal(await page.locator("#rewind").isDisabled(), true);
  assert.equal(await page.locator("#retry").isVisible(), true);
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator("#live").evaluate((el) => el === document.activeElement),
    true
  );
});

test("bundled browser HLS fallback plays a real local fixture without remote scripts", async () => {
  await home([]);
  await page.route("**/hls/**", (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop();
    if (!["stream.m3u8", "segment0.ts"].includes(name)) return route.abort();
    return route.fulfill({
      contentType: name.endsWith(".m3u8")
        ? "application/vnd.apple.mpegurl"
        : "video/mp2t",
      headers: { "Access-Control-Allow-Origin": "*" },
      path: require("node:path").join(__dirname, "fixtures", name),
    });
  });
  await page.locator("#live").click();
  await page.waitForFunction(
    () => document.getElementById("video").currentTime > 0
  );
  assert.equal(await page.locator('script[src^="https://"]').count(), 0);
  assert.equal(await page.locator("#forward").isDisabled(), true);
  await page.keyboard.press("Escape");
});

test("archive keeps three TV columns and playback fills the screen", async () => {
  await home(
    Array.from({ length: 9 }, (_, i) => ({
      title: "Sermon " + i,
      file: "sermon" + i + ".mp4",
    }))
  );
  const boxes = await page.locator(".sermon").evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width };
    })
  );
  assert.ok(boxes[1].x > boxes[0].x + boxes[0].width);
  assert.equal(boxes[0].y, boxes[2].y);
  assert.ok(boxes[3].y > boxes[0].y);
  await page.route("**/sermon0.mp4", (r) => r.abort());
  await page.locator(".sermon").first().click();
  const frame = await page.locator("#player").boundingBox();
  assert.deepEqual(frame, { x: 0, y: 0, width: 1920, height: 1080 });
  await page.keyboard.press("Escape");
});
