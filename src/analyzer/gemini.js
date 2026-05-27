import { buildAnalysisPrompt, extractJson, mapAiAnalysisResult } from "./ai-shared.js";

const GEMINI_MODEL = "gemini-2.0-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function callGemini(text, apiKey) {
  const response = await fetch(`${API_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildAnalysisPrompt(text) }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`Gemini API ${response.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const partText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!partText) {
    throw new Error("Gemini 未返回有效内容。");
  }
  return extractJson(partText);
}

export async function analyzeWithGemini(text, sourceUrl, apiKey) {
  const startedAt = performance.now();
  const parsed = await callGemini(text, apiKey);
  return mapAiAnalysisResult(parsed, {
    source: sourceUrl,
    input: text,
    elapsedMs: Math.round(performance.now() - startedAt),
    provider: "Gemini",
    model: GEMINI_MODEL
  });
}
