const PUNCTUATION_MAP = {
  "，": "、",
  "。": "。",
  "！": "!",
  "？": "?"
};

export function normalizeJapaneseText(input) {
  if (!input) return "";

  let normalized = input;
  normalized = normalized.replace(/\s+/g, " ").trim();
  // Strip leading verse numbers (e.g. "8" or "22" at the start)
  normalized = normalized.replace(/^\d+\s*/, "");
  normalized = normalized.replace(/[，。！？]/g, (char) => PUNCTUATION_MAP[char] || char);
  normalized = normalized.replace(/\s([、。!?])/g, "$1");
  return normalized;
}
