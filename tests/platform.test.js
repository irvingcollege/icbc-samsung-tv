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
    "https://live.irvingcollege.church/sermons/test.mp4"
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
    ["seek", 10000]
  );
  assert.equal(keys.length, 6);
  listener.onbufferingcomplete();
  window.ICBCPlatform.close();
  assert.equal(state, "NONE");
});

function deferredAdapter(overrides = {}) {
  let state = "NONE",
    prepare,
    listener,
    closeCount = 0;
  const events = [];
  const av = {
    open() {
      state = "IDLE";
    },
    setDisplayRect() {},
    setDisplayMethod() {},
    setListener(value) {
      listener = value;
    },
    prepareAsync(success) {
      prepare = success;
    },
    play() {
      state = "PLAYING";
    },
    pause() {
      state = "PAUSED";
    },
    getState() {
      return state;
    },
    stop() {
      state = "IDLE";
    },
    close() {
      closeCount++;
      state = "NONE";
    },
    ...overrides,
  };
  const window = { webapis: { avplay: av } };
  vm.runInNewContext(fs.readFileSync("js/platform.js", "utf8"), {
    window,
    Number,
    setTimeout,
    clearTimeout,
  });
  window.ICBCPlatform.init(
    { style: {}, pause() {}, removeAttribute() {}, load() {} },
    {
      ready: () => events.push("ready"),
      paused: () => {},
      error: () => events.push("error"),
    }
  );
  return {
    platform: window.ICBCPlatform,
    events,
    prepare: () => prepare(),
    listener: () => listener,
    state: () => state,
    closed: () => closeCount,
  };
}
test("Pause during AVPlay preparation is respected when playback starts", () => {
  const a = deferredAdapter();
  a.platform.open("https://live.irvingcollege.church/sermons/a.mp4");
  a.platform.pause();
  a.prepare();
  assert.equal(a.state(), "PAUSED");
  a.platform.resume();
  assert.equal(a.state(), "PLAYING");
  a.platform.close();
});
test("AVPlay releases resources even when stop rejects and ignores stale callbacks", () => {
  const a = deferredAdapter({
    stop() {
      throw new Error("not prepared");
    },
  });
  a.platform.open("https://live.irvingcollege.church/sermons/a.mp4");
  const listener = a.listener();
  a.platform.close();
  assert.equal(a.closed(), 1);
  a.prepare();
  listener.onerror();
  listener.onbufferingcomplete();
  assert.deepEqual(a.events, []);
});
test("failure to start AVPlay after preparation is a recoverable error", () => {
  const a = deferredAdapter({
    play() {
      throw new Error("unsupported codec");
    },
  });
  a.platform.open("https://live.irvingcollege.church/sermons/a.mp4");
  assert.doesNotThrow(() => a.prepare());
  assert.deepEqual(a.events, ["error"]);
  a.platform.close();
});
