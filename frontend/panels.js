/* Four corner panels: discoveries, fun facts, market prices, assistant.
   Uses the same I18N dictionary and #lang-select as app.js.
   Load order: i18n.js, panels-i18n.js, config.js, app.js, panels.js */
(function () {
  "use strict";

  var CFG = window.FARM_CONFIG || {};
  var sel = document.getElementById("lang-select");

  function lang() { return (sel && sel.value) || "kn"; }

  function tt(key) {
    var dict = I18N[lang()] || {};
    return dict[key] !== undefined ? dict[key] : (I18N.en || {})[key] || "";
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text != null) { e.textContent = text; }
    return e;
  }

  var D_LINKS = [
    "https://www.fertilizerdaily.com/20250814-drones-and-ai-offer-faster-corn-health-checks-study-finds/",
    "https://unh.edu/news/2026/02/how-your-corn-growing-aerial-surveillance-provides-answers"
  ];

  var CROPS = [
    { key: "tomato", re: /tomato/i },
    { key: "onion", re: /onion/i },
    { key: "ragi", re: /ragi|finger/i },
    { key: "paddy", re: /paddy|dhan/i }
  ];

  // Illustrative numbers only, shown when live data cannot be loaded.
  var SAMPLE = {
    tomato: { min: 1500, max: 2500, modal: 2000 },
    onion: { min: 1200, max: 2200, modal: 1800 },
    ragi: { min: 3000, max: 4000, modal: 3500 },
    paddy: { min: 2000, max: 2600, modal: 2300 }
  };

  var priceState = { mode: "loading", data: null };

  function renderTexts() {
    var d = document.getElementById("discoveries-list");
    d.textContent = "";
    ["d1", "d2"].forEach(function (k, i) {
      var item = el("div", "item", tt(k) + " ");
      var a = el("a", null, tt("source"));
      a.href = D_LINKS[i];
      a.target = "_blank";
      a.rel = "noopener";
      item.appendChild(a);
      d.appendChild(item);
    });

    var f = document.getElementById("facts-list");
    f.textContent = "";
    ["f1", "f2", "f3"].forEach(function (k) { f.appendChild(el("div", "item", tt(k))); });

    document.getElementById("chat-input").placeholder = tt("chat_ph");
  }

  function renderPrices() {
    var list = document.getElementById("price-list");
    list.textContent = "";
    document.getElementById("price-unit").textContent = tt("price_unit");
    var status = document.getElementById("price-status");

    if (priceState.mode === "loading") {
      status.textContent = tt("price_loading");
      return;
    }
    status.textContent = priceState.mode === "live" ? tt("price_live") : tt("price_sample");

    CROPS.forEach(function (c) {
      var p = priceState.data[c.key];
      if (!p) { return; }
      var row = el("div", "price-row");
      var left = el("div");
      left.appendChild(el("div", "crop", tt("crop_" + c.key)));
      left.appendChild(el("div", "range", p.min + " – " + p.max));
      row.appendChild(left);
      row.appendChild(el("div", "modal", tt("modal") + ": " + p.modal));
      list.appendChild(row);
    });
  }

  function median(nums) {
    var a = nums.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2);
  }

  function loadPrices() {
    if (!CFG.DATA_GOV_API_KEY) {
      priceState = { mode: "sample", data: SAMPLE };
      renderPrices();
      return;
    }
    var url = "https://api.data.gov.in/resource/" + encodeURIComponent(CFG.PRICE_RESOURCE_ID) +
      "?api-key=" + encodeURIComponent(CFG.DATA_GOV_API_KEY) +
      "&format=json&limit=500&filters%5Bstate.keyword%5D=" + encodeURIComponent(CFG.STATE || "Karnataka");

    fetch(url)
      .then(function (r) {
        if (!r.ok) { throw new Error("HTTP " + r.status); }
        return r.json();
      })
      .then(function (json) {
        var rows = json.records || [];
        var out = {};
        CROPS.forEach(function (c) {
          var m = rows.filter(function (r) { return c.re.test(r.commodity || ""); });
          var modal = m.map(function (r) { return Number(r.modal_price); }).filter(isFinite);
          var mins = m.map(function (r) { return Number(r.min_price); }).filter(isFinite);
          var maxs = m.map(function (r) { return Number(r.max_price); }).filter(isFinite);
          if (modal.length) {
            out[c.key] = { modal: median(modal), min: Math.min.apply(null, mins), max: Math.max.apply(null, maxs) };
          }
        });
        if (!Object.keys(out).length) { throw new Error("no matching records"); }
        priceState = { mode: "live", data: out };
        renderPrices();
      })
      .catch(function (err) {
        console.warn("Price API failed, using sample prices:", err);
        priceState = { mode: "sample", data: SAMPLE };
        renderPrices();
      });
  }

  function addMsg(text, who) {
    var log = document.getElementById("chat-log");
    log.appendChild(el("p", "msg " + who, text));
    log.scrollTop = log.scrollHeight;
  }

  function initChat() {
    document.getElementById("chat-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("chat-input");
      var msg = input.value.trim();
      if (!msg) { return; }
      input.value = "";
      addMsg(msg, "user");

      if (!CFG.API_BASE) {
        addMsg(tt("chat_off"), "bot");
        return;
      }
      fetch(CFG.API_BASE.replace(/\/$/, "") + "/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, lang: lang() })
      })
        .then(function (r) {
          if (!r.ok) { throw new Error("HTTP " + r.status); }
          return r.json();
        })
        .then(function (j) { addMsg(j.reply || "…", "bot"); })
        .catch(function () { addMsg(tt("chat_off"), "bot"); });
    });
  }

  function refresh() {
    renderTexts();
    renderPrices();
  }

  refresh();
  loadPrices();
  initChat();
  if (sel) { sel.addEventListener("change", refresh); }
})();