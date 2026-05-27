import { analyzeSelection } from "../src/analyzer/pipeline.js";

const sample = {
  text: "その後、イエスはガリラヤの湖の向こう岸に行かれた。",
  sourceUrl: "https://prs.app/ja/bible/jhn.6.jdb",
  selectionMeta: { hasRuby: true }
};

const result = await analyzeSelection(sample, { dicPath: "" });

if (!result || !Array.isArray(result.tokens)) {
  throw new Error("Smoke test failed: result tokens missing.");
}
if (!Array.isArray(result.grammar)) {
  throw new Error("Smoke test failed: grammar array missing.");
}

console.log("Smoke test passed.");
