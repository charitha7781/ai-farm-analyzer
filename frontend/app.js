// ============================================================
// FarmHealth AI - frontend/app.js  (merged version)
// Follows the team contract: form fields "file" + "lang",
// stats keys healthy_pct / moderate_pct / stressed_pct / non_crop_pct.
// Plain JavaScript. Needs Chart.js loaded in index.html.
// ============================================================

// ================== SETTINGS ==================
const USE_MOCK = true;                          // true = fake result (no backend needed)
const API_URL = "http://localhost:8000/analyze"; // change when the backend is ready
const DEFAULT_LANG = "kn";                      // Kannada first

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

// Same order and colours as the map legend (classes 0 to 5)
const CHART_LABELS = [
  "ಆರೋಗ್ಯಕರ", "ಸ್ವಲ್ಪ ಆರೋಗ್ಯಕರ", "ಮಧ್ಯಮ ಒತ್ತಡ",
  "ಹೆಚ್ಚು ಒತ್ತಡ", "ತೀವ್ರ ಒತ್ತಡ", "ಬೆಳೆ ಇಲ್ಲದ ಪ್ರದೇಶ"
];
const CHART_COLORS = ["#00c800", "#64f096", "#ffdc00", "#ff8c00", "#e60000", "#808080"];

const MSG = {
  noFile: "ದಯವಿಟ್ಟು ಮೊದಲು ಡ್ರೋನ್ ಫೋಟೋ ಆಯ್ಕೆ ಮಾಡಿ.",
  badType: "JPG ಅಥವಾ PNG ಚಿತ್ರವನ್ನು ಮಾತ್ರ ಆಯ್ಕೆ ಮಾಡಿ.",
  error: "ಕ್ಷಮಿಸಿ, ವಿಶ್ಲೇಷಣೆ ವಿಫಲವಾಯಿತು. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ."
};

// ================== ELEMENTS (IDs from index.html) ==================
const fileInput   = document.getElementById("file-input");
const langSelect  = document.getElementById("lang-select");
const analyzeBtn  = document.getElementById("analyze-btn");
const loadingEl   = document.getElementById("loading");
const overlayImg  = document.getElementById("overlay-img");
const statsCanvas = document.getElementById("stats-chart");
const summaryText = document.getElementById("summary-text");
const audioPlayer = document.getElementById("audio-player");
const statsCanvas = document.getElementById("stats-chart");
const readBtn     = document.getElementById("read-btn");
const stopBtn     = document.getElementById("stop-btn");
const uploadTitle = document.querySelector(".upload-title");

let chartInstance = null;

// ================== LANGUAGE DROPDOWN ==================
LANGUAGES.forEach(function (lang) {
  const opt = document.createElement("option");
  opt.value = lang.code;
  opt.textContent = lang.name;
  langSelect.appendChild(opt);
});
langSelect.value = DEFAULT_LANG;

function currentSpeechLang() {
  const found = LANGUAGES.find(function (l) { return l.code === langSelect.value; });
  return found ? found.speech : "kn-IN";
}

// ================== FILE CHOICE ==================
fileInput.addEventListener("change", function () {
  const file = fileInput.files[0];
  if (file) { uploadTitle.textContent = "✔ " + file.name; }
});

// ================== ANALYZE ==================
analyzeBtn.addEventListener("click", async function () {
  const file = fileInput.files[0];
  if (!file) { alert(MSG.noFile); return; }
  if (!/^image\/(jpeg|png)$/.test(file.type)) { alert(MSG.badType); return; }

  setLoading(true);
  try {
    const result = USE_MOCK ? await mockAnalyze(file) : await realAnalyze(file);
    showResult(result);
  } catch (err) {
    console.error(err);
    summaryText.textContent = MSG.error;
  } finally {
    setLoading(false);
  }
});

function setLoading(on) {
  loadingEl.hidden = !on;
  analyzeBtn.disabled = on;
}

// Real backend call.
// Expected JSON back:
// { "overlay_image": "<url or data:image/png;base64,...>",
//   "stats": [p0, p1, p2, p3, p4, p5],      // numbers for classes 0..5
//   "summary": "text in the chosen language",
//   "audio_url": "<url to mp3, optional>" }
async function realAnalyze(file) {
  const form = new FormData();
  form.append("image", file);
  form.append("lang", langSelect.value);
  const res = await fetch(API_URL, { method: "POST", body: form });
  if (!res.ok) { throw new Error("Server error " + res.status); }
  return await res.json();
}

