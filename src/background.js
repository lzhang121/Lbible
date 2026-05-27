const MENU_ID = "analyze-japanese-selection";
const TAB_SELECTION_CACHE = new Map();
let contextMenuReady = null;

self.addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  console.warn("Verse Parse background:", event.reason);
});

self.addEventListener("error", (event) => {
  event.preventDefault();
  console.warn("Verse Parse background:", event.error || event.message);
});

// ── Enable / disable toggle ──────────────────────────────────────────────────
let _enabled = true;

async function updateBadge(on) {
  if (on) {
    await chrome.action.setBadgeText({ text: "" });
  } else {
    await chrome.action.setBadgeText({ text: "OFF" });
    await chrome.action.setBadgeBackgroundColor({ color: "#6b7280" });
  }
  await chrome.action.setTitle({ title: on ? "Verse Parse（点击停用）" : "Verse Parse（已停用，点击开启）" });
}

async function setEnabled(on, { broadcast = true } = {}) {
  _enabled = on;
  await updateBadge(on);
  if (!broadcast) return;
  const tabs = await chrome.tabs.query({}).catch(() => []);
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: "VP_TOGGLE", enabled: on }).catch(() => {});
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void initExtension(true);
});

chrome.runtime.onStartup.addListener(() => {
  void initExtension(false);
});

async function initExtension(resetEnabled) {
  try {
    await ensureContextMenu();
    if (resetEnabled) {
      await setEnabled(true);
    } else {
      await updateBadge(_enabled);
    }
  } catch (error) {
    console.warn("Extension init failed:", error);
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  if (!_enabled) return;
  try {
    await requestAnalysisFromContext(info, tab || null);
  } catch (error) {
    console.warn("Context menu analysis failed:", error);
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== "analyze-selection") return;
  if (!_enabled) return;
  void (async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      await requestAnalysis(tab.id);
    } catch (error) {
      console.warn("Command analysis failed:", error);
    }
  })();
});

// Icon click = toggle enabled/disabled
chrome.action.onClicked.addListener(() => {
  void setEnabled(!_enabled).catch((error) => {
    console.warn("Toggle failed:", error);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "VP_SET_ENABLED") {
    void setEnabled(Boolean(message.enabled), { broadcast: false });
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "GET_VP_ENABLED") {
    sendResponse({ ok: true, enabled: _enabled });
    return true;
  }

  if (message?.type === "OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "LINE_CLICKED") {
    const tabId = sender.tab?.id;
    if (tabId && message.payload?.text) {
      TAB_SELECTION_CACHE.set(tabId, message.payload);
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "SELECTION_UPDATED") {
    const tabId = sender.tab?.id;
    if (tabId && message.payload?.text) {
      TAB_SELECTION_CACHE.set(tabId, message.payload);
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "ANALYZE_FROM_SELECTION") {
    const tabId = sender.tab?.id;
    const payload = message.payload;
    if (!tabId || !payload?.text) {
      sendResponse({ ok: false, error: "未获取到可分析文本。" });
      return true;
    }
    TAB_SELECTION_CACHE.set(tabId, payload);
    void sendResultToContent(tabId, payload, null).then(() => {
      sendResponse({ ok: true });
    }).catch((error) => {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
    });
    return true;
  }

  if (message?.type === "GET_LATEST_SELECTION") {
    const tabId = message.tabId ?? sender.tab?.id;
    const cached = TAB_SELECTION_CACHE.get(tabId) || null;
    sendResponse({ ok: true, payload: cached });
    return true;
  }

  if (message?.type === "RELOAD_ANALYSIS") {
    const tabId = message.tabId ?? sender.tab?.id;
    if (!tabId) {
      sendResponse({ ok: false, error: "未找到目标标签页。" });
      return true;
    }
    void requestAnalysis(tabId).then((result) => {
      sendResponse(result);
    }).catch((error) => {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
    });
    return true;
  }

  return undefined;
});

async function requestAnalysis(tabId) {
  let payload = await captureSelectionFromPage(tabId);

  if (!payload?.text) {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "REQUEST_SELECTION"
    }).catch(() => null);
    payload = response?.ok ? response.payload : null;
  }

  if (!payload?.text) {
    const clickedResponse = await chrome.tabs.sendMessage(tabId, {
      type: "REQUEST_CLICKED_LINE"
    }).catch(() => null);
    payload = clickedResponse?.ok ? clickedResponse.payload : null;
  }

  if (!payload?.text) {
    payload = TAB_SELECTION_CACHE.get(tabId) || null;
  }

  if (!payload?.text) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []);
    if (tab?.id && tab.id !== tabId) {
      payload = TAB_SELECTION_CACHE.get(tab.id) || null;
    }
  }

  if (!payload?.text) {
    await sendResultToContent(tabId, null, "未获取到选中文本。请先点击一节经文后重试。");
    return {
      ok: false,
      error: "未获取到选中文本。请先点击一节经文后重试。"
    };
  }

  TAB_SELECTION_CACHE.set(tabId, payload);

  await sendResultToContent(tabId, payload, null);
  return {
    ok: true
  };
}

