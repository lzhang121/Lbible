# Stability and Performance Checks

Target page: `https://prs.app/ja/bible/jhn.6.jdb`

## Automated Checks

- Build: `npm run build` (pass)
- Analyzer smoke test: `npm test` (pass)

## Manual Compatibility Checklist

Use Chrome extension dev mode, load `dist/`:

1. Open target page and select a verse with ruby.
2. Trigger context menu `分析这段日文`.
3. Verify side panel displays:
   - normalized source text
   - summary and translation sections
   - token cards
   - grammar hit list
4. Trigger analysis for:
   - short text (single phrase)
   - long text (2-3 verses)
   - no selection case
5. Verify error state:
   - status shows guidance when no selection is available
6. Verify copy flow:
   - click "复制分析结果", paste into notes app

## Performance Method

During manual runs, read timing from side panel status line:

- Format: `分词引擎: <tokenizer> · <elapsedMs>ms`
- Acceptance: common one-verse selection should stay <= 1500ms.

## Notes

- If `kuromoji` dictionary fails to load on a page, fallback tokenizer runs and keeps UI usable.
- Ruby text is cleaned by removing `rt/rp` nodes from selected DOM fragments before analysis.
