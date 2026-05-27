import { findGlossZh, getGlossaryEntries } from "./dictionary.js";

/** Longest-first Bible phrase patterns → natural Chinese */
const BIBLE_PHRASE_RULES = [
  [/彼は主よ、信じますと言って、イエスを礼拝した/g, "他说：「主啊，我信。」就拜了耶稣"],
  [/主よ、信じます/g, "主啊，我信"],
  [/と言って/g, "说"],
  [/礼拝した/g, "拜了"],
  [/礼拝する/g, "拜"],
  [/信じます/g, "我信"],
  [/主よ/g, "主啊"],
  [/彼は/g, "他"],
  [/わたしが世の光です/g, "我是世界的光"],
  [/世にいる間は/g, "在世时"],
  [/世の光/g, "世界的光"],
  [/世にいる/g, "在世"],
  [/大勢の群衆がイエスについて行った/g, "有大批群众跟随耶稣"],
  [/イエスが病人たちになさっていたしるしを見たからであった/g, "这是因为看见耶稣在病人身上所行的神迹"],
  [/イエスについて行った/g, "跟随耶稣"],
  [/病人たちになさっていたしるし/g, "耶稣在病人身上所行的神迹"],
  [/感謝の祈りをささげてから/g, "献感谢祷告之后"],
  [/望むだけ与えられた/g, "想要多少就给了多少"],
  [/座っている人たちに分け与えられた/g, "分给在座的人"],
  [/分け与えられた/g, "分给了"],
  [/弟子たちとともにそこに座られた/g, "和门徒一同坐在那里"],
  [/弟子たちと一緒に/g, "和门徒一同"],
  [/イエスはガリラヤの湖の向こう岸に行かれた/g, "耶稣到了加利利湖的对岸"],
  [/弟子の一人、シモン・ペテロの兄弟アンデレがイエスに言った/g, "有一个门徒，就是西门·彼得兄弟安得烈，对耶稣说"],
  [/イエスはパンを取り/g, "耶稣拿起饼"],
  [/がイエスに言った/g, "对耶稣说"],
  [/弟子の一人/g, "有一个门徒"],
  [/シモン・ペテロの兄弟/g, "西门·彼得的兄弟"],
  [/見たからであった/g, "，这是因为看见了"],
  [/について行った/g, "跟随"],
  [/について/g, "关于"],
  [/からであった/g, "，这是因为"],
  [/なさっていた/g, "所行的"],
  [/大勢の群衆/g, "大批群众"],
  [/感謝の祈り/g, "感谢祷告"],
  [/座っている人たち/g, "在座的人"],
  [/弟子たち/g, "门徒们"],
  [/その後[、,]?/g, "此后，"],
  [/そうして[、,]?/g, "于是，"],
  [/まことに[、,]?/g, "我实实在在地告诉你们，"],
  [/に行かれた/g, "到了"],
  [/行かれた/g, "去了"],
  [/与えられた/g, "给了"],
  [/見て/g, "看见"],
  [/取り/g, "拿起"],
  [/ささげて/g, "献上"],
  [/ささげてから/g, "献上之后"],
  [/ともに/g, "一同"],
  [/人たち/g, "人们"],
  [/大勢/g, "大批"],
];

const PARTICLE_MAP = new Map([
  ["からであった", "，这是因为"],
  ["のであった", "，这是因为"],
  ["であった", ""],
  ["だった", ""],
  ["ていた", ""],
  ["ている", ""],
  ["られた", ""],
  ["なさっていた", "所行的"],
  ["いる間は", "在世时"],
  ["ました", "了"],
  ["ません", "没有"],
  ["です", ""],
  ["ます", ""],
  ["たち", "们"],
  ["から", "因为"],
  ["まで", "到"],
  ["ほど", "约"],
  ["ごと", "每"],
  ["ので", "因为"],
]);

