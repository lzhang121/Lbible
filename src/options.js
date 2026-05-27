const geminiEnabledEl = document.getElementById("geminiEnabled");
const geminiApiKeyEl = document.getElementById("geminiApiKey");
const groqEnabledEl = document.getElementById("groqEnabled");
const groqApiKeyEl = document.getElementById("groqApiKey");
const openrouterEnabledEl = document.getElementById("openrouterEnabled");
const openrouterApiKeyEl = document.getElementById("openrouterApiKey");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");

const STORAGE_KEYS = [
  "geminiEnabled",
  "geminiApiKey",
  "groqEnabled",
  "groqApiKey",
  "openrouterEnabled",
  "openrouterApiKey"
];

async function loadSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS);
  geminiEnabledEl.checked = Boolean(stored.geminiEnabled);
  geminiApiKeyEl.value = stored.geminiApiKey || "";
  groqEnabledEl.checked = Boolean(stored.groqEnabled);
  groqApiKeyEl.value = stored.groqApiKey || "";
  openrouterEnabledEl.checked = Boolean(stored.openrouterEnabled);
  openrouterApiKeyEl.value = stored.openrouterApiKey || "";
}

function showStatus(message, type = "ok") {
  statusEl.textContent = message;
  statusEl.className = type;
}

saveBtn.addEventListener("click", async () => {
  const geminiEnabled = geminiEnabledEl.checked;
  const geminiApiKey = geminiApiKeyEl.value.trim();
  const groqEnabled = groqEnabledEl.checked;
  const groqApiKey = groqApiKeyEl.value.trim();
  const openrouterEnabled = openrouterEnabledEl.checked;
  const openrouterApiKey = openrouterApiKeyEl.value.trim();

  if (geminiEnabled && !geminiApiKey) {
    showStatus("请先填写 Gemini API Key，或关闭 Gemini 开关。", "err");
    return;
  }

  if (groqEnabled && !groqApiKey) {
    showStatus("请先填写 Groq API Key，或关闭 Groq 开关。", "err");
    return;
  }

  if (openrouterEnabled && !openrouterApiKey) {
    showStatus("请先填写 OpenRouter API Key，或关闭 OpenRouter 开关。", "err");
    return;
  }

  await chrome.storage.local.set({
    geminiEnabled,
    geminiApiKey,
    groqEnabled,
    groqApiKey,
    openrouterEnabled,
    openrouterApiKey
  });
  showStatus("已保存。");
});

void loadSettings();
