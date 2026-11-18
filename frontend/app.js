// ============================================================
// FarmHealth AI - frontend/app.js  (merged version)
// Follows the team contract: form fields "file" + "lang",
// stats keys healthy_pct / moderate_pct / stressed_pct / non_crop_pct.
// Plain JavaScript. Needs Chart.js and i18n.js loaded in index.html.
// ============================================================
(function () {
  "use strict";

  // ================== SETTINGS ==================
  const USE_MOCK = true;                           // true = fake result (no backend needed)
  const API_URL = "http://localhost:8000/analyze"; // change when the backend is ready
  const DEFAULT_LANG = "kn";                       // Kannada first

  const LANGUAGES = [
    { code: "kn", name: "ಕನ್ನಡ (Kannada)",   speech: "kn-IN" },
    { code: "en", name: "English",            speech: "en-IN" },
    { code: "hi", name: "हिन्दी (Hindi)",      speech: "hi-IN" },
    { code: "ta", name: "தமிழ் (Tamil)",       speech: "ta-IN" },
    { code: "te", name: "తెలుగు (Telugu)",     speech: "te-IN" },
    { code: "ml", name: "മലയാളം (Malayalam)",  speech: "ml-IN" },
    { code: "bn", name: "বাংলা (Bengali)",     speech: "bn-IN" },
    { code: "mr", name: "मराठी (Marathi)",     speech: "mr-IN" },
    { code: "gu", name: "ગુજરાતી (Gujarati)",  speech: "gu-IN" },
    { code: "pa", name: "ਪੰਜਾਬੀ (Punjabi)",    speech: "pa-IN" }
  ];

  // Team contract: 4 stats keys, in this order. The label keys point to the
  // matching legend entries in i18n.js (l0 healthy, l2 moderate, l4 stressed, l5 non-crop).
  const STAT_KEYS = ["healthy_pct", "moderate_pct", "stressed_pct", "non_crop_pct"];
  const LABEL_KEYS = ["l0", "l2", "l4", "l5"];
  const CHART_COLORS = ["#00c800", "#ffdc00", "#e60000", "#808080"];

  // ================== ELEMENTS (IDs from index.html) ==================
  const fileInput       = document.getElementById("file-input");
  const langSelect      = document.getElementById("lang-select");
  const currentLangName = document.getElementById("current-lang-name");
  const analyzeBtn      = document.getElementById("analyze-btn");
  const loadingEl       = document.getElementById("loading");
  const overlayImg      = document.getElementById("overlay-img");
  const mapPlaceholder  = document.getElementById("map-placeholder");
  const statsCanvas     = document.getElementById("stats-chart");
  const summaryText     = document.getElementById("summary-text");
  const audioPlayer     = document.getElementById("audio-player");
  const readBtn         = document.getElementById("read-btn");
  const stopBtn         = document.getElementById("stop-btn");
  const uploadTitle     = document.querySelector(".upload-title");

  let chartInstance = null;
  let lastData = null;       // last result, so we can redraw when the language changes
  let chosenFileName = "";

  summaryText.style.whiteSpace = "pre-line"; // show the line breaks in the summary

  // ================== TRANSLATION ==================
  // Look up a text in the chosen language, fall back to English, else null.
  function t(key) {
    const dict = I18N[langSelect.value] || {};
    if (dict[key] !== undefined) { return dict[key]; }
    const en = I18N.en || {};
    return en[key] !== undefined ? en[key] : null;
  }

  function currentLangObj() {
    return LANGUAGES.find(function (l) { return l.code === langSelect.value; }) || LANGUAGES[0];
  }

  function currentSpeechLang() {
    return currentLangObj().speech;
  }

  // Fill every element marked data-i18n / data-i18n-alt / data-i18n-aria
  function applyLanguage() {
    document.documentElement.lang = langSelect.value;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      const v = t(el.getAttribute("data-i18n"));
      if (v !== null) { el.textContent = v; }
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      const v = t(el.getAttribute("data-i18n-alt"));
      if (v !== null) { el.setAttribute("alt", v); }
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      const v = t(el.getAttribute("data-i18n-aria"));
      if (v !== null) { el.setAttribute("aria-label", v); }
    });

    currentLangName.textContent = currentLangObj().name;

    if (uploadTitle) {
      uploadTitle.textContent = chosenFileName ? "✔ " + chosenFileName : (t("pick") || "");
    }

    if (lastData) {
      if (USE_MOCK) { summaryText.textContent = t("mock") || ""; } // mock text follows the language
      drawChart(lastData.stats);
    } else {
      summaryText.textContent = t("sum_ph") || "";
    }
  }

  function buildLanguageDropdown() {
    langSelect.textContent = "";
    LANGUAGES.forEach(function (lang) {
      const opt = document.createElement("option");
      opt.value = lang.code;
      opt.textContent = lang.name;
      langSelect.appendChild(opt);
    });
    langSelect.value = DEFAULT_LANG;
  }

  // ================== SMALL HELPERS ==================
  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function showError(message) {
    console.error(message);
    alert(message);
  }

  function isGoodImage(file) {
    return !!file && /^image\/(jpeg|png)$/.test(file.type);
  }

  function setLoading(on) {
    loadingEl.hidden = !on;
    analyzeBtn.disabled = on;
  }

  // ================== BACKEND / MOCK ==================
  // Sends form fields "file" (the image) and "lang" (e.g. "kn").
  // Expected JSON back:
  // { "overlay_image": "<url or data:image/png;base64,...>",
  //   "stats": { "healthy_pct": n, "moderate_pct": n, "stressed_pct": n, "non_crop_pct": n },
  //   "summary": "text in the chosen language",
  //   "audio_url": "<url to mp3, optional>" }
  async function realAnalyze(file) {
    const form = new FormData();
    form.append("file", file);
    form.append("lang", langSelect.value);
    const res = await fetch(API_URL, { method: "POST", body: form });
    if (!res.ok) { throw new Error("Server error " + res.status); }
    return await res.json();
  }

  // Fake result so the page can be tested without a backend
  async function mockAnalyze(file) {
    await sleep(1500);
    return {
      overlay_image: URL.createObjectURL(file),
      stats: { healthy_pct: 60, moderate_pct: 15, stressed_pct: 15, non_crop_pct: 10 },
      summary: t("mock") || "",
      audio_url: ""
    };
  }

  function getResult(file) {
    return USE_MOCK ? mockAnalyze(file) : realAnalyze(file);
  }

  // ================== SHOW THE RESULT ==================
  function showResult(data) {
    lastData = data;
    overlayImg.src = data.overlay_image || data.overlay_url || "";
    if (mapPlaceholder) { mapPlaceholder.hidden = true; }
    summaryText.textContent = data.summary || "";

    if (data.audio_url) {
      audioPlayer.src = data.audio_url;
    } else {
      audioPlayer.removeAttribute("src");
    }

    drawChart(data.stats);
  }

  // Legend text looks like "Green – Healthy crops": keep the part after " – "
  function chartLabels() {
    return LABEL_KEYS.map(function (k) {
      const parts = (t(k) || k).split(" – ");
      return parts[parts.length - 1];
    });
  }

  function drawChart(stats) {
    if (typeof Chart === "undefined") {
      showError("Chart.js is not loaded. Check the <script> tag in index.html.");
      return;
    }

    const s = stats || {};
    const numbers = STAT_KEYS.map(function (k) { return Number(s[k]) || 0; });

    if (chartInstance) { chartInstance.destroy(); }
    chartInstance = new Chart(statsCanvas, {
      type: "doughnut",
      data: {
        labels: chartLabels(),
        datasets: [{ data: numbers, backgroundColor: CHART_COLORS, borderColor: "#ffffff", borderWidth: 2 }]
      },
      options: {
        plugins: {
          legend: { position: "bottom", labels: { font: { size: 14 } } }
        }
      }
    });
  }

  // ================== EVENTS ==================
  langSelect.addEventListener("change", applyLanguage);

  fileInput.addEventListener("change", function () {
    const file = fileInput.files[0];
    chosenFileName = file ? file.name : "";
    if (uploadTitle) {
      uploadTitle.textContent = file ? "✔ " + file.name : (t("pick") || "");
    }
  });

  analyzeBtn.addEventListener("click", async function () {
    const file = fileInput.files[0];

    if (!file) { showError(t("no_file") || "Please choose a drone photo first."); return; }
    if (!isGoodImage(file)) { showError(t("bad_type") || "Please choose a JPG or PNG image only."); return; }

    setLoading(true);
    try {
      const data = await getResult(file);
      showResult(data);
    } catch (err) {
      console.error(err);
      summaryText.textContent = t("error") || "Analysis failed.";
    } finally {
      setLoading(false);
    }
  });

  // ================== READ ALOUD (browser voice) ==================
  if (readBtn) {
    readBtn.addEventListener("click", function () {
      const text = summaryText.textContent.trim();
      if (!text || !("speechSynthesis" in window)) { return; }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = currentSpeechLang(); // e.g. "kn-IN"
      window.speechSynthesis.speak(utter);
    });
  }

  if (stopBtn) {
    stopBtn.addEventListener("click", function () {
      if ("speechSynthesis" in window) { window.speechSynthesis.cancel(); }
      audioPlayer.pause();
    });
  }

  // ================== START ==================
  loadingEl.hidden = true;
  buildLanguageDropdown();
  applyLanguage();
})();