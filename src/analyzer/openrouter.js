import { buildAnalysisPrompt, extractJson, mapAiAnalysisResult } from "./ai-shared.js";

const OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

async function callOpenRouter(text, apiKey) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "chrome-extension://verse-parse",
      "X-Title": "Verse Parse"
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: buildAnalysisPrompt(text) }]
    })
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`OpenRouter API ${response.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter 未返回有效内容。");
  }
  return extractJson(content);
}

export async function analyzeWithOpenRouter(text, sourceUrl, apiKey) {
  const startedAt = performance.now();
  const parsed = await callOpenRouter(text, apiKey);
  return mapAiAnalysisResult(parsed, {
    source: sourceUrl,
    input: text,
    elapsedMs: Math.round(performance.now() - startedAt),
    provider: "OpenRouter",
    model: OPENROUTER_MODEL
  });
}
