import { createEmptyResult, validateRequest, ANALYSIS_VERSION } from "./contract.js";
import { normalizeJapaneseText } from "./normalize.js";
import { tokenizeText } from "./tokenizer.js";
import { buildGrammarHits } from "./grammar-rules.js";
import { findGlossZh, findReading } from "./dictionary.js";
import { buildReadableTranslation } from "./translation.js";
import { analyzeWithGemini } from "./gemini.js";
import { analyzeWithGroq } from "./groq.js";
import { analyzeWithOpenRouter } from "./openrouter.js";

function enrichTokens(tokens) {
  return tokens.map((token) => {
    const glossZh = findGlossZh(token.surface, token.baseForm);
    // Fill reading from dictionary when tokenizer (e.g. TinySegmenter) doesn't provide one
    const reading = token.reading || findReading(token.surface, token.baseForm);
    return { ...token, glossZh, reading };
  });
}

function buildSummary(normalized, grammarHits) {
  if (!normalized) return "未检测到可分析文本。";
  if (grammarHits.length === 0) return "已完成基础词法分析，可结合上下文理解。";
  return `检测到 ${grammarHits.length} 个语法要点，建议先看助词和动词形态。`;
}

function buildTranslation(normalized, tokens) {
  return buildReadableTranslation(normalized, tokens);
}

const VERB_END = /(?:なさった|なさって|られた|れた|ていた|ていた|ている|てきた|てくる|ました|ません|なかった|なかっ|ない|よう|たら|ば|ながら|った|いた|した|んだ|て|た)$/;
const PARTICLE_SET = new Set(["は","が","を","に","で","の","と","も","へ","か","や","ね","よ","から","まで","より","ので","けど","けれど","ながら","として","について","において","によって","ために","ように"]);

function isParticleSurf(s) {
  return PARTICLE_SET.has(s) || /^[ぁ-ん]{1,3}$/.test(s);
}

function extractClauseCore(clauseText, allTokens) {
  // Only tokens whose surface appears in this clause
  const tokens = allTokens.filter((t) => clauseText.includes(t.surface) && t.surface.length >= 1);

  const lookup = (surf) => {
    const tok = allTokens.find((t) => t.surface === surf);
    return { surface: surf, glossZh: tok?.glossZh || findGlossZh(surf, surf) };
  };

  // Subject / Topic: find a real noun (non-particle) immediately before は or が
  let subject = null, particle = "";
  for (let i = 0; i < tokens.length - 1; i++) {
    const cur = tokens[i], next = tokens[i + 1];
    if (isParticleSurf(cur.surface)) continue;
    if (!/[\u3041-\u30ff\u3400-\u9fff]/.test(cur.surface)) continue;
    if (next.surface === "は" && !subject) { subject = lookup(cur.surface); particle = "は"; }
    else if (next.surface === "が" && !subject) { subject = lookup(cur.surface); particle = "が"; }
  }

  // Object: real noun immediately before を
  let object = null;
  for (let i = 0; i < tokens.length - 1; i++) {
    const cur = tokens[i], next = tokens[i + 1];
    if (next.surface === "を" && !isParticleSurf(cur.surface) && cur.surface.length >= 1) {
      object = lookup(cur.surface);
      break;
    }
  }

  // Predicate: last token in this clause that looks like a verb
  let predicate = null;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (t.surface.length < 2 || isParticleSurf(t.surface)) continue;
    if (VERB_END.test(t.surface)) { predicate = lookup(t.surface); break; }
  }

  if (!subject && !object && !predicate) return null;
  return { clauseText, subject, particle, object, predicate };
}

/**
 * Split normalized text by 。and extract SVO for each sentence.
 */
function extractSentenceCore(tokens, normalized) {
  const clauses = normalized
    .split(/[。！？]/)
    .map((s) => s.replace(/^\d+/, "").trim())   // strip leading verse numbers
    .filter((s) => s.length >= 4);

  const results = clauses.map((c) => extractClauseCore(c, tokens)).filter(Boolean);
  return results.length ? results : null;
}

