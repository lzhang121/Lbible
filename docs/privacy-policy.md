# Privacy Policy

Last updated: 2026-05-27

## Overview

Verse Parse（「本扩展」）是一款面向中文用户的日语阅读辅助 Chrome 扩展。默认在本地完成分词与语法分析；用户可在设置页自愿启用 AI 增强（Gemini / Groq / OpenRouter），并自行提供 API Key。

本政策说明本扩展处理哪些数据、数据去向，以及你有哪些选择。

## Data We Process

### When you trigger analysis

仅在您主动操作时（划选文字、右键菜单、快捷键 `Ctrl+Shift+Y`、或点击扩展图标）本扩展会读取：

- **您选中的文本片段**（可能含页面内 ruby 注音结构，用于更准确读音）
- **当前页面 URL**（写入分析结果元数据，便于区分来源；不会上传至我们的服务器）

本扩展**不会**主动抓取整页 HTML 或后台扫描页面内容。

### Optional AI (user-configured)

若在「扩展选项」中启用 AI 并填写 API Key，选中的文本会通过 HTTPS 发送至**您选择**的第三方服务（Google Gemini、Groq 或 OpenRouter），用于生成更丰富的释义与语法说明。

- API Key 仅保存在您设备上的 `chrome.storage.local`
- 我们不会代管、收集或传输您的 API Key 至自有服务器
- 未启用 AI 时，**不会**向上述云服务发送任何数据

### Local-only data on your device

以下数据仅存于本机，卸载扩展或清除浏览器扩展数据后删除：

| 键名 | 用途 |
|------|------|
| `overlayLayout` | 浮动分析面板的位置与尺寸 |
| `aiSetupHintDismissed` | 是否隐藏「设置 AI」提示 |
| `geminiEnabled` / `geminiApiKey` 等 | AI 开关与用户自填 Key |

本扩展不提供账号体系，也不将上述数据同步至云端。

## What We Do Not Do

- 不出售、出租或交易用户数据
- 不使用第三方分析/广告追踪 SDK
- 不在无用户操作的情况下读取页面内容
- 不要求注册或登录

## Permissions Rationale

| 权限 | 原因 |
|------|------|
| `contextMenus` | 右键菜单「分析选中文本」 |
| `activeTab` / `tabs` | 获取当前标签页中的选中内容与 URL |
| `scripting` | 在快捷键等场景下读取选区；必要时注入浮动面板回退 UI |
| `storage` | 保存本地偏好、面板布局、（可选）AI 配置 |
| `<all_urls>`（content script + host） | 在任意网页上划选日文时使用；仅响应用户触发的分析 |
| `generativelanguage.googleapis.com` 等 | 仅在用户启用对应 AI 且自填 Key 时调用 |

## Third-Party Services (Optional AI)

启用 AI 时，选中文字的处理受相应服务商隐私政策约束：

- [Google Gemini API](https://ai.google.dev/gemini-api/terms)
- [Groq](https://groq.com/privacy-policy/)
- [OpenRouter](https://openrouter.ai/privacy)

请在启用前阅读并确认可接受其条款。

## Data Retention

- 本地存储：直至您清除扩展数据或卸载扩展
- AI 请求：由第三方服务商按其政策保留；本扩展不持久化请求副本至外部服务器

## Children

本扩展不面向 13 岁以下儿童，亦不会故意收集儿童信息。

## Changes

我们可能更新本政策。重大变更时会在扩展或商店说明中注明更新日期。

## Contact

- Support email: zhspark@gmail.com
- Policy URL: https://lzhang121.github.io/Lbible/privacy.html
