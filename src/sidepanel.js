import { analyzeSelection } from "./analyzer/pipeline.js";

self.addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  console.warn("Verse Parse panel:", event.reason);
});

self.addEventListener("error", (event) => {
  event.preventDefault();
  console.warn("Verse Parse panel:", event.error || event.message);
});

const statusText = document.getElementById("statusText");
const sourceText = document.getElementById("sourceText");
const translationText = document.getElementById("translationText");
const tokenList = document.getElementById("tokenList");
const verbList = document.getElementById("verbList");
const grammarList = document.getElementById("grammarList");
const warningBanner = document.getElementById("warningBanner");
const warningText = document.getElementById("warningText");
const warningRetryBtn = document.getElementById("warningRetryBtn");
const translationSection = document.getElementById("translationSection");
const copyToast = document.getElementById("copyToast");
const layoutRoot = document.getElementById("layoutRoot");
const statusBar = document.getElementById("statusBar");
const statusDot = document.getElementById("statusDot");
const aiSetupHint = document.getElementById("aiSetupHint");
const aiSetupMessage = document.getElementById("aiSetupMessage");
const aiSetupBtn = document.getElementById("aiSetupBtn");
const aiSetupDismiss = document.getElementById("aiSetupDismiss");
const skeletonBlock = document.getElementById("skeletonBlock");
const analysisBody = document.getElementById("analysisBody");
const tabBar = document.getElementById("tabBar");
const detailPanels = document.getElementById("detailPanels");
const detailSection = document.getElementById("detailSection");
const sourceSection = document.getElementById("sourceSection");
const emptyGuide = document.getElementById("emptyGuide");
const verbCount = document.getElementById("verbCount");
const tokenCount = document.getElementById("tokenCount");
const grammarCount = document.getElementById("grammarCount");
const verbFold = document.getElementById("verbFold");
const tokenFold = document.getElementById("tokenFold");
const grammarFold = document.getElementById("grammarFold");

let latestAnalysis = null;
let lastAnalysisPayload = null;
let contextTabId = null;
let activeChip = null;
let aiHintDismissed = false;
let surfaceKindMap = new Map();
let copyToastTimer = null;
let embeddedMode = false;

initTabs();
setAnalysisSectionsVisible(false);
void loadUiPrefs();
initEmbeddedListener();

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "SELECTION_CAPTURED") {
    if (!message.payload) {
      renderWarning(message.error || "未获取到选中文本。");
      setAnalysisSectionsVisible(false);
      return;
    }
    void runAnalysis(message.payload).catch((error) => {
      renderWarning(error instanceof Error ? error.message : String(error));
    });
  }
});

void bootstrap();

aiSetupBtn?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" }).catch(() => undefined);
});

aiSetupDismiss?.addEventListener("click", () => {
  void dismissAiSetupHint();
});

sourceText?.addEventListener("click", (event) => {
  const mark = event.target.closest(".source-mark");
  if (!mark) return;
  focusSurface(mark.dataset.surface || "");
});

translationSection?.addEventListener("click", () => {
  void copyTranslation();
});

warningRetryBtn?.addEventListener("click", () => {
  if (lastAnalysisPayload) {
    void runAnalysis(lastAnalysisPayload);
  }
});

function initEmbeddedListener() {
  if (window.__vpEmbeddedListener) return;
  window.__vpEmbeddedListener = true;
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!data || data.type !== "VP_ANALYZE") return;

    if (data.error) {
      renderWarning(String(data.error));
      setAnalysisSectionsVisible(false);
      setStatus("请返回页面后重新选择文本。", "hint");
      return;
    }
    if (data.payload?.text) {
      void runAnalysis(data.payload).catch((error) => {
        renderWarning(error instanceof Error ? error.message : String(error));
      });
    }
  });
}