const VERB_CONJ_PATTERNS = [
  { regex: /なさった$/,     form: "なさった",     explanation: "尊敬语·过去" },
  { regex: /なさって/,      form: "なさって",     explanation: "尊敬语·连用" },
  { regex: /えられた$/,     form: "〜えられた",   explanation: "被动·过去" },
  { regex: /られた$/,       form: "〜られた",     explanation: "被动/尊敬·过去" },
  { regex: /れた$/,         form: "〜れた",       explanation: "被动·过去" },
  { regex: /ていた$/,       form: "〜ていた",     explanation: "进行/持续·过去" },
  { regex: /ている$/,       form: "〜ている",     explanation: "进行/持续·现在" },
  { regex: /てきた$/,       form: "〜てきた",     explanation: "来向完成" },
  { regex: /ました$/,       form: "〜ました",     explanation: "过去·礼貌体" },
  { regex: /ません$/,       form: "〜ません",     explanation: "否定·礼貌体" },
  { regex: /なかった$/,     form: "〜なかった",   explanation: "否定·过去" },
  { regex: /ない$/,         form: "〜ない",       explanation: "否定形" },
  { regex: /よう$/,         form: "〜よう",       explanation: "意志/邀请" },
  { regex: /たら$/,         form: "〜たら",       explanation: "条件·过去" },
  { regex: /ば$/,           form: "〜ば",         explanation: "假定条件" },
  { regex: /ながら$/,       form: "〜ながら",     explanation: "同时进行" },
  { regex: /って$/,         form: "〜って",       explanation: "连用·口语" },
  { regex: /いて$/,         form: "〜いて",       explanation: "连用形（く类）" },
  { regex: /て$/,           form: "〜て",         explanation: "连用形" },
  { regex: /った$/,         form: "〜った",       explanation: "过去时" },
  { regex: /いた$/,         form: "〜いた",       explanation: "过去时（く类）" },
  { regex: /した$/,         form: "〜した",       explanation: "过去时（サ变）" },
  { regex: /んだ$/,         form: "〜んだ",       explanation: "过去时（口语）" },
  { regex: /た$/,           form: "〜た",         explanation: "过去时" },
  { regex: /り$/,           form: "〜り",         explanation: "连用形（中顿）" },
  { regex: /む$/,           form: "辞书形",       explanation: "原形（む结尾）" },
  { regex: /ぶ$/,           form: "辞书形",       explanation: "原形（ぶ结尾）" },
  { regex: /ぐ$/,           form: "辞书形",       explanation: "原形（ぐ结尾）" },
  { regex: /く$/,           form: "辞书形",       explanation: "原形（く结尾）" },
  { regex: /す$/,           form: "辞书形",       explanation: "原形（す结尾）" },
  { regex: /る$/,           form: "辞书形",       explanation: "原形（る结尾）" },
];

const VERB_SURFACE_END = /(?:なさった|なさって|えられた|られた|れた|ていた|ている|てきた|ました|ません|なかった|ない|よう|たら|ば|ながら|って|いた|いて|した|んだ|った|て|た|り|む|ぶ|ぐ|く|す|る)$/;

// Particle compounds and postpositions that end in verb-like suffixes but are NOT verbs
const PARTICLE_COMPOUNDS = new Set([
  "について","において","によって","として","にとって","に対して","をめぐって",
  "をもって","にあたって","に関して","に従って","につれて","にわたって",
  "に基づいて","を通じて","を通して","に向けて","に比べて","をはじめとして",
  "に加えて","に反して","に応じて","に際して","にかけて",
  "にて","にして","ないで","なくて","なければ","ながら","として",
]);

// Short pure-hiragana surfaces that look like verb forms but are particles/auxiliaries
const NON_VERB_HIRAGANA = new Set([
  "ない","よう","ば","のに","ので","けど","けれど","ほど","まで","から",
  "ても","でも","って","ては","では","とは","には","には","では",
]);

// Confirmed 2-char hiragana verb past/te-forms that should always be included
const KNOWN_HIRAGANA_VERBS = new Set([
  "した","きた","いた","なた","きて","して","いて","なて",
  "った","んだ",
]);

function detectVerbForm(surface) {
  for (const p of VERB_CONJ_PATTERNS) {
    if (p.regex.test(surface)) return { form: p.form, explanation: p.explanation };
  }
  return null;
}

/**
 * Rough de-conjugation: strip the conjugation suffix and reconstruct a
 * plausible dictionary (plain non-past) form.  Not linguistically perfect
 * but good enough for learner guidance.
 */
