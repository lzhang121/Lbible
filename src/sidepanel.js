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
const warningCard = document.getElementById("warningCard");
const warningText = document.getElementById("warningText");
const sourceSection = document.getElementById("sourceSection");
const translationSection = document.getElementById("translationSection");
const tokenSection = document.getElementById("tokenSection");
const verbSection = document.getElementById("verbSection");
const grammarSection = document.getElementById("grammarSection");

let latestAnalysis = null;
let contextTabId = null;
setAnalysisSectionsVisible(false);

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

async function bootstrap() {
  try {
    const params = new URLSearchParams(window.location.search);
    const textFromUrl = params.get("text")?.trim() || "";
    const sourceUrlFromUrl = params.get("sourceUrl")?.trim() || "";
    const errorFromUrl = params.get("error")?.trim() || "";

    if (errorFromUrl) {
      renderWarning(errorFromUrl);
      statusText.textContent = "请返回页面后重新选择文本。";
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
      statusText.textContent = "请先在目标网页中选中文本，再执行 Verse Parse 分析。";
    }
  } catch (error) {
    renderWarning(error instanceof Error ? error.message : String(error));
    statusText.textContent = "分析面板加载失败。";
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
  try {
    clearWarning();
    statusText.textContent = "正在分析...";
    statusText.style.display = "";
    const options = await loadAnalysisOptions();
    const result = await analyzeSelection(payload, options);
    latestAnalysis = result;
    renderResult(result, options);
  } catch (error) {
    renderWarning(error instanceof Error ? error.message : String(error));
    statusText.textContent = "分析失败。";
    statusText.style.display = "";
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
    openrouterApiKey: openrouterEnabled && openrouterKey ? openrouterKey : undefined
  };
}

function renderResult(result, options = {}) {
  if (result?.notJapanese) {
    setAnalysisSectionsVisible(false);
    renderWarning("所选文本不含日语，请选择日文经文后再分析。");
    statusText.style.display = "none";
    return;
  }
  if (result?.tooLong) {
    setAnalysisSectionsVisible(false);
    const limit = options.geminiApiKey || options.groqApiKey || options.openrouterApiKey ? 500 : 200;
    renderWarning(`所选文字过长（超过${limit}字），建议选择单句分析效果更好。`);
    statusText.style.display = "none";
    return;
  }
  setAnalysisSectionsVisible(Boolean(result?.normalized));
  sourceText.textContent = result.normalized || "-";

  translationText.textContent = result.translationZh || "-";

  // 动词：tag-badge rows
  verbList.innerHTML = "";
  const verbs = result.verbTokens || [];
  if (verbs.length === 0) {
    verbSection.style.display = "none";
  } else {
    verbSection.style.display = "";
    const verbEntryList = document.createElement("div");
    verbEntryList.className = "entry-list";
    for (const verb of verbs) {
      const row = document.createElement("div");
      row.className = "entry-row";
      const subParts = [];
      subParts.push(`<span class="entry-form">${escapeHtml(verb.explanation)}</span>`);
      if (verb.reading) {
        subParts.push(`<span class="entry-dot">·</span><span class="entry-reading">${escapeHtml(verb.reading)}</span>`);
      }
      if (verb.baseForm && verb.baseForm !== verb.surface) {
        const baseLabel = verb.baseGloss
          ? `→ ${escapeHtml(verb.baseForm)}（${escapeHtml(verb.baseGloss)}）`
          : `→ ${escapeHtml(verb.baseForm)}`;
        subParts.push(`<span class="entry-dot">·</span><span class="entry-base">${baseLabel}</span>`);
      }
      row.innerHTML = `<span class="entry-main">${escapeHtml(verb.surface)}</span>`
                    + `<span class="entry-sub">${subParts.join("")}</span>`;
      verbEntryList.appendChild(row);
    }
    verbList.appendChild(verbEntryList);
  }

  // 名词：tag-badge rows
  tokenList.innerHTML = "";
  const seen = new Set();
  const displayTokens = result.tokens.filter((t) => {
    if (isSkippableToken(t.surface) || isParticleToken(t)) return false;
    if (seen.has(t.surface)) return false;
    const reading = inferReading(t.surface, t.reading);
    if (!t.glossZh || !reading) return false;
    seen.add(t.surface);
    return true;
  });
  if (!displayTokens.length) {
    tokenSection.style.display = "none";
  } else {
    tokenSection.style.display = "";
    const nounEntryList = document.createElement("div");
    nounEntryList.className = "entry-list";
    for (const token of displayTokens) {
      const reading = inferReading(token.surface, token.reading);
      const row = document.createElement("div");
      row.className = "entry-row";
      row.innerHTML = `<span class="entry-main">${escapeHtml(token.surface)}</span>`
                    + `<span class="entry-sub">`
                    + `<span class="entry-gloss">${escapeHtml(token.glossZh)}</span>`
                    + `<span class="entry-dot">·</span>`
                    + `<span class="entry-reading">${escapeHtml(reading)}</span>`
                    + `</span>`;
      nounEntryList.appendChild(row);
    }
    tokenList.appendChild(nounEntryList);
  }

  grammarList.innerHTML = "";
  if (!result.grammar.length) {
    grammarSection.style.display = "none";
  } else {
    grammarSection.style.display = "";
    for (const g of result.grammar) {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${escapeHtml(g.pattern)}</strong>　${escapeHtml(g.explanationZh)}`;
      grammarList.appendChild(li);
    }
  }

  if (result.meta.errors?.length) {
    renderWarning(result.meta.errors.join("；"));
  }

  const mode = result.meta?.aiProvider || (result.meta?.aiUsed ? "AI" : "本地");
  statusText.textContent = `${mode} · ${result.meta?.elapsedMs ?? 0}ms`;
  statusText.style.display = "";
}


function renderWarning(message) {
  warningText.textContent = message;
  warningCard.hidden = false;
}

function clearWarning() {
  warningText.textContent = "";
  warningCard.hidden = true;
}

function setAnalysisSectionsVisible(visible) {
  const display = visible ? "block" : "none";
  sourceSection.style.display = display;
  translationSection.style.display = display;
  // grammarSection, verbSection, tokenSection are shown/hidden individually in renderResult
  if (!visible) {
    grammarSection.style.display = "none";
    verbSection.style.display = "none";
    tokenSection.style.display = "none";
  }
}


/** Skip particles and auxiliaries — not meaningful for learners to look up */
function isParticleToken(token) {
  const pos = token.pos || "";
  if (pos.startsWith("助詞") || pos.startsWith("助動詞")) return true;
  // TinySegmenter guesses short pure-hiragana tokens as 助詞
  if (/^[ぁ-ん]{1,3}$/.test(token.surface)) return true;
  return false;
}

/** Skip pure numbers, single punctuation, and lone whitespace tokens */
function isSkippableToken(surface) {
  if (!surface) return true;
  if (/^[0-9０-９]+$/.test(surface)) return true;
  if (/^[\s\u3000]+$/.test(surface)) return true;
  if (/^[。、！？…・「」『』【】（）(),.!?\-ー〜～]+$/.test(surface)) return true;
  return false;
}

/** Return stored reading (already enriched by pipeline), hide if empty or "-". */
function inferReading(surface, storedReading) {
  if (storedReading && storedReading !== "-") return storedReading;
  return "";
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