async function bootstrap() {
  try {
    const params = new URLSearchParams(window.location.search);
    embeddedMode = params.get("embedded") === "1";
    const textFromUrl = params.get("text")?.trim() || "";
    const sourceUrlFromUrl = params.get("sourceUrl")?.trim() || "";
    const errorFromUrl = params.get("error")?.trim() || "";

    if (errorFromUrl) {
      renderWarning(errorFromUrl);
      setStatus("请返回页面后重新选择文本。", "hint");
      return;
    }

    if (textFromUrl) {
      await runAnalysis({
        text: textFromUrl,
        sourceUrl: sourceUrlFromUrl || "about:blank",
        selectionMeta: {
          hasRuby: false
        }
      });
      return;
    }

    if (embeddedMode) {
      setAnalysisSectionsVisible(false);
      setStatus("等待选区…", "hint");
      return;
    }

    const explicitTabId = Number(params.get("tabId"));
    const tabId = Number.isFinite(explicitTabId) && explicitTabId > 0
      ? explicitTabId
      : (await getActiveTabId());
    if (!tabId) return;
    contextTabId = tabId;

    const response = await chrome.runtime.sendMessage({
      type: "GET_LATEST_SELECTION",
      tabId
    }).catch(() => null);
    if (response?.payload?.text) {
      await runAnalysis(response.payload);
    } else {
      setAnalysisSectionsVisible(false);
      setStatus("请先在目标网页中选中文本，再执行 Verse Parse 分析。", "hint");
    }
  } catch (error) {
    renderWarning(error instanceof Error ? error.message : String(error));
    setStatus("分析面板加载失败。", "hint");
  }
}

function initTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if (!tab) return;
      tabButtons.forEach((b) => b.classList.toggle("is-active", b === btn));
      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.panel === tab);
      });
    });
  });
}

function setStatus(message, variant = "idle") {
  if (!statusBar || !statusText) return;
  statusText.textContent = message;
  statusBar.hidden = !message;
  statusBar.classList.toggle("is-hint", variant === "hint");
  if (statusDot) {
    statusDot.className = "status-dot";
    if (variant === "ai") statusDot.classList.add("is-ai");
    if (variant === "local") statusDot.classList.add("is-local");
    if (variant === "fallback") statusDot.classList.add("is-fallback");
    if (variant === "loading") statusDot.classList.add("is-loading");
  }
}

function setAnalyzing(on) {
  document.body.classList.toggle("is-analyzing", on);
  layoutRoot?.classList.toggle("is-analyzing", on);
  setSkeleton(on && analysisBody?.hidden);
  if (on) {
    setAiSetupHint(false);
    clearWarning();
  }
}

function setSkeleton(visible) {
  if (!skeletonBlock) return;
  skeletonBlock.hidden = !visible;
}

async function loadUiPrefs() {
  try {
    const stored = await chrome.storage.local.get("aiSetupHintDismissed");
    aiHintDismissed = Boolean(stored.aiSetupHintDismissed);
  } catch {
    aiHintDismissed = false;
  }
}

async function dismissAiSetupHint() {
  aiHintDismissed = true;
  setAiSetupHint(false);
  try {
    await chrome.storage.local.set({ aiSetupHintDismissed: true });
  } catch {
    // ignore
  }
}

function hasAiConfigured(options) {
  return Boolean(options.geminiApiKey || options.groqApiKey || options.openrouterApiKey);
}

function setAiSetupHint(visible, options = {}) {
  if (!aiSetupHint) return;
  if (aiHintDismissed) visible = false;
  aiSetupHint.hidden = !visible;
  if (!visible || !aiSetupMessage) return;

  const { geminiEnabled, groqEnabled, openrouterEnabled, rawKeys } = options;
  const hasAnyKey = Boolean(rawKeys?.gemini || rawKeys?.groq || rawKeys?.openrouter);
  const anyProviderEnabled = geminiEnabled || groqEnabled || openrouterEnabled;

  if (hasAnyKey && !anyProviderEnabled) {
    aiSetupMessage.textContent = "已保存 API Key，请在设置中启用 AI 提供方。";
  } else {
    aiSetupMessage.textContent = "本地分析翻译较简略，配置 AI 可获得更自然的结果。";
  }
}

async function getActiveTabId() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.id ?? null;
  } catch {
    return null;
  }
}

async function runAnalysis(payload) {
  lastAnalysisPayload = payload;
  try {
    clearWarning();
    setAnalyzing(true);
    setStatus("正在分析…", "loading");
    const options = await loadAnalysisOptions();
    if (hasAiConfigured(options)) {
      setStatus("正在调用 AI…", "loading");
    }
    const result = await analyzeSelection(payload, options);
    latestAnalysis = result;
    renderResult(result, options);
  } catch (error) {
    renderWarning(error instanceof Error ? error.message : String(error));
    setStatus("分析失败。", "hint");
  } finally {
    setAnalyzing(false);
  }
}

