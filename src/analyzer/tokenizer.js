let tokenizerPromise = null;

function hasKuromoji() {
  try {
    const k = (typeof globalThis !== "undefined" && globalThis.kuromoji) ||
              (typeof window !== "undefined" && window.kuromoji);
    return k != null && typeof k.builder === "function";
  } catch {
    return false;
  }
}

function getKuromoji() {
  if (typeof globalThis !== "undefined" && globalThis.kuromoji?.builder) return globalThis.kuromoji;
  if (typeof window !== "undefined" && window.kuromoji?.builder) return window.kuromoji;
  return null;
}

function hasTinySegmenter() {
  try {
    return typeof globalThis.TinySegmenter === "function" ||
           typeof window.TinySegmenter === "function";
  } catch {
    return false;
  }
}

function segmentWithTiny(text) {
  try {
    const Cls = globalThis.TinySegmenter || window.TinySegmenter;
    const seg = new Cls();
    return seg.segment(text).map((surface) => ({
      surface,
      baseForm: surface,
      reading: "",
      pos: guessPosFromSurface(surface)
    }));
  } catch {
    return createFallbackTokens(text);
  }
}

// Rough part-of-speech guess based on surface characters.
function guessPosFromSurface(surface) {
  if (/^[はがをにでのともへから]+$/.test(surface)) return "助詞";
  if (/^[ですますたないよねか。、！？]+$/.test(surface)) return "助動詞";
  if (/[\u3041-\u3096]+$/.test(surface) && surface.length <= 3) return "助詞";
  if (/^[A-Za-zａ-ｚＡ-Ｚ]+$/.test(surface)) return "名詞";
  if (/^[0-9０-９]+$/.test(surface)) return "数詞";
  if (/^[\u30A1-\u30F6]+$/.test(surface)) return "名詞";
  if (/^[\u4E00-\u9FFF\u3400-\u4DBF]+$/.test(surface)) return "名詞";
  return "不明";
}

function createFallbackTokens(text) {
  return text
    .split(/[\s、。！？!?,]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((surface) => ({
      surface,
      baseForm: surface,
      reading: "",
      pos: "不明"
    }));
}

/**
 * Kuromoji uses XMLHttpRequest to load .dat.gz dict files, but Chrome MV3
 * extension iframes can't fetch chrome-extension:// resources. We swap XHR
 * with a fetch-based shim, but fetch also fails in this context.
 * TinySegmenter is used as a reliable pure-JS fallback.
 */
function buildKuromojiWithFetch(kuromoji, dicPath) {
  const OrigXHR = globalThis.XMLHttpRequest;

  function FetchXHR() {
    this._url = "";
    this.response = null;
    this.status = 0;
    this.onload = null;
    this.onerror = null;
  }
  FetchXHR.prototype.open = function (_m, url) { this._url = url; };
  FetchXHR.prototype.setRequestHeader = function () {};
  FetchXHR.prototype.abort = function () {};
  FetchXHR.prototype.send = function () {
    const self = this;
    fetch(self._url)
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.arrayBuffer();
      })
      .then((buf) => {
        self.response = buf;
        self.status = 200;
        if (self.onload) self.onload();
      })
      .catch((e) => { if (self.onerror) self.onerror(e); });
  };

  globalThis.XMLHttpRequest = FetchXHR;

  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath }).build((err, tokenizer) => {
      globalThis.XMLHttpRequest = OrigXHR;
      if (err) reject(err);
      else resolve(tokenizer);
    });
  });
}

export async function tokenizeText(text, dicPath) {
  if (!text) {
    return { tokenizer: "fallback", fallbackUsed: true, tokens: [] };
  }

  // Try kuromoji first (best quality, but may fail in extension iframe context)
  if (hasKuromoji()) {
    try {
      if (!tokenizerPromise) {
        tokenizerPromise = buildKuromojiWithFetch(getKuromoji(), dicPath);
      }
      const tokenizer = await tokenizerPromise;
      const tokens = tokenizer.tokenize(text).map((token) => ({
        surface: token.surface_form || "",
        baseForm: token.basic_form && token.basic_form !== "*" ? token.basic_form : token.surface_form || "",
        reading: token.reading && token.reading !== "*" ? token.reading : "",
        pos: [token.pos, token.pos_detail_1].filter(Boolean).join("・")
      }));
      return { tokenizer: "kuromoji", fallbackUsed: false, tokens };
    } catch (err) {
      tokenizerPromise = null;
      // Fall through to TinySegmenter
    }
  }

  // TinySegmenter: pure JS, no file I/O, works in any context
  if (hasTinySegmenter()) {
    return {
      tokenizer: "TinySegmenter",
      fallbackUsed: false,
      tokens: segmentWithTiny(text)
    };
  }

  // Last resort: split by punctuation
  return {
    tokenizer: "fallback",
    fallbackUsed: true,
    tokens: createFallbackTokens(text)
  };
}
