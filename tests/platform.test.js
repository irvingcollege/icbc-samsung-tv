"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
test("Samsung adapter prepares, plays, pauses, seeks and releases AVPlay", () => {
  const calls = [],
    callbacks = {};
  let state = "NONE",
    listener;
  const av = {
    open: (u) => {
      calls.push(["open", u]);
      state = "IDLE";
    },
    setDisplayRect: () => {},
    setDisplayMethod: () => {},
    setListener: (l) => (listener = l),
    prepareAsync: (cb) => {
      state = "READY";
      cb();
    },
    play: () => {
      calls.push(["play"]);
      state = "PLAYING";
    },
    pause: () => {
      state = "PAUSED";
    },
    getState: () => state,
    getDuration: () => 120000,
    getCurrentTime: () => 40000,
    seekTo: (ms) => calls.push(["seek", ms]),
    stop: () => {
      calls.push(["stop"]);
    },
    close: () => {
      calls.push(["close"]);
      state = "NONE";
    },
  };
  const keys = [],
    window = {
      webapis: { avplay: av },
      tizen: { tvinputdevice: { registerKey: (k) => keys.push(k) } },
    };
  vm.runInNewContext(fs.readFileSync("js/platform.js", "utf8"), {
    window,
    Number,
    setTimeout,
    clearTimeout,
  });
  const video = { style: {}, pause() {}, removeAttribute() {}, load() {} };
  window.ICBCPlatform.init(video, {
    ready: () => (callbacks.ready = true),
    paused: (p) => (callbacks.paused = p),
  });
  window.ICBCPlatform.open(
    "https://live.irvingcollege.church/sermons/test.mp4",
  );
  assert.equal(callbacks.ready, true);
  assert.equal(state, "PLAYING");
  window.ICBCPlatform.toggle();
  assert.equal(state, "PAUSED");
  window.ICBCPlatform.resume();
  assert.equal(state, "PLAYING");
  window.ICBCPlatform.seek(-30);
  assert.deepEqual(
    calls.find((c) => c[0] === "seek"),
    ["seek", 10000],
  );
  assert.equal(keys.length, 6);
  listener.onbufferingcomplete();
  window.ICBCPlatform.close();
  assert.equal(state, "NONE");
});
