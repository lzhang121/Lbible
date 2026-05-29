// ── Global enabled flag (toggled by extension icon click) ────────────────────
let _vpEnabled = true;
let _switchTrack = null;
let _switchThumb = null;
let _switchLabel = null;

function updateSwitchUi(enabled) {
  if (!_switchTrack || !_switchThumb) return;
  _switchTrack.style.background = enabled ? "#22c55e" : "#d1d5db";
  _switchThumb.style.left = enabled ? "16px" : "2px";
  if (_switchLabel) {
    _switchLabel.textContent = enabled ? "取词" : "暂停";
    _switchLabel.style.color = enabled ? "#15803d" : "#9ca3af";
  }
}

function setVpEnabled(enabled, { notifyBackground = true } = {}) {
  _vpEnabled = enabled;
  updateSwitchUi(enabled);
  if (notifyBackground) {
    safeSendMessage({ type: "VP_SET_ENABLED", enabled });
  }
}
// ─────────────────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "VP_TOGGLE") {
    setVpEnabled(message.enabled, { notifyBackground: false });
    sendResponse({ ok: true });
    return true;
  }
  if (message?.type === "REQUEST_CLICKED_LINE") {
    sendResponse({
      ok: true,
      payload: LAST_CLICKED_PAYLOAD
    });
    return true;
  }

  if (message?.type === "SHOW_OVERLAY") {
    showOverlay(message.payload, message.error || "");
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type !== "REQUEST_SELECTION") {
    return undefined;
  }

  const { text, hasRuby } = extractCleanSelection();
  if (!text && LAST_CLICKED_PAYLOAD?.text) {
    sendResponse({
      ok: true,
      payload: LAST_CLICKED_PAYLOAD
    });
    return true;
  }

  sendResponse({
    ok: true,
    payload: {
      text,
      sourceUrl: window.location.href,
      selectionMeta: { hasRuby }
    }
  });

  return true;
});

let LAST_CLICKED_PAYLOAD = null;
let overlayContainer = null;
let overlayIframe = null;
let overlayIframeReady = false;
let pendingPanelMessage = null;
let autoAnalyzeTimer = null;

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isOverlayVisible()) {
    event.preventDefault();
    event.stopPropagation();
    closeOverlay();
  }
}, true);

function isOverlayVisible() {
  return Boolean(overlayContainer && overlayContainer.style.display !== "none");
}

function closeOverlay() {
  if (!overlayContainer) return;
  saveOverlayLayout();
  overlayContainer.remove();
  overlayContainer = null;
  overlayIframe = null;
  overlayIframeReady = false;
  pendingPanelMessage = null;
  _switchTrack = null;
  _switchThumb = null;
  _switchLabel = null;
}

function postToPanel(message) {
  if (!overlayIframe?.contentWindow) return;
  overlayIframe.contentWindow.postMessage(message, "*");
}

function flushPendingPanelMessage() {
  if (!overlayIframeReady || !pendingPanelMessage) return;
  postToPanel(pendingPanelMessage);
  pendingPanelMessage = null;
}

function sendAnalyzeToPanel(payload, error) {
  const message = {
    type: "VP_ANALYZE",
    payload: payload || null,
    error: error || ""
  };
  if (overlayIframeReady) {
    postToPanel(message);
  } else {
    pendingPanelMessage = message;
  }
}

function revealOverlay() {
  if (!overlayContainer) return;
  overlayContainer.style.display = "block";
  overlayContainer.style.opacity = "0";
  overlayContainer.style.transform = "scale(0.97) translateY(6px)";
  overlayContainer.style.transition = "opacity 180ms ease, transform 180ms ease";
  requestAnimationFrame(() => {
    overlayContainer.style.opacity = "1";
    overlayContainer.style.transform = "scale(1) translateY(0)";
  });
}

function applyOverlayLayout(layout) {
  if (!overlayContainer || !layout) return;
  if (Number.isFinite(layout.width)) {
    overlayContainer.style.width = `${layout.width}px`;
  }
  if (Number.isFinite(layout.height)) {
    overlayContainer.style.height = `${layout.height}px`;
  }
  if (Number.isFinite(layout.top)) {
    overlayContainer.style.top = `${layout.top}px`;
  }
  if (Number.isFinite(layout.left)) {
    overlayContainer.style.left = `${layout.left}px`;
    overlayContainer.style.right = "auto";
  }
}

