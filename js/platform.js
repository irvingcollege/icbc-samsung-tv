(function (root) {
  "use strict";
  var av = root.webapis && root.webapis.avplay,
    video,
    hls,
    generation = 0,
    paused = false,
    events = {},
    nativeOpen = false,
    watchdog = null;
  function emit(name, value) {
    if (name === "ready" || name === "error" || name === "ended") {
      clearTimeout(watchdog);
      watchdog = null;
    }
    if (events[name]) events[name](value);
  }
  function dispose() {
    generation++;
    clearTimeout(watchdog);
    watchdog = null;
    if (hls) {
      hls.destroy();
      hls = null;
    }
    if (av && nativeOpen) {
      try {
        av.stop();
        av.close();
      } catch (e) {}
      nativeOpen = false;
    }
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    paused = false;
  }
  function playHTML(url, token) {
    video.onplaying = function () {
      if (token === generation) {
        paused = false;
        emit("ready");
      }
    };
    video.onerror = function () {
      if (token === generation)
        emit(
          "error",
          "Unable to play this video. The stream may be offline or unavailable.",
        );
    };
    video.onended = function () {
      emit("ended");
    };
    video.onwaiting = function () {
      emit("buffering");
    };
    video.ontimeupdate = function () {
      emit("time", { current: video.currentTime, duration: video.duration });
    };
    function start() {
      video.play().catch(function () {
        emit("error", "Playback could not start. Select Retry to try again.");
      });
    }
    if (
      /\.m3u8(?:\?|$)/i.test(url) &&
      !video.canPlayType("application/vnd.apple.mpegurl")
    ) {
      function attach() {
        if (token !== generation) return;
        if (!root.Hls || !root.Hls.isSupported()) {
          emit(
            "error",
            "HLS playback is unavailable in this browser. Use a Samsung TV or a supported browser.",
          );
          return;
        }
        hls = new root.Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(root.Hls.Events.MANIFEST_PARSED, start);
        hls.on(root.Hls.Events.ERROR, function (e, data) {
          if (data.fatal)
            emit("error", "The live stream is offline or could not be loaded.");
        });
      }
      if (root.Hls) attach();
      else {
        var script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/hls.js@1.6.13/dist/hls.min.js";
        script.onload = attach;
        script.onerror = function () {
          if (token === generation)
            emit(
              "error",
              "Browser HLS support could not load. Check your network connection.",
            );
        };
        document.head.appendChild(script);
      }
    } else {
      video.src = url;
      start();
    }
  }
  root.ICBCPlatform = {
    init: function (el, callbacks) {
      video = el;
      events = callbacks;
      var input = root.tizen && root.tizen.tvinputdevice;
      if (input)
        [
          "MediaPlay",
          "MediaPause",
          "MediaPlayPause",
          "MediaStop",
          "MediaRewind",
          "MediaFastForward",
        ].forEach(function (key) {
          try {
            input.registerKey(key);
          } catch (e) {}
        });
    },
    open: function (url) {
      dispose();
      var token = generation;
      video.style.display = av ? "none" : "block";
      watchdog = setTimeout(function () {
        if (token === generation)
          emit(
            "error",
            "The stream did not respond. Check your connection and select Retry.",
          );
      }, 20000);
      emit("buffering");
      if (!av) {
        playHTML(url, token);
        return;
      }
      try {
        av.open(url);
        nativeOpen = true;
        av.setDisplayRect(0, 0, 1920, 1080);
        av.setDisplayMethod("PLAYER_DISPLAY_MODE_LETTER_BOX");
        av.setListener({
          onbufferingstart: function () {
            emit("buffering");
          },
          onbufferingcomplete: function () {
            emit("ready");
          },
          oncurrentplaytime: function (ms) {
            emit("time", {
              current: ms / 1000,
              duration: av.getDuration() / 1000,
            });
          },
          onstreamcompleted: function () {
            emit("ended");
          },
          onerror: function () {
            emit(
              "error",
              "The stream is offline or playback failed. Select Retry to reconnect.",
            );
          },
        });
        av.prepareAsync(
          function () {
            if (token !== generation) return;
            av.play();
            emit("ready");
          },
          function () {
            if (token === generation)
              emit(
                "error",
                "This video is currently unavailable. Please try again later.",
              );
          },
        );
      } catch (e) {
        emit(
          "error",
          "Unable to start TV playback. Select Retry to try again.",
        );
      }
    },
    toggle: function () {
      try {
        if (av) {
          if (av.getState() === "PLAYING") {
            av.pause();
            paused = true;
          } else if (av.getState() === "PAUSED") {
            av.play();
            paused = false;
          }
        } else if (video.paused) {
          video.play().catch(function () {
            emit("error", "Playback could not resume.");
          });
          paused = false;
        } else {
          video.pause();
          paused = true;
        }
        emit("paused", paused);
      } catch (e) {
        emit("error", "Playback control is unavailable while loading.");
      }
    },
    pause: function () {
      if (!paused) this.toggle();
    },
    resume: function () {
      if (paused) this.toggle();
    },
    seek: function (seconds) {
      try {
        if (av) {
          if (av.getState() !== "PLAYING" && av.getState() !== "PAUSED") return;
          var duration = av.getDuration();
          if (duration > 0)
            av.seekTo(
              Math.max(
                0,
                Math.min(duration - 1000, av.getCurrentTime() + seconds * 1000),
              ),
            );
        } else if (Number.isFinite(video.duration))
          video.currentTime = Math.max(
            0,
            Math.min(video.duration, video.currentTime + seconds),
          );
      } catch (e) {
        emit("error", "Seeking is unavailable for this stream.");
      }
    },
    close: dispose,
    exit: function () {
      if (root.tizen && root.tizen.application)
        root.tizen.application.getCurrentApplication().exit();
      else {
        document.getElementById("exit-dialog").close();
        emit("exitUnavailable");
      }
    },
  };
})(window);