async function loadAnalysisOptions() {
  const stored = await chrome.storage.local.get([
    "geminiApiKey",
    "geminiEnabled",
    "groqApiKey",
    "groqEnabled",
    "openrouterApiKey",
    "openrouterEnabled"
  ]);
  const geminiEnabled = Boolean(stored.geminiEnabled);
  const groqEnabled = Boolean(stored.groqEnabled);
  const openrouterEnabled = Boolean(stored.openrouterEnabled);
  const geminiKey = typeof stored.geminiApiKey === "string" ? stored.geminiApiKey.trim() : "";
  const groqKey = typeof stored.groqApiKey === "string" ? stored.groqApiKey.trim() : "";
  const openrouterKey = typeof stored.openrouterApiKey === "string" ? stored.openrouterApiKey.trim() : "";
  return {
    dicPath: chrome.runtime.getURL("vendor/dict/"),
    geminiEnabled,
    groqEnabled,
    openrouterEnabled,
    geminiApiKey: geminiEnabled && geminiKey ? geminiKey : undefined,
    groqApiKey: groqEnabled && groqKey ? groqKey : undefined,
    openrouterApiKey: openrouterEnabled && openrouterKey ? openrouterKey : undefined,
    rawKeys: { gemini: geminiKey, groq: groqKey, openrouter: openrouterKey }
  };
}

function renderResult(result, options = {}) {
  activeChip = null;

  if (result?.notJapanese) {
    setAnalysisSectionsVisible(false);
    renderWarning("所选文本不含日语，请选择日文经文后再分析。");
    setStatus("", "idle");
    setAiSetupHint(false);
    return;
  }
  if (result?.tooLong) {
    setAnalysisSectionsVisible(false);
    const limit = hasAiConfigured(options) ? 500 : 200;
    renderWarning(`所选文字过长（超过${limit}字），建议选择单句分析效果更好。`);
    setStatus("", "idle");
    setAiSetupHint(false);
    return;
  }

  setAnalysisSectionsVisible(Boolean(result?.normalized));
  const normalized = result.normalized || "-";
  translationText.textContent = result.translationZh || "-";

  const verbs = result.verbTokens || [];
  const displayTokens = collectDisplayTokens(result.tokens || []);
  const grammarItems = result.grammar || [];
  const highlightEntries = buildHighlightEntries(normalized, verbs, displayTokens, grammarItems);

  renderSourceText(normalized, highlightEntries);
  renderVerbChips(verbs);
  renderNounChips(displayTokens);
  renderGrammarList(grammarItems);
  updateDetailTabs(verbs.length, displayTokens.length, grammarItems.length);

  const isAi = Boolean(result.meta?.aiUsed || result.meta?.aiProvider);
  const aiErrors = (result.meta?.errors || []).filter((e) => !String(e).includes("已改用本地分析"));
  const isFallback = !isAi && aiErrors.length > 0 && hasAiConfigured(options);

  if (isFallback) {
    renderWarning(aiErrors.join("；"), { showRetry: true });
  } else {
    clearWarning();
  }

  let modeLabel = result.meta?.aiProvider || (isAi ? "AI" : "本地");
  if (isFallback) {
    modeLabel = "本地（AI 不可用）";
  }
  setStatus(
    `${modeLabel} · ${result.meta?.elapsedMs ?? 0}ms`,
    isAi ? "ai" : (isFallback ? "fallback" : "local")
  );
  setAiSetupHint(!isAi && !hasAiConfigured(options), options);
}

function buildHighlightEntries(text, verbs, tokens, grammarItems) {
  surfaceKindMap.clear();
  const entries = [];
  const seen = new Set();

  const add = (surface, kind) => {
    if (!surface || seen.has(surface) || !text.includes(surface)) return;
    seen.add(surface);
    surfaceKindMap.set(surface, kind);
    entries.push({ surface, kind });
  };

  for (const verb of verbs) add(verb.surface, "verb");
  for (const token of tokens) add(token.surface, "noun");
  for (const item of grammarItems) add(item.pattern, "grammar");

  return entries.sort((a, b) => b.surface.length - a.surface.length);
}