async function requestAnalysisFromContext(info, tab) {
  const selectedText = typeof info.selectionText === "string" ? info.selectionText.trim() : "";
  const sourceUrl = tab?.url || info.pageUrl || "";
  if (selectedText) {
    const payload = {
      text: selectedText,
      sourceUrl,
      selectionMeta: {
        hasRuby: false
      }
    };

    if (tab?.id) {
      TAB_SELECTION_CACHE.set(tab.id, payload);
    }

    if (tab?.id) {
      await sendResultToContent(tab.id, payload, null);
    }
    return;
  }

  if (tab?.id) {
    await requestAnalysis(tab.id);
    return;
  }

  if (tab?.id) {
    await sendResultToContent(tab.id, null, "请先选中一段日文经文。");
  }
}

async function ensureContextMenu() {
  if (contextMenuReady) {
    return contextMenuReady;
  }

  contextMenuReady = (async () => {
    await chrome.contextMenus.removeAll();
    await new Promise((resolve, reject) => {
      chrome.contextMenus.create(
        {
          id: MENU_ID,
          title: "Verse Parse: 分析选中文本",
          contexts: ["selection", "page"],
          documentUrlPatterns: ["<all_urls>"]
        },
        () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve();
        }
      );
    });
  })().catch((error) => {
    contextMenuReady = null;
    console.warn("Context menu setup failed:", error);
  });

  return contextMenuReady;
}

async function sendResultToContent(tabId, payload, error) {
  const message = {
    type: "SHOW_OVERLAY",
    tabId,
    payload,
    error
  };
  const sent = await chrome.tabs.sendMessage(tabId, message, { frameId: 0 })
    .then(() => true)
    .catch((sendError) => {
      console.warn("Failed to send overlay payload, fallback to script injection:", sendError);
      return false;
    });

  if (sent) {
    return;
  }

  await injectOverlayDirectly(tabId, payload, error);
}

async function captureSelectionFromPage(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
          return null;
        }
        const fragment = selection.getRangeAt(0).cloneContents();
        const hasRuby = fragment.querySelector("ruby, rt, rp") !== null;
        fragment.querySelectorAll("rt, rp").forEach((node) => node.remove());
        const text = (fragment.textContent || "").replace(/\s+/g, " ").trim();
        if (!text) {
          return null;
        }
        return {
          text,
          hasRuby,
          sourceUrl: window.location.href
        };
      }
    });

    const firstValid = results
      .map((item) => item.result)
      .find((item) => item?.text);

    if (!firstValid?.text) {
      return null;
    }

    return {
      text: firstValid.text,
      sourceUrl: firstValid.sourceUrl,
      selectionMeta: {
        hasRuby: Boolean(firstValid.hasRuby)
      }
    };
  } catch (_error) {
    return null;
  }
}

async function injectOverlayDirectly(tabId, payload, error) {
  const overlayUrl = chrome.runtime.getURL("sidepanel.html");
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (url, analysisPayload, analysisError, analysisTabId) => {
      let container = document.getElementById("verse-parse-overlay-fallback");
      let iframe = document.getElementById("verse-parse-overlay-frame");

      if (!container) {
        container = document.createElement("div");
        container.id = "verse-parse-overlay-fallback";
        Object.assign(container.style, {
          position: "fixed",
          top: "0",
          right: "0",
          width: "420px",
          height: "100vh",
          zIndex: "2147483647",
          boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
          border: "1px solid #d1d5db",
          borderRadius: "12px 0 0 12px",
          overflow: "hidden",
          background: "#fff",
          transition: "transform 180ms ease",
          transform: "translateX(0)"
        });

        const header = document.createElement("div");
        Object.assign(header.style, {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          background: "#111827",
          color: "#fff",
          fontSize: "12px",
          fontWeight: "600"
        });
        header.textContent = "Verse Parse";

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.textContent = "×";
        closeButton.title = "关闭";
        closeButton.setAttribute("aria-label", "关闭");
        Object.assign(closeButton.style, {
          border: "none",
          background: "none",
          color: "#d1d5db",
          width: "24px",
          height: "24px",
          padding: "0",
          margin: "0",
          cursor: "pointer",
          fontSize: "18px",
          lineHeight: "24px",
          textAlign: "center"
        });
        closeButton.addEventListener("click", () => {
          container.remove();
        });
        header.appendChild(closeButton);

        iframe = document.createElement("iframe");
        iframe.id = "verse-parse-overlay-frame";
        iframe.title = "Verse Parse Result";
        iframe.setAttribute("frameborder", "0");
        Object.assign(iframe.style, {
          width: "100%",
          height: "calc(100% - 38px)",
          border: "0",
          background: "#fff"
        });

        container.appendChild(header);
        container.appendChild(iframe);
        document.documentElement.appendChild(container);
      }

      const params = new URLSearchParams({ embedded: "1" });
      if (analysisPayload?.text) {
        params.set("text", analysisPayload.text);
        params.set("sourceUrl", analysisPayload.sourceUrl || window.location.href);
      }
      if (analysisTabId) {
        params.set("tabId", String(analysisTabId));
      }
      if (analysisError) {
        params.set("error", analysisError);
      }
      iframe.src = `${url}?${params.toString()}`;
      container.style.display = "block";
      container.style.transform = "translateX(0)";
    },
    args: [overlayUrl, payload ?? null, error ?? "", tabId]
  }).catch((injectError) => {
    console.warn("Overlay injection fallback failed:", injectError);
  });
}
