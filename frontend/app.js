// ============================================================
// FarmHealth AI - frontend/app.js  (merged version)
// Follows the team contract: form fields "file" + "lang",
// stats keys healthy_pct / moderate_pct / stressed_pct / non_crop_pct.
// Plain JavaScript. Needs Chart.js loaded in index.html.
// ============================================================

// ================== SETTINGS ==================
// true  = read /mock_response.json (no backend needed)
// false = call the real backend POST /analyze
const USE_MOCK = true;

const DEFAULT_LANG = "kn"; // Kannada first

// Backup list if /languages cannot be loaded
const FALLBACK_LANGUAGES = {
  en: "English", hi: "हिन्दी", te: "తెలుగు", ta: "தமிழ்",
  kn: "ಕನ್ನಡ", ml: "മലയാളം", mr: "मराठी", bn: "বাংলা",
};

// 4 classes, same order as the labels: 0 healthy, 1 moderate, 2 stressed, 3 non-crop
const CHART_LABELS = ["ಆರೋಗ್ಯಕರ", "ಮಧ್ಯಮ ಒತ್ತಡ", "ತೀವ್ರ ಒತ್ತಡ", "ಬೆಳೆ ಇಲ್ಲದ ಪ್ರದೇಶ"];
const CHART_COLORS = ["#00c800", "#ffdc00", "#e60000", "#808080"]; // green, yellow, red, grey

const MSG = {
  noFile: "ದಯವಿಟ್ಟು ಮೊದಲು ಡ್ರೋನ್ ಫೋಟೋ ಆಯ್ಕೆ ಮಾಡಿ.",
  badType: "JPG ಅಥವಾ PNG ಚಿತ್ರವನ್ನು ಮಾತ್ರ ಆಯ್ಕೆ ಮಾಡಿ.",
  error: "ಕ್ಷಮಿಸಿ, ವಿಶ್ಲೇಷಣೆ ವಿಫಲವಾಯಿತು. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
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
const readBtn     = document.getElementById("read-btn");   // may be missing
const stopBtn     = document.getElementById("stop-btn");   // may be missing
const uploadTitle = document.querySelector(".upload-title"); // may be missing

let chartInstance = null;

// ================== EXTRA ELEMENTS CREATED BY JS ==================
// Red error message under the Analyze button
const errorBox = document.createElement("div");
errorBox.style.color = "#b00020";
errorBox.style.fontWeight = "600";
errorBox.style.marginTop = "12px";
errorBox.style.display = "none";
analyzeBtn.insertAdjacentElement("afterend", errorBox);

// Stretch goal: "Simulate live feed" button
const simulateBtn = document.createElement("button");
simulateBtn.id = "simulate-btn";
simulateBtn.type = "button";
simulateBtn.className = "btn btn-secondary";
simulateBtn.style.marginTop = "12px";
simulateBtn.textContent = "Simulate live feed";
analyzeBtn.insertAdjacentElement("afterend", simulateBtn);

// Allow choosing several images (needed for the live feed)
fileInput.multiple = true;

// ================== SMALL HELPERS ==================
function showError(message) {
  errorBox.textContent = message;
  errorBox.style.display = "block";
}

function clearError() {
  errorBox.textContent = "";
  errorBox.style.display = "none";
}

function setLoading(on) {
  loadingEl.hidden = !on; // the CSS controls how the spinner looks
  analyzeBtn.disabled = on;
  simulateBtn.disabled = on;
}

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function isGoodImage(file) {
  return /^image\/(jpeg|png)$/.test(file.type);
}

// ================== LANGUAGE DROPDOWN ==================
async function loadLanguages() {
  let languages;
  try {
    const response = await fetch("/languages");
    if (!response.ok) { throw new Error("Bad status " + response.status); }
    languages = await response.json();
  } catch (err) {
    console.warn("Could not load /languages, using backup list.", err);
    languages = FALLBACK_LANGUAGES;
  }

  langSelect.innerHTML = "";
  for (const code in languages) {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = languages[code];
    langSelect.appendChild(option);
  }

  if (languages[DEFAULT_LANG]) {
    langSelect.value = DEFAULT_LANG; // Kannada first
  }
}

// ================== FILE CHOICE ==================
fileInput.addEventListener("change", function () {
  if (!uploadTitle) { return; }
  const count = fileInput.files.length;
  if (count === 1) {
    uploadTitle.textContent = "✔ " + fileInput.files[0].name;
  } else if (count > 1) {
    uploadTitle.textContent = "✔ " + count + " images";
  }
});

// ================== GET THE RESULT (mock or real) ==================
async function getResult(file) {
  // ----- MOCK MODE: read the sample JSON -----
  if (USE_MOCK) {
    const response = await fetch("/mock_response.json");
    if (!response.ok) { throw new Error("Could not load /mock_response.json"); }
    const data = await response.json();
    // If the user picked a photo, show it so the demo looks real
    if (file) { data.overlay_image = URL.createObjectURL(file); }
    return data;
  }

  // ----- REAL MODE: send file + lang to the backend -----
  const formData = new FormData();
  formData.append("file", file);
  formData.append("lang", langSelect.value);

  const response = await fetch("/analyze", { method: "POST", body: formData });
  if (!response.ok) { throw new Error("Server error " + response.status); }
  return await response.json();
}

// ================== SHOW THE RESULT ==================
function showResult(data) {
  // Overlay: plain base64 from the backend, or a ready link (mock photo)
  const img = data.overlay_image || "";
  const isReadyLink = /^(data:|blob:|http)/.test(img);
  overlayImg.src = isReadyLink ? img : "data:image/png;base64," + img;

  summaryText.textContent = data.summary || "";

  if (data.audio_url) {
    audioPlayer.src = data.audio_url;
  } else {
    audioPlayer.removeAttribute("src");
  }

  drawChart(data.stats);
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
      datasets: [{
        data: numbers,
        backgroundColor: CHART_COLORS,
        borderColor: "#ffffff",
        borderWidth: 2,
      }],
    },
    options: {
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 14 } } },
      },
    },
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