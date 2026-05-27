# Privacy Policy (Draft)

Last updated: 2026-05-27

## Overview

Verse Parse is a local-first Chrome extension for Japanese text analysis.

## What Data Is Processed

- User-selected text from webpages where the extension is enabled.
- Current page URL (used only to annotate analysis results in the side panel).

## What Data Is Not Collected

- Full webpage content is not uploaded or stored by default.
- No account data is required.
- No cloud API calls are made in v1.

## Local Storage Usage

- The extension may store local preferences and recent analysis snapshots in `chrome.storage.local`.
- Data remains on the user's device unless the user exports it manually.

## Permissions Rationale

- `contextMenus`: trigger analysis from right-click on selected text.
- `activeTab` / `tabs`: request selected text from the active page.
- `sidePanel`: show analysis UI.
- `storage`: local preferences and temporary records.
- Host permission (`https://prs.app/*`): run content script on target Japanese Bible pages.

## Contact

If you publish this extension, add a support email and policy URL before store submission.
