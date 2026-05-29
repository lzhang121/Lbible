# Chrome Web Store — Privacy Practices (参考答案)

在开发者控制台填写「Privacy practices」时可参考以下表述（按实际表单字段调整措辞）。

## 数据用途总述

Verse Parse processes **only text the user explicitly selects** on a web page when they trigger analysis (selection, context menu, keyboard shortcut, or toolbar action). The extension does not collect full page content, browsing history, or account credentials.

Optional AI features send selected text to **third-party APIs chosen and authenticated by the user** (Gemini, Groq, or OpenRouter). API keys are stored locally in `chrome.storage.local`.

## 常见字段对照

| 表单问题 | 建议回答 |
|----------|----------|
| 是否收集 personally identifiable information? | **No** — no names, emails, or accounts required |
| 是否收集 health information? | **No** |
| 是否收集 financial/payment information? | **No** |
| 是否收集 authentication information? | **No** — user API keys stay on device; not transmitted to us |
| 是否收集 personal communications? | **No** |
| 是否收集 location? | **No** |
| 是否收集 web history? | **No** — only the current page URL may be stored locally in analysis metadata |
| 是否收集 user activity? | **Limited** — only user-selected text at the moment of analysis |
| 是否收集 website content? | **Limited** — only the selected text fragment, not the full page |

## 数据是否用于以下目的

| 目的 | 答案 |
|------|------|
| 广告 | No |
| 出售给第三方 | No |
| 信用评估 | No |
| 个性化广告 | No |
| 扩展功能（分析） | Yes — selected text for on-device or user-configured AI analysis |
| 分析/统计（自有服务器） | No |

## 数据是否加密

- **In transit**: HTTPS for optional AI API calls
- **At rest**: Chrome extension local storage on the user’s device (protected by OS/browser)

## 用户如何请求删除数据

卸载扩展，或在 Chrome → 扩展程序 → Verse Parse → 详细信息 → 清除存储数据。

## 隐私政策 URL

托管 `docs/privacy.html` 后填入公开 URL，例如：

`https://lzhang121.github.io/Lbible/privacy.html`

## 支持邮箱

zhspark@gmail.com

## 远程代码 / 第三方代码

- No remotely hosted executable code
- Optional AI: standard HTTPS JSON APIs; responses parsed locally
- No analytics SDKs
