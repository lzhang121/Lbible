export const ANALYSIS_VERSION = "1.0.0";

export function validateRequest(request) {
  if (!request || typeof request !== "object") {
    throw new Error("Invalid analysis request.");
  }
  if (!request.text || typeof request.text !== "string") {
    throw new Error("Request text is required.");
  }
  if (!request.sourceUrl || typeof request.sourceUrl !== "string") {
    throw new Error("Request sourceUrl is required.");
  }
}

export function createEmptyResult({ source, input }) {
  return {
    version: ANALYSIS_VERSION,
    source,
    input,
    normalized: input,
    tokens: [],
    grammar: [],
    translationZh: "未能完成完整分析，请查看原文。",
    summaryZh: "基础模式：请结合上下文理解该句。",
    meta: {
      elapsedMs: 0,
      tokenizer: "fallback",
      fallbackUsed: true,
      timestamp: new Date().toISOString(),
      errors: []
    }
  };
}
