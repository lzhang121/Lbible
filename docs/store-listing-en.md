# Chrome Web Store Listing (English)

Use this for the English store listing or as a reference for reviewers.

## Name

Verse Parse

## Short description (≤132 characters)

Select Japanese text on any page for vocabulary, grammar, and Chinese glosses. Local-first; optional Gemini/Groq/OpenRouter AI.

## Detailed description

Verse Parse helps Chinese-speaking readers understand Japanese text on the web—especially for Bible study and daily reading.

Select any Japanese passage and get structured analysis in a floating panel:

- **Vocabulary**: surface form, dictionary form, reading, part of speech, Chinese gloss
- **Grammar**: particles, verb forms, pattern hits; click chips to highlight matching text
- **Comprehension**: Chinese translation (click to copy) and brief notes
- **UX**: draggable panel, Esc to close, dark mode, layout remembered locally

**How to use**

- Select Japanese text → analysis panel opens
- Right-click → “Verse Parse: Analyze selection”
- Shortcut: `Ctrl+Shift+Y`
- Toolbar icon toggles auto-selection on/off

**Optional AI**

Add your own API key in extension options to use Gemini, Groq, or OpenRouter. If AI is unavailable, the extension falls back to local analysis at no cost.

**Privacy**

Only text you explicitly select is processed. Keys and preferences stay on your device. See the linked privacy policy.

## Category

Productivity or Education

## Tags

Japanese, grammar, Bible study, reading, Chinese, language learning

## Single purpose (for review form)

Help users analyze **user-selected** Japanese text on web pages with local parsing and optional user-configured AI for vocabulary, grammar, and Chinese explanations.

## Permission justifications (English)

| Permission | Justification |
|------------|---------------|
| `contextMenus` | Trigger analysis from the selection context menu |
| `activeTab` / `tabs` | Read the active tab’s selected text and URL when the user requests analysis |
| `scripting` | Read selection via keyboard shortcut; inject fallback overlay UI if messaging fails |
| `storage` | Save panel layout, UI preferences, and optional AI settings (keys stored locally only) |
| `<all_urls>` | Users read Japanese on many sites; the extension only acts on explicit user selection |
| AI host permissions | HTTPS calls to Gemini/Groq/OpenRouter only when the user enables AI with their own API key |
