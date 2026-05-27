import { ANALYSIS_VERSION } from "./contract.js";
import { normalizeJapaneseText } from "./normalize.js";

export const ANALYSIS_SYSTEM_PROMPT = `你是 Verse Parse 的日语学习助手，帮助中文读者理解日文（尤其是圣经日文）。
请分析用户给出的日语句，只返回 JSON，不要 markdown，不要其他说明。

JSON 格式：
{
  "translation": "通顺自然的中文翻译（完整句子，不是逐词堆砌）",
  "phrases": [
    { "pattern": "日语短语或语法", "explanation": "中文说明" }
  ],
  "verbs": [
    {
      "surface": "句中动词形",
      "form": "变形说明（如：过去时、被动、敬语）",
      "reading": "读音（平假名）",
      "base": "原形",
      "baseGloss": "原形中文释义（可选）"
    }
  ],
  "nouns": [
    {
      "surface": "名词",
      "gloss": "中文释义",
      "reading": "读音（平假名或片假名）"
    }
  ]
}

要求：
- phrases 只列重要语法/固定表达，没有则返回空数组
- verbs 只列动词及变形，不要助词
- nouns 只列实义名词/专有名词，三项齐全才列入
- translation 必须是可读的中文整句翻译`;

export function buildAnalysisPrompt(text) {
  return `${ANALYSIS_SYSTEM_PROMPT}\n\n请分析以下日文：\n${text}`;
}

export function extractJson(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(raw);
}

export function mapAiAnalysisResult(parsed, { source, input, elapsedMs, provider, model }) {
  const normalized = normalizeJapaneseText(input);

  return {
    version: ANALYSIS_VERSION,
    source,
    input,
    normalized,
    tokens: (parsed.nouns || [])
      .filter((n) => n?.surface && n?.gloss && n?.reading)
      .map((n) => ({
        surface: String(n.surface),
        glossZh: String(n.gloss),
        reading: String(n.reading),
        pos: "名詞"
      })),
    grammar: (parsed.phrases || [])
      .filter((p) => p?.pattern && p?.explanation)
      .map((p) => ({
        type: "phrase",
        pattern: String(p.pattern),
        explanationZh: String(p.explanation)
      })),
    verbTokens: (parsed.verbs || [])
      .filter((v) => v?.surface && v?.form)
      .map((v) => ({
        surface: String(v.surface),
        explanation: String(v.form),
        reading: v.reading ? String(v.reading) : "",
        baseForm: v.base ? String(v.base) : "",
        baseGloss: v.baseGloss ? String(v.baseGloss) : "",
        form: String(v.form)
      })),
    translationZh: String(parsed.translation || "").trim() || "（未生成翻译）",
    summaryZh: "",
    meta: {
      elapsedMs,
      tokenizer: model,
      aiProvider: provider,
      fallbackUsed: false,
      aiUsed: true,
      timestamp: new Date().toISOString(),
      errors: []
    }
  };
}