function saveOverlayLayout() {
  if (!overlayContainer || !isExtensionContextValid()) return;
  const rect = overlayContainer.getBoundingClientRect();
  try {
    void chrome.storage.local.set({
      overlayLayout: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        left: Math.round(rect.left),
        top: Math.round(rect.top)
      }
    });
  } catch (_error) {
    // ignore
  }
}

async function loadOverlayLayout() {
  if (!overlayContainer || !isExtensionContextValid()) return;
  try {
    const { overlayLayout } = await chrome.storage.local.get("overlayLayout");
    if (overlayLayout) applyOverlayLayout(overlayLayout);
  } catch (_error) {
    // ignore
  }
}

document.addEventListener("click", (event) => {
  if (!_vpEnabled) return;
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  if (overlayContainer && overlayContainer.contains(target)) return;

  const clickedText = extractTextFromClickedBlock(target);
  if (!clickedText) return;

  LAST_CLICKED_PAYLOAD = {
    text: clickedText,
    sourceUrl: window.location.href,
    selectionMeta: { hasRuby: true }
  };
  safeSendMessage({ type: "LINE_CLICKED", payload: LAST_CLICKED_PAYLOAD });
  scheduleAutoAnalyze(LAST_CLICKED_PAYLOAD);
}, true);

document.addEventListener("mouseup", () => {
  if (!_vpEnabled) return;
  setTimeout(() => cacheCurrentSelection(), 50);
}, true);

function extractCleanSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return { text: "", hasRuby: false };
  }

  const fragment = selection.getRangeAt(0).cloneContents();
  const hasRuby = fragment.querySelector("ruby, rt, rp") !== null;
  fragment.querySelectorAll("rt, rp").forEach((node) => node.remove());

  const text = (fragment.textContent || "")
    .replace(/\s+/g, " ")
    .trim();

  return { text, hasRuby };
}

function extractTextFromClickedBlock(target) {
  // Walk upward and prefer the smallest paragraph-level element (<p> first)
  const candidates = ["p", "li", "div", "section", "article"];
  let block = null;
  for (const tag of candidates) {
    const el = target.closest(tag);
    if (!el) continue;
    const clone = el.cloneNode(true);
    if (!(clone instanceof Element)) continue;
    clone.querySelectorAll("rt, rp").forEach((n) => n.remove());
    const txt = (clone.textContent || "").replace(/\s+/g, " ").trim();
    if (!containsJapanese(txt) || txt.length < 3) continue;
    // Accept <p> even if long; for wider containers cap at 600 chars
    if (tag !== "p" && tag !== "li" && txt.length > 600) continue;
    block = { el, text: txt };
    break;
  }
  return block ? block.text : "";
}

function containsJapanese(text) {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text);
}

function cacheCurrentSelection() {
  const { text, hasRuby } = extractCleanSelection();
  if (!text || text.length < 3 || !containsJapanese(text)) {
    return;
  }
  const payload = {
    text,
    sourceUrl: window.location.href,
    selectionMeta: { hasRuby }
  };
  LAST_CLICKED_PAYLOAD = payload;
  safeSendMessage({ type: "SELECTION_UPDATED", payload });
  scheduleAutoAnalyze(payload);
}

function scheduleAutoAnalyze(payload) {
  if (!_vpEnabled) return;
  if (autoAnalyzeTimer) {
    window.clearTimeout(autoAnalyzeTimer);
  }
  autoAnalyzeTimer = window.setTimeout(() => {
    showOverlay(payload, "");
  }, 300);
}

function showOverlay(payload, error) {
  if (!_vpEnabled && !error) return;
  ensureOverlay();
  if (!overlayIframe) return;

  sendAnalyzeToPanel(payload, error);
  revealOverlay();
}

