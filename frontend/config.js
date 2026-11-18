// Settings for the corner panels. This file is public in the repo,
// so do not put a secret key here that you cannot afford to expose.
window.FARM_CONFIG = {
  // Free key from https://data.gov.in (leave empty to show sample prices).
  DATA_GOV_API_KEY: "",
  // Resource ID of the "Variety-wise Daily Market Prices" dataset. Check it on the dataset page.
  PRICE_RESOURCE_ID: "9ef84268-d588-465a-a308-a864a43d0070",
  STATE: "Karnataka",
  // Backend base URL for the assistant, e.g. "http://localhost:8000".
  // The page sends POST {API_BASE}/chat with {message, lang} and expects {reply}.
  API_BASE: ""
};