function collectDisplayTokens(tokens) {
  const seen = new Set();
  return tokens.filter((t) => {
    if (isSkippableToken(t.surface) || isParticleToken(t)) return false;
    if (seen.has(t.surface)) return false;
    const reading = inferReading(t.surface, t.reading);
    if (!t.glossZh || !reading) return false;
    seen.add(t.surface);
    return true;
  });
}

function renderVerbChips(verbs) {
  verbList.innerHTML = "";
  verbCount.textContent = verbs.length ? String(verbs.length) : "";
  verbFold.hidden = verbs.length === 0;
  for (const verb of verbs) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "entry-chip is-verb";
    chip.dataset.surface = verb.surface;

    const subParts = [verb.explanation];
    if (verb.reading) subParts.push(verb.reading);
    if (verb.baseForm && verb.baseForm !== verb.surface) {
      subParts.push(verb.baseGloss ? `→ ${verb.baseForm}（${verb.baseGloss}）` : `→ ${verb.baseForm}`);
    }

    chip.innerHTML = `<span class="chip-main">${escapeHtml(verb.surface)}</span>`
      + `<span class="chip-sub">${escapeHtml(subParts.join(" · "))}</span>`;
    chip.addEventListener("click", () => {
      focusSurface(verb.surface);
    });
    verbList.appendChild(chip);
  }
}

function renderNounChips(tokens) {
  tokenList.innerHTML = "";
  tokenCount.textContent = tokens.length ? String(tokens.length) : "";
  tokenFold.hidden = tokens.length === 0;
  for (const token of tokens) {
    const reading = inferReading(token.surface, token.reading);
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "entry-chip is-noun";
    chip.dataset.surface = token.surface;
    chip.innerHTML = `<span class="chip-main">${escapeHtml(token.surface)}</span>`
      + `<span class="chip-sub">${escapeHtml(token.glossZh)} · ${escapeHtml(reading)}</span>`;
    chip.addEventListener("click", () => {
      focusSurface(token.surface);
    });
    tokenList.appendChild(chip);
  }
}

function renderGrammarList(items) {
  grammarList.innerHTML = "";
  grammarCount.textContent = items.length ? String(items.length) : "";
  grammarFold.hidden = items.length === 0;
  for (const g of items) {
    const li = document.createElement("li");
    li.className = "grammar-item";
    li.dataset.surface = g.pattern;
    li.innerHTML = `<strong>${escapeHtml(g.pattern)}</strong><span class="grammar-explain">${escapeHtml(g.explanationZh)}</span>`;
    li.addEventListener("click", () => {
      focusSurface(g.pattern);
    });
    grammarList.appendChild(li);
  }
}

function updateDetailTabs(verbLen, nounLen, grammarLen) {
  const hasVocab = verbLen > 0 || nounLen > 0;
  const hasGrammar = grammarLen > 0;
  const hasDetails = hasVocab || hasGrammar;
  if (detailSection) detailSection.hidden = !hasDetails;
  if (tabBar) tabBar.hidden = !hasDetails;
  if (detailPanels) detailPanels.hidden = !hasDetails;

  const vocabBtn = document.querySelector('.tab-btn[data-tab="vocab"]');
  const grammarBtn = document.querySelector('.tab-btn[data-tab="grammar"]');
  if (vocabBtn) vocabBtn.hidden = !hasVocab;
  if (grammarBtn) grammarBtn.hidden = !hasGrammar;

  if (hasVocab) {
    activateTab("vocab");
  } else if (hasGrammar) {
    activateTab("grammar");
  }
}

function activateTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === tabName);
  });
}

function renderSourceText(text, entries = []) {
  if (!sourceText) return;
  if (!text || text === "-") {
    sourceText.textContent = text || "-";
    return;
  }

  if (!entries.length) {
    sourceText.textContent = text;
    return;
  }

  let html = "";
  let i = 0;
  while (i < text.length) {
    let matched = null;
    for (const entry of entries) {
      if (text.startsWith(entry.surface, i)) {
        matched = entry;
        break;
      }
    }
    if (matched) {
      const kindClass = matched.kind === "grammar" ? " source-mark--grammar" : "";
      html += `<mark class="source-mark${kindClass}" data-surface="${escapeHtml(matched.surface)}" data-kind="${escapeHtml(matched.kind)}">${escapeHtml(matched.surface)}</mark>`;
      i += matched.surface.length;
      continue;
    }

    let nextIdx = text.length;
    for (const entry of entries) {
      const idx = text.indexOf(entry.surface, i + 1);
      if (idx !== -1 && idx < nextIdx) nextIdx = idx;
    }
    html += escapeHtml(text.slice(i, nextIdx));
    i = nextIdx;
  }
  sourceText.innerHTML = html;
}

