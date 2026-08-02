/* korean-audio cross-device progress sync (single user) */
(function () {
    var API = "/api/progress";
    var PREFIX = "cafe_";
    var TS_KEY = "cafe_sync_ts";
    var APPLIED = "__ka_sync_applied";
    var SAVE_DEBOUNCE = 1500;

   var rawSet = localStorage.setItem.bind(localStorage);

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

   var saveTimer = null;
    function scheduleSave() {
          if (saveTimer) clearTimeout(saveTimer);
          saveTimer = setTimeout(doSave, SAVE_DEBOUNCE);
    }

   function doSave() {
         saveTimer = null;
         var ts = Date.now();
         var payload = { ts: ts, keys: collect() };
         try { rawSet(TS_KEY, String(ts)); } catch (e) {}
         fetch(API, {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify(payload),
                 keepalive: true
         }).catch(function () {});
   }

   // Hook writes to cafe_* keys -> schedule a save
   localStorage.setItem = function (k, v) {
         rawSet(k, v);
         if (k && k.indexOf(PREFIX) === 0 && k !== TS_KEY) scheduleSave();
   };

   window.addEventListener("visibilitychange", function () {
         if (document.visibilityState === "hidden" && saveTimer) doSave();
   });

   // Initial load: pull from server, restore if server is newer, reload once.
   fetch(API, { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (j) {
              var data = j && j.data;
              if (!data || !data.keys) return;
              var serverTs = Number(data.ts) || 0;
              var localTs = Number(localStorage.getItem(TS_KEY)) || 0;
              var localEmpty = Object.keys(collect()).length === 0;
              var alreadyApplied = sessionStorage.getItem(APPLIED) === String(serverTs);
              if (alreadyApplied) return;
              if (serverTs > localTs || localEmpty) {
                        var keys = data.keys;
                        for (var k in keys) {
                                    if (Object.prototype.hasOwnProperty.call(keys, k)) rawSet(k, keys[k]);
                        }
                        rawSet(TS_KEY, String(serverTs));
                        sessionStorage.setItem(APPLIED, String(serverTs));
                        location.reload();
              } else {
                        sessionStorage.setItem(APPLIED, String(serverTs));
              }
      })
      .catch(function () {});
})();
