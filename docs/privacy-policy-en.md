# Privacy Policy

Last updated: 2026-05-27

## Overview

Verse Parse is a Chrome extension that helps Chinese-speaking users read Japanese text. Analysis runs locally by default. You may optionally enable AI enhancement (Gemini, Groq, or OpenRouter) in the options page using your own API keys.

This policy explains what data the extension processes, where it goes, and your choices.

## Data We Process

### When you trigger analysis

The extension reads data only when **you** take action: select text, use the context menu, press `Ctrl+Shift+Y`, or click the toolbar icon.

- **Selected text** (may include ruby markup from the page for better readings)
- **Current page URL** (stored in analysis metadata on your device; not sent to our servers)

The extension does **not** scrape full pages or scan content in the background.

### Optional AI (user-configured)

If you enable AI in extension options and provide an API key, selected text is sent over HTTPS to the **third-party provider you choose** (Google Gemini, Groq, or OpenRouter).

- API keys are stored only in `chrome.storage.local` on your device
- We do not collect, host, or relay your API keys
- When AI is disabled, **no data** is sent to those cloud services

### Local-only data on your device

| Key | Purpose |
|-----|---------|
| `overlayLayout` | Floating panel position and size |
| `aiSetupHintDismissed` | Whether to hide the “Set up AI” hint |
| `geminiEnabled` / `geminiApiKey`, etc. | AI toggles and user-provided keys |

No account is required. This data is not synced to our servers.

## What We Do Not Do

- Sell, rent, or trade user data
- Use analytics or advertising trackers
- Read page content without a user-triggered action
- Require sign-in

## Permissions Rationale

| Permission | Why |
|------------|-----|
| `contextMenus` | “Analyze selection” from the right-click menu |
| `activeTab` / `tabs` | Read the user’s current selection and page URL |
| `scripting` | Read selection via keyboard shortcut; fallback overlay injection |
| `storage` | Local preferences, panel layout, optional AI settings |
| `<all_urls>` | Analyze Japanese text the user selects on any website |
| Gemini / Groq / OpenRouter hosts | Called only when the user enables AI with their own key |

## Third-Party Services (Optional AI)

When AI is enabled, selected text is handled under the provider’s policies:

- [Google Gemini API](https://ai.google.dev/gemini-api/terms)
- [Groq](https://groq.com/privacy-policy/)
- [OpenRouter](https://openrouter.ai/privacy)

Review those terms before enabling AI.

## Data Retention

- Local storage: until you clear extension data or uninstall
- AI requests: retained per the third-party provider; the extension does not persist copies on external servers

## Children

The extension is not directed at children under 13.

## Changes

We may update this policy. Material changes will be reflected in the “Last updated” date.

## Contact

- Support email: zhspark@gmail.com
- Policy URL: https://lzhang121.github.io/Lbible/privacy.html
