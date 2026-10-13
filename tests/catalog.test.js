"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  catalog = require("../js/catalog");
test("loads arrays and documented wrapper formats", () => {
  for (const wrap of [
    (x) => x,
    (x) => ({ sermons: x }),
    (x) => ({ items: x }),
  ]) {
    const rows = catalog.normalize(
      wrap([
        {
          title: "Hope",
          file: "hope.mp4",
          date: "2026-10-11",
          speaker: "Pastor",
        },
      ])
    );
    assert.equal(
      rows[0].url,
      "https://live.irvingcollege.church/sermons/hope.mp4"
    );
    assert.equal(rows[0].title, "Hope");
  }
});
test("rejects unsafe media and permits HLS and signed MP4 URLs", () => {
  for (const url of [
    "javascript:alert(1)",
    "http://live.irvingcollege.church/a.mp4",
    "https://evil.example/a.mp4",
    "//evil.example/a.mp4",
    "file:///a.mp4",
    "bad.txt",
  ])
    assert.equal(catalog.mediaUrl(url), null);
  assert.ok(
    catalog.mediaUrl(
      "https://live.irvingcollege.church/sermons/a.mp4?token=abc"
    )
  );
  assert.ok(catalog.mediaUrl("../hls/stream.m3u8"));
});
test("filters bad records and preserves an empty catalog", () => {
  assert.deepEqual(catalog.normalize([]), []);
  assert.deepEqual(
    catalog.normalize([
      null,
      { title: "bad" },
      { url: "https://evil.example/a.mp4" },
    ]),
    []
  );
  assert.throws(() => catalog.normalize({ bad: [] }));
});