function deriveBaseForm(surface) {
  const rules = [
    // longest patterns first
    [/ていた$/, (s) => s.replace(/ていた$/, "る")],
    [/ている$/, (s) => s.replace(/ている$/, "る")],
    [/てきた$/, (s) => s.replace(/てきた$/, "くる")],
    [/なさった$/, (s) => s.replace(/なさった$/, "なさる")],
    [/られた$/, (s) => s.replace(/られた$/, "られる")],
    [/ました$/, (s) => s.replace(/ました$/, "る")],
    [/ません$/, (s) => s.replace(/ません$/, "る")],
    [/なかった$/, (s) => s.replace(/なかった$/, "る")],
    [/ながら$/, (s) => s.replace(/ながら$/, "る")],
    [/って$/, (s) => s.replace(/って$/, "う")],
    [/いて$/, (s) => s.replace(/いて$/, "く")],
    [/いで$/, (s) => s.replace(/いで$/, "ぐ")],
    [/して$/, (s) => s.replace(/して$/, "する")],
    [/んで$/, (s) => s.replace(/んで$/, "ぶ")],   // む/ぬ also possible
    [/て$/, (s) => s.replace(/て$/, "る")],
    [/った$/, (s) => s.replace(/った$/, "う")],
    [/いた$/, (s) => s.replace(/いた$/, "く")],
    [/した$/, (s) => s.replace(/した$/, "する")],
    [/んだ$/, (s) => s.replace(/んだ$/, "ぶ")],
    [/た$/, (s) => s.replace(/た$/, "る")],
    [/ない$/, (s) => s.replace(/ない$/, "る")],
    [/よう$/, (s) => s.replace(/よう$/, "る")],
    [/り$/, (s) => s.replace(/り$/, "る")],
    [/む$/, (s) => s],   // already dictionary form
    [/ぶ$/, (s) => s],
    [/ぐ$/, (s) => s],
    [/く$/, (s) => s],
    [/す$/, (s) => s],
    [/る$/, (s) => s],
  ];
  for (const [pattern, fn] of rules) {
    if (pattern.test(surface)) {
      const derived = fn(surface);
      if (derived !== surface) return derived;
    }
  }
  return surface;
}

/**
 * Directly regex-scan the normalized sentence for verb-like spans.
 * This catches cases where the tokenizer splits a verb across multiple tokens
 * (e.g. "与えられた" tokenized as "与え" + "られた").
 * Pattern: at least one kanji, followed by up to 8 kana, ending in a conjugation suffix.
 */
const TEXT_VERB_RE = /[\u4e00-\u9fff][\u4e00-\u9fff\u3040-\u309f]{0,8}(?:えられた|られた|れた|ていた|ている|てきた|ました|なかった|って|いて|いた|した|んだ|った|て|た|り)/g;

function scanTextForVerbs(text) {
  const found = new Set();
  let m;
  TEXT_VERB_RE.lastIndex = 0;
  while ((m = TEXT_VERB_RE.exec(text)) !== null) {
    found.add(m[0]);
  }
  return [...found];
}

function isLikelyVerb(surface) {
  if (surface.length < 2) return false;
  if (!VERB_SURFACE_END.test(surface)) return false;
  if (PARTICLE_COMPOUNDS.has(surface)) return false;

  const isPureHiragana = /^[ぁ-ん]+$/.test(surface);

  // Contains kanji → almost certainly a real verb with conjugation
  if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(surface)) return true;

  // Pure hiragana: use whitelist for short forms, length filter for longer ones
  if (isPureHiragana) {
    if (NON_VERB_HIRAGANA.has(surface)) return false;
    if (surface.length === 2) return KNOWN_HIRAGANA_VERBS.has(surface);
    // 3+ char hiragana that isn't in the exclusion set is likely a conjugated verb
    return surface.length >= 3;
  }

  // Mixed kana (katakana + hiragana ending) — allow
  return true;
}

function makeVerbEntry(surface, readingHint) {
  const verbForm = detectVerbForm(surface);
  if (!verbForm) return null;
  const baseForm = deriveBaseForm(surface);
  const baseGloss = findGlossZh(baseForm, baseForm) || findGlossZh(surface, surface);
  return {
    surface,
    reading: readingHint || findReading(surface, surface),
    baseForm,
    baseGloss: baseGloss || "",
    ...verbForm,
  };
}

function extractVerbTokens(tokens, normalizedText) {
  const seen = new Set();
  const results = [];

  // Pass 1: token-based detection
  for (const t of tokens) {
    if (seen.has(t.surface)) continue;
    if (!isLikelyVerb(t.surface)) continue;
    seen.add(t.surface);
    const entry = makeVerbEntry(t.surface, t.reading);
    if (entry) results.push(entry);
  }

  // Pass 2: text-level scan — catches verbs the tokenizer split apart
  if (normalizedText) {
    for (const surface of scanTextForVerbs(normalizedText)) {
      if (seen.has(surface)) continue;
      seen.add(surface);
      const entry = makeVerbEntry(surface, "");
      if (entry) results.push(entry);
    }
  }

  return results;
}

