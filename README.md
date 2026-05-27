# Verse Parse

Chrome extension MVP focused on Chinese Christians learning Japanese Bible text on `https://prs.app/ja/bible/jhn.6.jdb`.

## Features

- Select Japanese text and analyze via context menu.
- Local tokenizer pipeline (kuromoji + fallback mode).
- Grammar hit suggestions (particles, verb forms, phrase patterns).
- Chinese summary, translation hint, and word gloss list.
- Copy analysis output from side panel.

## Project Structure

- `src/`: extension source files
- `src/analyzer/`: local analysis pipeline
- `schemas/`: output schema contract
- `docs/`: privacy, store checklist, perf checklist
- `scripts/build.mjs`: creates `dist/` package

## Local Setup

```bash
npm install
npm run build
```

Load unpacked extension in Chrome from `dist/`.

## Test

```bash
npm test
```

## Notes

- v1 is local-first and does not require paid APIs.
- Host permission is intentionally limited to `https://prs.app/*`.
