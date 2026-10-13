(function (root) {
  "use strict";
  var BASE = "https://live.irvingcollege.church/sermons/";
  function mediaUrl(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      var url = new URL(value, BASE);
      return url.protocol === "https:" &&
        url.origin === "https://live.irvingcollege.church" &&
        /\.(mp4|m3u8)$/i.test(url.pathname)
        ? url.href
        : null;
    } catch (e) {
      return null;
    }
  }
  function normalize(data) {
    var rows = Array.isArray(data)
      ? data
      : data && (data.sermons || data.items);
    if (!Array.isArray(rows))
      throw new Error("The sermon catalog has an unsupported format.");
    return rows
      .map(function (row, index) {
        if (!row || typeof row !== "object") return null;
        var url = mediaUrl(
          row.url ||
            row.videoUrl ||
            row.video_url ||
            row.video ||
            row.file ||
            row.filename ||
            row.src,
        );
        if (!url) return null;
        return {
          id: String(row.id || index),
          title: String(row.title || row.name || "Sermon"),
          speaker: String(row.speaker || row.preacher || ""),
          date: typeof row.date === "string" ? row.date : "",
          url: url,
        };
      })
      .filter(Boolean);
  }
  var api = { normalize: normalize, mediaUrl: mediaUrl };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ICBCCatalog = api;
})(typeof window !== "undefined" ? window : globalThis);
