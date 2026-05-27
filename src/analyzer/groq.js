import { buildAnalysisPrompt, extractJson, mapAiAnalysisResult } from "./ai-shared.js";

const GROQ_MODEL = "llama-3.3-70b-versatile";
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

async function callGroq(text, apiKey) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: buildAnalysisPrompt(text) }]
    })
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`Groq API ${response.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq 未返回有效内容。");
  }
  return extractJson(content);
}

export async function analyzeWithGroq(text, sourceUrl, apiKey) {
  const startedAt = performance.now();
  const parsed = await callGroq(text, apiKey);
  return mapAiAnalysisResult(parsed, {
    source: sourceUrl,
    input: text,
    elapsedMs: Math.round(performance.now() - startedAt),
    provider: "Groq",
    model: GROQ_MODEL
  });
}