function ensureOverlay() {
  if (
    overlayContainer &&
    overlayIframe &&
    document.documentElement.contains(overlayContainer)
  ) {
    // Restore switch refs if overlay was reused
    if (!_switchTrack) {
      _switchTrack = overlayContainer.querySelector("[data-vp-track='1']");
      _switchThumb = overlayContainer.querySelector("[data-vp-thumb='1']");
      _switchLabel = overlayContainer.querySelector("[data-vp-label='1']");
      updateSwitchUi(_vpEnabled);
    }
    return;
  }

  overlayContainer = null;
  overlayIframe = null;

  overlayContainer = document.createElement("div");
  overlayContainer.id = "verse-parse-overlay";
  Object.assign(overlayContainer.style, {
    position: "fixed",
    top: "0",
    right: "0",
    width: "380px",
    height: "100vh",
    minHeight: "200px",
    zIndex: "2147483647",
    boxShadow: "0 12px 40px rgba(15,23,42,0.12), 0 4px 12px rgba(15,23,42,0.06)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: "16px 0 0 16px",
    overflow: "hidden",
    background: "#f8fafc",
    display: "none",
    userSelect: "none"
  });

  const header = document.createElement("div");
  Object.assign(header.style, {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "11px 14px",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    borderBottom: "1px solid rgba(15,23,42,0.06)",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: ".1em",
    textTransform: "uppercase",
    color: "#64748b",
    cursor: "grab",
    flexShrink: "0"
  });

  const titleWrap = document.createElement("div");
  Object.assign(titleWrap.style, {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  });

  const iconImg = document.createElement("img");
  iconImg.src = getRuntimeUrl("icons/icon16.png") || "";
  iconImg.width = 16;
  iconImg.height = 16;
  iconImg.alt = "";
  Object.assign(iconImg.style, {
    borderRadius: "4px",
    flexShrink: "0"
  });
  titleWrap.appendChild(iconImg);

  const titleSpan = document.createElement("span");
  titleSpan.textContent = "Verse Parse";
  Object.assign(titleSpan.style, {
    background: "linear-gradient(135deg, #15803d 0%, #b45309 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text"
  });
  titleWrap.appendChild(titleSpan);
  header.appendChild(titleWrap);

  const headerActions = document.createElement("div");
  Object.assign(headerActions.style, {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginLeft: "auto",
    position: "relative",
    zIndex: "2"
  });

  const btnStyle = {
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#ffffff",
    color: "#64748b",
    borderRadius: "8px",
    padding: "3px 10px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "500",
    flexShrink: "0",
    boxShadow: "0 1px 2px rgba(15,23,42,0.04)"
  };

  // ── Toggle switch (button, not label — avoids click being swallowed) ──
  const switchBtn = document.createElement("button");
  switchBtn.type = "button";
  switchBtn.title = "启用/停用屏幕选句";
  switchBtn.setAttribute("aria-label", "启用/停用屏幕选句");
  Object.assign(switchBtn.style, {
    border: "none",
    background: "transparent",
    padding: "4px 2px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    width: "72px",
    height: "26px",
    flexShrink: "0"
  });

  _switchLabel = document.createElement("span");
  _switchLabel.dataset.vpLabel = "1";
  _switchLabel.textContent = "取词";
  Object.assign(_switchLabel.style, {
    fontSize: "11px",
    fontWeight: "600",
    width: "28px",
    textAlign: "center",
    color: "#15803d",
    pointerEvents: "none",
    flexShrink: "0"
  });
  switchBtn.appendChild(_switchLabel);

  _switchTrack = document.createElement("span");
  _switchTrack.dataset.vpTrack = "1";
  Object.assign(_switchTrack.style, {
    display: "inline-block",
    width: "32px",
    height: "18px",
    borderRadius: "999px",
    background: "#22c55e",
    position: "relative",
    transition: "background .2s ease",
    pointerEvents: "none"
  });

  _switchThumb = document.createElement("span");
  _switchThumb.dataset.vpThumb = "1";
  Object.assign(_switchThumb.style, {
    position: "absolute",
    top: "2px",
    left: "16px",
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    background: "#ffffff",
    boxShadow: "0 1px 3px rgba(0,0,0,.2)",
    transition: "left .2s ease",
    pointerEvents: "none"
  });

  _switchTrack.appendChild(_switchThumb);
  switchBtn.appendChild(_switchTrack);

  switchBtn.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
  }, true);

  switchBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setVpEnabled(!_vpEnabled);
  }, true);

  headerActions.appendChild(switchBtn);

  const settingsButton = document.createElement("button");
  settingsButton.type = "button";
  settingsButton.textContent = "设置";
  settingsButton.title = "Gemini / 本地分析设置";
  Object.assign(settingsButton.style, { ...btnStyle });
  settingsButton.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
  }, true);
  settingsButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isExtensionContextValid()) {
      chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" });
    }
  }, true);
  headerActions.appendChild(settingsButton);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "×";
  closeButton.title = "关闭";
  closeButton.setAttribute("aria-label", "关闭");
  Object.assign(closeButton.style, {
    border: "none",
    background: "none",
    color: "#9ca3af",
    width: "24px",
    height: "24px",
    padding: "0",
    margin: "0",
    cursor: "pointer",
    fontSize: "18px",
    lineHeight: "24px",
    textAlign: "center",
    flexShrink: "0"
  });
  closeButton.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
  }, true);
  closeButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeOverlay();
  }, true);
  headerActions.appendChild(closeButton);
  header.appendChild(headerActions);

  updateSwitchUi(_vpEnabled);
  if (isExtensionContextValid()) {
    chrome.runtime.sendMessage({ type: "GET_VP_ENABLED" }, (resp) => {
      if (resp?.enabled !== undefined) {
        setVpEnabled(resp.enabled, { notifyBackground: false });
      }
    });
  }

  // ── Drag logic — only activates after 5px movement ──
  header.addEventListener("mousedown", (e) => {
    if (headerActions.contains(e.target)) return;
    const startX = e.clientX, startY = e.clientY;
    const rect = overlayContainer.getBoundingClientRect();
    const origLeft = rect.left, origTop = rect.top;
    let dragging = false;

    function onMove(e) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!dragging && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      dragging = true;
      header.style.cursor = "grabbing";
      let newLeft = origLeft + dx;
      let newTop  = origTop  + dy;
      const maxLeft = window.innerWidth  - overlayContainer.offsetWidth;
      const maxTop  = Math.max(0, window.innerHeight - overlayContainer.offsetHeight);
      newLeft = Math.max(0, Math.min(newLeft, maxLeft));
      newTop  = Math.max(0, Math.min(newTop,  maxTop));
      overlayContainer.style.left  = newLeft + "px";
      overlayContainer.style.top   = newTop  + "px";
      overlayContainer.style.right = "auto";
    }
    function onUp() {
      header.style.cursor = "grab";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
      saveOverlayLayout();
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  });

  overlayIframe = document.createElement("iframe");
  overlayIframe.title = "Verse Parse Result";
  overlayIframe.setAttribute("frameborder", "0");
  overlayIframe.setAttribute("allow", "clipboard-write");
  Object.assign(overlayIframe.style, {
    width: "100%",
    height: "calc(100% - 38px)",
    border: "0",
    background: "#fff",
    display: "block"
  });
  overlayIframe.addEventListener("load", () => {
    overlayIframeReady = true;
    flushPendingPanelMessage();
  });

  const sidepanelUrl = getRuntimeUrl("sidepanel.html");
  if (sidepanelUrl) {
    overlayIframe.src = `${sidepanelUrl}?embedded=1`;
  }

  // ── Resize handle (bottom edge) ──
  const resizeHandle = document.createElement("div");
  Object.assign(resizeHandle.style, {
    position: "absolute",
    bottom: "0",
    left: "0",
    right: "0",
    height: "6px",
    cursor: "ns-resize",
    background: "transparent",
    zIndex: "1"
  });

  // Visual grip indicator
  const gripDots = document.createElement("div");
  Object.assign(gripDots.style, {
    position: "absolute",
    bottom: "2px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "32px",
    height: "3px",
    borderRadius: "999px",
    background: "#d1d5db"
  });
  resizeHandle.appendChild(gripDots);

  resizeHandle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const startY     = e.clientY;
    const startHeight = overlayContainer.offsetHeight;

    function onMove(e) {
      const dy = e.clientY - startY;
      const newH = Math.max(160, Math.min(startHeight + dy, window.innerHeight - 40));
      overlayContainer.style.height = newH + "px";
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
      saveOverlayLayout();
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  });

  overlayContainer.appendChild(header);
  overlayContainer.appendChild(overlayIframe);
  overlayContainer.appendChild(resizeHandle);
  document.documentElement.appendChild(overlayContainer);
  void loadOverlayLayout();
}

function safeSendMessage(message) {
  if (!isExtensionContextValid()) return;
  try {
    void chrome.runtime.sendMessage(message).catch(() => undefined);
  } catch (_error) {}
}

function getRuntimeUrl(path) {
  if (!isExtensionContextValid()) return "";
  try {
    return chrome.runtime.getURL(path);
  } catch (_error) {
    return "";
  }
}

function isExtensionContextValid() {
  return Boolean(chrome?.runtime?.id);
}