/** Returns true if the text contains a meaningful amount of Japanese characters */
function containsJapanese(text) {
  const jpChars = (text.match(/[\u3040-\u30ff\u4e00-\u9fff]/g) || []).length;
  return jpChars / Math.max(text.replace(/\s/g, "").length, 1) > 0.2;
}

export async function analyzeSelection(request, options = {}) {
  const startedAt = performance.now();
  validateRequest(request);

  const source = request.sourceUrl;
  const input = request.text;
  const emptyResult = createEmptyResult({ source, input });

  if (!containsJapanese(input)) {
    return {
      ...emptyResult,
      notJapanese: true,
      meta: { ...emptyResult.meta, elapsedMs: 0, errors: [] }
    };
  }

  if (input.length > (hasAiOptions(options) ? 500 : 200)) {
    return {
      ...emptyResult,
      tooLong: true,
      meta: { ...emptyResult.meta, elapsedMs: 0, errors: [] }
    };
  }

  const aiAttempt = await analyzeWithAiProviders(input, source, options);
  if (aiAttempt.result) {
    return aiAttempt.result;
  }
  if (aiAttempt.warnings.length) {
    return analyzeSelectionLocalWithAiFallback(request, options, startedAt, aiAttempt.warnings);
  }

  return analyzeSelectionLocal(request, options, startedAt);
}

function hasAiOptions(options) {
  return Boolean(options.geminiApiKey || options.groqApiKey || options.openrouterApiKey);
}

function formatAiError(label, error) {
  const msg = error instanceof Error ? error.message : String(error);
  return `${label} 不可用：${msg}`;
}

async function analyzeWithAiProviders(input, source, options) {
  const warnings = [];

  if (options.geminiApiKey) {
    try {
      return { result: await analyzeWithGemini(input, source, options.geminiApiKey), warnings: [] };
    } catch (error) {
      warnings.push(formatAiError("Gemini", error));
    }
  }

  if (options.groqApiKey) {
    try {
      const result = await analyzeWithGroq(input, source, options.groqApiKey);
      if (warnings.length) {
        result.meta.errors = [...warnings, ...(result.meta.errors || [])];
      }
      return { result, warnings: [] };
    } catch (error) {
      warnings.push(formatAiError("Groq", error));
    }
  }

  if (options.openrouterApiKey) {
    try {
      const result = await analyzeWithOpenRouter(input, source, options.openrouterApiKey);
      if (warnings.length) {
        result.meta.errors = [...warnings, ...(result.meta.errors || [])];
      }
      return { result, warnings: [] };
    } catch (error) {
      warnings.push(formatAiError("OpenRouter", error));
    }
  }

  return { result: null, warnings };
}

async function analyzeSelectionLocalWithAiFallback(request, options, startedAt, warnings) {
  const local = await analyzeSelectionLocal(request, options, startedAt);
  local.meta.aiUsed = false;
  local.meta.aiProvider = undefined;
  if (warnings.length) {
    local.meta.errors = [...warnings, "已改用本地分析。", ...(local.meta.errors || [])];
  }
  return local;
}

async function analyzeSelectionLocal(request, options, startedAt) {
  const source = request.sourceUrl;
  const input = request.text;
  const emptyResult = createEmptyResult({ source, input });

  try {
    const normalized = normalizeJapaneseText(input);
    const tokenized = await tokenizeText(normalized, options.dicPath);
    const tokens = enrichTokens(tokenized.tokens);
    const grammar = buildGrammarHits(tokens, normalized);

    return {
      version: ANALYSIS_VERSION,
      source,
      input,
      normalized,
      tokens,
      grammar,
      sentenceCore: extractSentenceCore(tokens, normalized),
      verbTokens: extractVerbTokens(tokens, normalized),
      translationZh: buildTranslation(normalized, tokens),
      summaryZh: buildSummary(normalized, grammar),
      meta: {
        elapsedMs: Math.round(performance.now() - startedAt),
        tokenizer: tokenized.tokenizer,
        fallbackUsed: tokenized.fallbackUsed,
        timestamp: new Date().toISOString(),
        errors: []
      }
    };
  } catch (error) {
    return {
      ...emptyResult,
      meta: {
        ...emptyResult.meta,
        elapsedMs: Math.round(performance.now() - startedAt),
        errors: [error instanceof Error ? error.message : String(error)]
      }
    };
  }
}
