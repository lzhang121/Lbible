# Verse Parse

Chrome 扩展（Manifest V3）：在任意网页上划选日文，获得词汇、语法与中文释义分析。默认本地分析（kuromoji + 规则引擎），可选配置 Gemini / Groq / OpenRouter API Key 增强结果。

## Features

- 划选触发浮动分析面板（iframe 嵌入，无刷新更新）
- 词汇 Tab：词形、读音、词性、中文 gloss
- 语法 Tab：规则命中 + 原文/面板双向高亮
- 中文翻译（点击复制）
- 右键菜单、快捷键 `Ctrl+Shift+Y`、工具栏开关（暂停取词）
- 本地优先；AI 不可用时回退本地并支持「重试 AI」
- 深色模式、可拖拽面板布局记忆

## Project Structure

```
src/                 # 扩展源码
  analyzer/          # 分词、语法、词典、可选 AI 适配器
  icons/             # icon-source.png → 16/48/128
  manifest.json
  content.js         # 划选、浮动 overlay
  background.js      # 分析调度、context menu
  sidepanel.html/js  # 分析 UI（embedded 模式）
  options.html/js    # AI Key 与开关
scripts/
  build.mjs          # 输出 dist/
  generate-icons.mjs # 从 icon-source.png 生成尺寸
  package.mjs        # 打 Chrome 商店 zip
  smoke-test.mjs
docs/
  privacy-policy.md
  chrome-store-readiness.md
dist/                # npm run build（gitignore）
release/             # npm run package（gitignore）
```

## Local Setup

```bash
npm install
npm run build
```

Chrome → 扩展程序 → 开发者模式 → **加载已解压的扩展程序** → 选择 `dist/`。

更换图标：替换 `src/icons/icon-source.png` 后运行 `node scripts/generate-icons.mjs`，再 `npm run build`。

## Test

```bash
npm test
```

## Package for Chrome Web Store

```bash
npm run package
```

上传 `release/verse-parse-<version>.zip`（zip 根目录含 `manifest.json`）。

发布清单、商店文案与权限说明见 [docs/chrome-store-readiness.md](docs/chrome-store-readiness.md)。  
隐私政策：托管 [docs/privacy.html](docs/privacy.html)（GitHub Pages 选 `/docs` 目录即可）。  
英文列表与隐私问卷参考：`docs/store-listing-en.md`、`docs/chrome-web-store-privacy-answers.md`。  
逐步发布说明：`docs/PUBLISH.md`（含 GitHub Pages 与商店字段）。

## Permissions (summary)

| 权限 | 用途 |
|------|------|
| `<all_urls>` | 任意站点上用户主动选中的日文 |
| `scripting` | 快捷键读选区、面板回退注入 |
| `storage` | 布局、AI 设置（Key 仅本地） |
| AI host permissions | 用户启用 AI 时调用对应 API |

## Notes

- 不向自有服务器上传数据；可选 AI 由用户 Key 直连第三方。
- `sidepanel.html` 以页面内 iframe 展示，非 Chrome Side Panel API。