/** Single-char particles: boundary-safe regex only (avoid breaking わたし etc.) */
const BOUNDARY_PARTICLE_RULES = [
  [/の(?=[\u4e00-\u9fff\u30a0-\u30ff])/g, "的"],
  [/が(?=[\u3040-\u3096\u4e00-\u9fff\u30a0-\u30ff])/g, ""],
  [/は(?=[\u3040-\u3096\u4e00-\u9fff\u30a0-\u30ff])/g, ""],
  [/を(?=[\u3040-\u3096\u4e00-\u9fff\u30a0-\u30ff])/g, ""],
  [/に(?=[\u3040-\u3096\u4e00-\u9fff\u30a0-\u30ff])/g, ""],
  [/で(?=[\u3040-\u3096\u4e00-\u9fff\u30a0-\u30ff])/g, ""],
  [/と(?=[\u3040-\u3096\u4e00-\u9fff\u30a0-\u30ff])/g, ""],
  [/も(?=[\u3040-\u3096\u4e00-\u9fff\u30a0-\u30ff])/g, "也"],
  [/へ(?=[\u3040-\u3096\u4e00-\u9fff\u30a0-\u30ff])/g, "向"],
  [/て(?=[\u3040-\u3096\u4e00-\u9fff])/g, ""],
  [/(?<=[\u3041-\u3094\u4e00-\u9fff]|[っん])た(?=[、，。！？」\s]|$)/g, "了"],
];

function applyPhraseRules(text) {
  let output = text;
  for (const [pattern, replacement] of BIBLE_PHRASE_RULES) {
    pattern.lastIndex = 0;
    output = output.replace(pattern, replacement);
  }
  return output;
}

function applyGlossary(text) {
  let output = text;
  const entries = getGlossaryEntries().sort((a, b) => b[0].length - a[0].length);
  for (const [jp, zh] of entries) {
    if (!jp || !zh) continue;
    output = output.split(jp).join(zh);
  }
  return output;
}

function applyParticles(text) {
  let output = text;
  const longParticles = [...PARTICLE_MAP.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [jp, zh] of longParticles) {
    output = output.split(jp).join(zh);
  }
  for (const [pattern, replacement] of BOUNDARY_PARTICLE_RULES) {
    pattern.lastIndex = 0;
    output = output.replace(pattern, replacement);
  }
  return output;
}

/** Remove leftover hiragana grammar fragments (not content words) */
function stripRemainingHiragana(text) {
  return text
    .replace(/[\u3041-\u3096]{1,6}/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function polishTranslation(text) {
  return text
    .replace(/世界界/g, "世界")
    .replace(/^[、，]+/, "")
    .replace(/、+/g, "，")
    .replace(/，+/g, "，")
    .replace(/。+/g, "。")
    .replace(/，。/g, "。")
    .replace(/。，/g, "。")
    .replace(/的的+/g, "的")
    .replace(/世界界/g, "世界")
    .replace(/跟随去了/g, "跟随")
    .replace(/看见了因此/g, "看见了")
    .replace(/，这是因为，这是因为/g, "，这是因为")
    .replace(/是因为，这是因为/g, "，这是因为")
    .replace(/([^，。])因此/g, "$1，这是因为")
    .replace(/饼拿起/g, "拿起饼")
    .replace(/耶稣说了。/g, "对耶稣说。")
    .replace(/对耶稣说对耶稣说/g, "对耶稣说")
    .replace(/祈从/g, "祷告之后")
    .replace(/分被给予/g, "分给了")
    .replace(/被给予/g, "给了")
    .replace(/前往了/g, "去了")
    .replace(/，$/g, "。")
    .replace(/([^。])$/g, "$1。")
    .trim();
}

/**
 * Build a readable Chinese gloss from Japanese text using phrase rules + glossary.
 */
export function buildReadableTranslation(normalized, tokens) {
  if (!normalized) return "未检测到文本。";

  let output = normalized.replace(/[「」『』]/g, "").trim();
  output = applyPhraseRules(output);
  output = applyGlossary(output);
  output = applyParticles(output);
  output = stripRemainingHiragana(output);
  output = polishTranslation(output);

  const hasChinese = /[\u4e00-\u9fff]/.test(output);
  const stillMostlyJapanese = (output.match(/[\u3040-\u30ff\u4e00-\u9fff]/g) || [])
    .filter((c) => /[\u3040-\u30ff]/.test(c)).length > output.length * 0.15;

  if (hasChinese && !stillMostlyJapanese && output.length >= 4) {
    return output;
  }

  // Fallback: keyword gloss list
  const hints = tokens
    .filter((t) => t.glossZh && t.surface.length >= 2)
    .filter((t, i, arr) => arr.findIndex((x) => x.surface === t.surface) === i)
    .slice(0, 10)
    .map((t) => `${t.surface}→${t.glossZh}`)
    .join("；");

  if (hints) {
    return `（词库参考）${hints}`;
  }

  return "（当前词库不足，建议结合原文阅读）";
}