function focusSurface(surface) {
  if (!surface) return;
  const kind = surfaceKindMap.get(surface) || "noun";
  highlightSurface(surface);

  if (kind === "grammar") {
    activateTab("grammar");
    syncGrammarActive(surface);
  } else {
    activateTab("vocab");
    syncChipActive(surface);
  }
}

function highlightSurface(surface, { scroll = true } = {}) {
  if (!surface || !sourceText) return;
  sourceText.querySelectorAll(".source-mark").forEach((mark) => {
    mark.classList.toggle("is-active", mark.dataset.surface === surface);
  });
  if (scroll) {
    const mark = sourceText.querySelector(`.source-mark[data-surface="${cssEscape(surface)}"]`);
    mark?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function syncChipActive(surface) {
  document.querySelectorAll(".entry-chip").forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.surface === surface);
  });
  document.querySelectorAll(".grammar-item").forEach((item) => {
    item.classList.remove("is-active");
  });
  activeChip = surface;
  const chip = document.querySelector(`.entry-chip[data-surface="${cssEscape(surface)}"]`);
  chip?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function syncGrammarActive(surface) {
  document.querySelectorAll(".grammar-item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.surface === surface);
  });
  document.querySelectorAll(".entry-chip").forEach((chip) => {
    chip.classList.remove("is-active");
  });
  activeChip = surface;
  const item = document.querySelector(`.grammar-item[data-surface="${cssEscape(surface)}"]`);
  item?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

async function copyTranslation() {
  const text = translationText?.textContent?.trim();
  if (!text || text === "-") return;
  const copied = embeddedMode
    ? copyTextViaTextarea(text)
    : await copyTextWithClipboardApi(text);
  if (copied) showCopyToast();
}

async function copyTextWithClipboardApi(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyTextViaTextarea(text);
  }
}

function copyTextViaTextarea(text) {
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    Object.assign(textarea.style, {
      position: "fixed",
      left: "-9999px",
      top: "0",
      opacity: "0"
    });
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}

function showCopyToast() {
  if (!copyToast) return;
  copyToast.hidden = false;
  if (copyToastTimer) window.clearTimeout(copyToastTimer);
  copyToastTimer = window.setTimeout(() => {
    copyToast.hidden = true;
  }, 1600);
}

function renderWarning(message, { showRetry = false } = {}) {
  if (!warningBanner || !warningText) return;
  warningText.textContent = message;
  warningBanner.hidden = !message;
  if (warningRetryBtn) warningRetryBtn.hidden = !showRetry;
}

function clearWarning() {
  if (!warningBanner || !warningText) return;
  warningText.textContent = "";
  warningBanner.hidden = true;
  if (warningRetryBtn) warningRetryBtn.hidden = true;
}

function setAnalysisSectionsVisible(visible) {
  if (analysisBody) analysisBody.hidden = !visible;
  if (emptyGuide) emptyGuide.hidden = visible;
  if (!visible) {
    if (detailSection) detailSection.hidden = true;
    setSkeleton(false);
  }
}

function isParticleToken(token) {
  const pos = token.pos || "";
  if (pos.startsWith("助詞") || pos.startsWith("助動詞")) return true;
  if (/^[ぁ-ん]{1,3}$/.test(token.surface)) return true;
  return false;
}

function isSkippableToken(surface) {
  if (!surface) return true;
  if (/^[0-9０-９]+$/.test(surface)) return true;
  if (/^[\s\u3000]+$/.test(surface)) return true;
  if (/^[。、！？…・「」『』【】（）(),.!?\-ー〜～]+$/.test(surface)) return true;
  return false;
}

function inferReading(surface, storedReading) {
  if (storedReading && storedReading !== "-") return storedReading;
  return "";
}

function cssEscape(value) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