// Fake result so the page can be tested without a backend
async function mockAnalyze(file) {
  await new Promise(function (r) { setTimeout(r, 1500); });
  return {
    overlay_image: URL.createObjectURL(file),
    stats: [40, 20, 15, 10, 5, 10],
    summary:
      "ನಿಮ್ಮ ಹೊಲದ ಸುಮಾರು 60% ಬೆಳೆ ಆರೋಗ್ಯವಾಗಿದೆ.\n" +
      "15% ಭಾಗದಲ್ಲಿ ಮಧ್ಯಮ ಒತ್ತಡ ಇದೆ.\n" +
      "15% ಭಾಗದಲ್ಲಿ ಹೆಚ್ಚು ಅಥವಾ ತೀವ್ರ ಒತ್ತಡ ಇದೆ — ಕೆಂಪು ಮತ್ತು ಕಿತ್ತಳೆ ಭಾಗಗಳನ್ನು ಮೊದಲು ಪರಿಶೀಲಿಸಿ.\n" +
      "(ಇದು ಪರೀಕ್ಷಾ ಮಾದರಿ ಫಲಿತಾಂಶ)",
    audio_url: ""
  };
}

// ================== SHOW THE RESULT ==================
function showResult(data) {
  overlayImg.src = data.overlay_image;
  summaryText.textContent = data.summary || "";

  if (data.audio_url) {
    audioPlayer.src = data.audio_url;
  } else {
    audioPlayer.removeAttribute("src");
  }

  lastStats = data.stats;
  drawChart(lastStats);
}

// Chart labels come from the legend text (the part after " – ")
function chartLabels() {
  return [0, 1, 2, 3, 4, 5].map(function (i) {
    const parts = t("l" + i).split(" – ");
    return parts[parts.length - 1];
  });
}

function drawChart(stats) {
  if (typeof Chart === "undefined") {
    showError("Chart.js is not loaded. Check the <script> tag in index.html.");
    return;
  }

  const s = stats || {};
  const numbers = [
    s.healthy_pct || 0,
    s.moderate_pct || 0,
    s.stressed_pct || 0,
    s.non_crop_pct || 0,
  ];

  if (chartInstance) { chartInstance.destroy(); }
  chartInstance = new Chart(statsCanvas, {
    type: "doughnut",
    data: {
      labels: CHART_LABELS,
      datasets: [{ data: counts, backgroundColor: CHART_COLORS, borderColor: "#ffffff", borderWidth: 2 }]
    },
    options: {
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 14 } } }
      }
    }
  });
}

// ================== ANALYZE BUTTON ==================
analyzeBtn.addEventListener("click", async function () {
  clearError();
  const file = fileInput.files[0];

  if (!USE_MOCK && !file) { showError(MSG.noFile); return; }
  if (file && !isGoodImage(file)) { showError(MSG.badType); return; }

  setLoading(true);
  try {
    const data = await getResult(file);
    showResult(data);
  } catch (err) {
    console.error(err);
    showError(MSG.error);
  } finally {
    setLoading(false);
  }
});

// ================== LIVE FEED (one image every 3 seconds) ==================
simulateBtn.addEventListener("click", async function () {
  clearError();
  const files = Array.from(fileInput.files);

  if (!USE_MOCK && files.length === 0) { showError(MSG.noFile); return; }
  if (files.some(function (f) { return !isGoodImage(f); })) {
    showError(MSG.badType);
    return;
  }

  // In mock mode with no files, pretend there are 3 images
  const items = files.length > 0 ? files : [null, null, null];

  for (let i = 0; i < items.length; i++) {
    setLoading(true);
    try {
      const data = await getResult(items[i]);
      showResult(data);
    } catch (err) {
      console.error(err);
      showError(MSG.error);
      setLoading(false);
      return;
    }
    setLoading(false);

    if (i < items.length - 1) { await sleep(3000); }
  }
});

// ================== READ ALOUD (browser voice) ==================
if (readBtn) {
  readBtn.addEventListener("click", function () {
    const text = summaryText.textContent.trim();
    if (!text || !("speechSynthesis" in window)) { return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = langSelect.value + "-IN"; // e.g. "kn-IN"
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
loadLanguages();