# v1 Analysis Contract

This document defines the input and output contract for the free local analysis pipeline.

## Input Contract

All analysis requests use this payload:

```json
{
  "text": "その後、イエスはガリラヤの湖の向こう岸に行かれた。",
  "sourceUrl": "https://prs.app/ja/bible/jhn.6.jdb",
  "selectionMeta": {
    "hasRuby": true
  }
}
```

Fields:

- `text`: selected and cleaned text from the page (required)
- `sourceUrl`: current page URL (required)
- `selectionMeta.hasRuby`: whether ruby tags were present in the selected DOM (optional)

## Output Contract

The output must satisfy [`schemas/analysis-result.schema.json`](../schemas/analysis-result.schema.json).

Example:

```json
{
  "version": "1.0.0",
  "source": "https://prs.app/ja/bible/jhn.6.jdb",
  "input": "その後、イエスはガリラヤの湖の向こう岸に行かれた。",
  "normalized": "その後、イエスはガリラヤの湖の向こう岸に行かれた。",
  "tokens": [
    {
      "surface": "イエス",
      "baseForm": "イエス",
      "reading": "イエス",
      "pos": "名詞",
      "glossZh": "耶稣"
    }
  ],
  "grammar": [
    {
      "type": "particle",
      "pattern": "は",
      "explanationZh": "提示主题"
    }
  ],
  "translationZh": "后来，耶稣到了加利利海的对岸。",
  "summaryZh": "这句话说明耶稣前往湖的对岸。",
  "meta": {
    "elapsedMs": 24,
    "tokenizer": "kuromoji",
    "fallbackUsed": false,
    "timestamp": "2026-05-27T00:00:00.000Z"
  }
}
```

## Rendering Guidance

- If `tokens` is empty, still show `input` and `summaryZh`.
- If `meta.fallbackUsed` is true, show a small "基础模式" badge.
- If `meta.errors` exists, show a non-blocking warning panel in UI.
