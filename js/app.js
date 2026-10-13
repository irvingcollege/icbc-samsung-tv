(function () {
  "use strict";
  var $ = function (id) {
      return document.getElementById(id);
    },
    platform = window.ICBCPlatform,
    playing = null,
    returnFocus = null,
    loading = false;
  function status(text) {
    $("player-status").textContent = text;
  }
  platform.init($("video"), {
    buffering: function () {
      status("Connecting…");
    },
    ready: function () {
      status("");
      $("toggle").textContent = "Pause";
    },
    paused: function (paused) {
      $("toggle").textContent = paused ? "Play" : "Pause";
    },
    ended: function () {
      status("This sermon has ended. Select Retry to watch again.");
    },
    error: status,
    time: function (time) {
      if (!playing) return;
      function fmt(s) {
        return Math.floor(s / 60) + ":" + ("0" + Math.floor(s % 60)).slice(-2);
      }
      $("progress").textContent = playing.live
        ? "LIVE"
        : fmt(time.current) +
          " / " +
          (Number.isFinite(time.duration) && time.duration > 0
            ? fmt(time.duration)
            : "—");
    },
    exitUnavailable: function () {
      $("live").focus();
    },
  });
  function open(item) {
    returnFocus = document.activeElement;
    playing = item;
    $("home").classList.add("hidden");
    $("player").classList.remove("hidden");
    $("playing-title").textContent = item.title;
    $("progress").textContent = item.live ? "LIVE" : "";
    $("rewind").disabled = $("forward").disabled = !!item.live;
    platform.open(item.url);
    $("close").focus();
  }
  function close() {
    platform.close();
    playing = null;
    $("player").classList.add("hidden");
    $("home").classList.remove("hidden");
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
    else $("live").focus();
  }
  function back() {
    if (playing) {
      close();
      return;
    }
    if ($("exit-dialog").open) {
      $("exit-dialog").close();
      $("live").focus();
      return;
    }
    if (window.scrollY > 60) {
      $("live").focus();
      window.scrollTo(0, 0);
      return;
    }
    $("exit-dialog").showModal();
    $("stay").focus();
  }
  function load() {
    if (loading) return;
    loading = true;
    $("catalog-status").textContent = "Loading sermons…";
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://live.irvingcollege.church/sermons/catalog.json");
    xhr.timeout = 15000;
    function fail() {
      loading = false;
      $("catalog-status").textContent =
        "Sermons could not be loaded. Check your connection and select Refresh.";
    }
    xhr.onload = function () {
      loading = false;
      if (xhr.status < 200 || xhr.status >= 300) {
        fail();
        return;
      }
      try {
        var items = window.ICBCCatalog.normalize(JSON.parse(xhr.responseText));
        var list = $("sermon-list");
        list.textContent = "";
        items.forEach(function (item) {
          var button = document.createElement("button");
          button.className = "sermon";
          button.setAttribute("data-nav", "");
          var title = document.createElement("span");
          title.textContent = item.title;
          var detail = document.createElement("small");
          detail.textContent =
            [item.date, item.speaker].filter(Boolean).join(" • ") ||
            "Watch sermon";
          button.appendChild(title);
          button.appendChild(detail);
          button.onclick = function () {
            open(item);
          };
          list.appendChild(button);
        });
        $("catalog-status").textContent = items.length
          ? ""
          : "No sermons are available yet. Please check back soon.";
      } catch (e) {
        $("catalog-status").textContent =
          "The sermon catalog could not be read. Please try Refresh later.";
      }
    };
    xhr.onerror = xhr.ontimeout = fail;
    xhr.send();
  }
  function candidates() {
    var scope = $("exit-dialog").open
      ? $("exit-dialog")
      : playing
        ? $("player")
        : $("home");
    return Array.prototype.slice
      .call(scope.querySelectorAll("[data-nav]"))
      .filter(function (el) {
        return !el.disabled && el.getClientRects().length;
      });
  }
  function move(key) {
    var buttons = candidates(),
      current = document.activeElement;
    if (buttons.indexOf(current) < 0) {
      if (buttons[0]) buttons[0].focus();
      return;
    }
    var rect = current.getBoundingClientRect(),
      cx = rect.left + rect.width / 2,
      cy = rect.top + rect.height / 2,
      best = null,
      score = Infinity;
    buttons.forEach(function (el) {
      if (el === current) return;
      var r = el.getBoundingClientRect(),
        dx = r.left + r.width / 2 - cx,
        dy = r.top + r.height / 2 - cy,
        primary = key === 37 ? -dx : key === 39 ? dx : key === 38 ? -dy : dy,
        secondary = key === 37 || key === 39 ? Math.abs(dy) : Math.abs(dx);
      if (primary <= 5) return;
      var value = primary + secondary * 3;
      if (value < score) {
        best = el;
        score = value;
      }
    });
    if (best) {
      best.focus();
      best.scrollIntoView({ block: "nearest" });
    }
  }
  $("live").onclick = function () {
    open({
      title: "ICBC • Watch Live",
      url: "https://live.irvingcollege.church/hls/stream.m3u8",
      live: true,
    });
  };
  $("browse").onclick = function () {
    $("sermons").scrollIntoView({ block: "start" });
    var first = $("sermon-list").querySelector("button");
    (first || $("refresh")).focus();
  };
  $("refresh").onclick = load;
  $("close").onclick = close;
  $("toggle").onclick = function () {
    platform.toggle();
  };
  $("rewind").onclick = function () {
    platform.seek(-30);
  };
  $("forward").onclick = function () {
    platform.seek(30);
  };
  $("retry").onclick = function () {
    if (playing) platform.open(playing.url);
  };
  $("stay").onclick = function () {
    $("exit-dialog").close();
    $("live").focus();
  };
  $("exit").onclick = function () {
    platform.exit();
  };
  document.addEventListener("keydown", function (event) {
    var mediaKeys = {
      MediaPlayPause: 10252,
      MediaPlay: 415,
      MediaPause: 19,
      MediaStop: 413,
      MediaTrackPrevious: 412,
      MediaTrackNext: 417,
    };
    var key = mediaKeys[event.key] || event.keyCode;
    if (
      [37, 38, 39, 40, 13, 27, 10009, 415, 19, 10252, 413, 412, 417].indexOf(
        key
      ) < 0
    )
      return;
    event.preventDefault();
    if (key >= 37 && key <= 40) move(key);
    else if (key === 13) {
      if (
        document.activeElement &&
        document.activeElement.matches("[data-nav]")
      )
        document.activeElement.click();
    } else if (key === 27 || key === 10009) back();
    else if (playing) {
      if (key === 413) close();
      else if (key === 415) platform.resume();
      else if (key === 19) platform.pause();
      else if (key === 10252) platform.toggle();
      else if (!playing.live) platform.seek(key === 412 ? -30 : 30);
    }
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && playing) platform.pause();
  });
  window.addEventListener("pagehide", function () {
    platform.close();
  });
  $("live").focus();
  load();
})();
