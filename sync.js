/* korean-audio cross-device progress sync (single user) */
(function () {
  var API = "/api/progress";
  var PREFIX = "cafe_";
  var TS_KEY = "cafe_sync_ts";
  var APPLIED = "__ka_sync_applied";
  var SAVE_DEBOUNCE = 1500;

  var rawSet = localStorage.setItem;

  function collect() {
    var out = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(PREFIX) === 0 && k !== TS_KEY) {
        out[k] = localStorage.getItem(k);
      }
    }
    return out;
  }

  function apply(data) {
    if (!data) return false;
    var changed = false;
    Object.keys(data).forEach(function (k) {
      if (k.indexOf(PREFIX) !== 0) return;
      if (localStorage.getItem(k) !== data[k]) {
        rawSet.call(localStorage, k, data[k]);
        changed = true;
      }
    });
    return changed;
  }

  var saveTimer = null;
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(save, SAVE_DEBOUNCE);
  }

  function save() {
    var payload = { ts: Date.now(), keys: collect() };
    rawSet.call(localStorage, TS_KEY, String(payload.ts));
    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(function () {});
  }

  localStorage.setItem = function (k, v) {
    rawSet.apply(this, arguments);
    if (typeof k === "string" && k.indexOf(PREFIX) === 0 && k !== TS_KEY) {
      scheduleSave();
    }
  };

  function init() {
    fetch(API, { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.ok) return;
        var remote = res.data;
        if (!remote || !remote.keys) return;
        var localTs = parseInt(localStorage.getItem(TS_KEY) || "0", 10);
        var remoteTs = remote.ts || 0;
        var localHasData = Object.keys(collect()).length > 0;
        if (remoteTs > localTs || !localHasData) {
          var changed = apply(remote.keys);
          rawSet.call(localStorage, TS_KEY, String(remoteTs || Date.now()));
          if (changed && !sessionStorage.getItem(APPLIED)) {
            sessionStorage.setItem(APPLIED, "1");
            location.reload();
          }
        }
      })
      .catch(function () {});
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") save();
  });

  init();
})();
