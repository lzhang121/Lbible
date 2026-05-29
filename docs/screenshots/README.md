# Store Screenshots

Chrome Web Store requires at least **one** screenshot (recommended **1280×800** or **640×400**).

## Suggested shots

1. **Main flow** — Japanese page with text selected + floating Verse Parse panel (原文 / 翻译 / 词汇 Tab)
2. **Grammar** — 语法 Tab with chip selected and blue highlight in source text
3. **Options** — AI settings page (show keys stored locally; blur or use fake keys)
4. **Local mode** — Status「本地」+ optional「设置 AI」banner

## How to capture (Chrome)

1. `npm run build` and load `dist/` as unpacked extension
2. Open a Japanese page (e.g. `https://prs.app/ja/bible/jhn.6.jdb`)
3. Select a verse → wait for panel
4. Resize browser window to **1280×800** (DevTools → device toolbar → custom)
5. Screenshot: Win+Shift+S or Chrome DevTools → ⋮ → Capture screenshot

Save files here as `01-main.png`, `02-grammar.png`, etc., then upload to the store listing.

Do not commit screenshots that contain real API keys.
