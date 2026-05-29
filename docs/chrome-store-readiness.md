# Chrome Web Store 发布清单

## 1. 构建与打包

```bash
npm install
npm run build      # 生成 dist/
npm test           # 本地分析冒烟测试
npm run package    # 生成 release/verse-parse-<version>.zip
```

- [ ] `npm run build` 成功，`dist/icons/` 含 16 / 48 / 128
- [ ] `npm test` 通过
- [ ] `npm run package` 生成 zip（根目录为 `manifest.json`，非嵌套 `dist/` 文件夹）
- [ ] 在 Chrome「加载已解压的扩展程序」中加载 `dist/` 做最终手测

## 2. 权限与审核说明（填表用）

### 单一用途（Single purpose）

帮助用户在网页上**主动选中**的日语文本进行本地或可选 AI 辅助的语法、词汇与中文释义分析，提升阅读效率（尤其面向圣经等日文阅读场景）。

### 为何需要 `<all_urls>`

用户可能在任意网站阅读日文（prs.app、电子书、新闻、PDF 网页版等）。Content script 仅在页面 idle 时注册，**只有用户划选/右键/快捷键/点击图标**才会读取选区并显示浮动分析面板，不会后台采集整页。

### 各权限一句话

| 权限 | 审核说明（中文） |
|------|------------------|
| `contextMenus` | 右键菜单触发分析 |
| `activeTab` / `tabs` | 读取用户当前选中的文本与页面 URL |
| `scripting` | 快捷键场景读取选区；content script 不可用时的面板回退 |
| `storage` | 保存面板布局、AI 设置（Key 仅存本地） |
| `<all_urls>` | 任意网页上用户主动选中的日文分析 |
| Gemini / Groq / OpenRouter host | 用户自愿启用 AI 且自填 Key 时才请求 |

### 远程代码

- [x] 无 eval / 无远程加载 JS
- [x] AI 仅通过 `fetch` 调用 HTTPS API，返回 JSON

## 3. 隐私与合规

- [ ] 将 `docs/privacy.html` 托管为公开 URL
- [x] 支持邮箱：`zhspark@gmail.com`（见 `docs/privacy.html`）
- [ ] 推送后启用 GitHub Pages，确认隐私政策 URL 可访问
- [ ] 商店「隐私权规范」参考 `docs/chrome-web-store-privacy-answers.md`
- [ ] 确认不上传 `.env` 或任何 API Key 到仓库

### GitHub Pages（推荐，零构建）

1. 推送仓库到 GitHub（例如 `username/Lbible`）
2. 仓库 **Settings → Pages → Build and deployment**
3. Source 选 **Deploy from a branch**
4. Branch: `main`，Folder: **`/docs`**
5. 保存后访问：`https://lzhang121.github.io/Lbible/privacy.html`

若 GitHub 用户名或仓库名不同，请同步修改 `docs/privacy.html` 与本节 URL。

隐私政策 Markdown 源文件：`docs/privacy-policy.md`（中文）、`docs/privacy-policy-en.md`（英文）  
英文商店文案：`docs/store-listing-en.md`

## 4. 商店素材

### 图标

- [x] 128×128（`src/icons/icon128.png`，build 后复制到 `dist/icons/`）
- [ ] 如需促销图：440×280 小图、1400×560 大图（可选）

### 截图（至少 1 张，建议 1280×800）

拍摄步骤见 `docs/screenshots/README.md`。建议包含：

1. 网页划选日文 + 右侧浮动面板（原文 / 翻译 / 词汇 Tab）
2. 语法 Tab 与原文高亮联动
3. 选项页 AI 配置（说明 Key 本地保存）
4. 本地模式 +「设置 AI」提示（可选）

### 列表文案（可直接粘贴）

**名称：** Verse Parse

**简短说明（132 字内）：**  
选中网页日文即得词汇、语法与中文释义；本地优先，可选 Gemini/Groq/OpenRouter AI。

**详细说明：**

Verse Parse 面向需要阅读日语文本的中文用户（尤其圣经精读），在任意网页上划选文字即可获得结构化分析：

- **词汇**：词形、原形、读音、词性、中文释义  
- **语法**：助词、动词形态、句型要点；点击词条可联动原文高亮  
- **理解**：中文翻译（点击可复制）与简要说明  
- **交互**：浮动面板可拖拽、Esc 关闭；支持深色模式  

**使用方式**

- 划选日文 → 自动弹出分析面板  
- 右键「Verse Parse: 分析选中文本」  
- 快捷键 `Ctrl+Shift+Y`  
- 点击工具栏图标可暂停/恢复取词  

**AI（可选）**  
在扩展选项中填入您自己的 API Key 可启用 Gemini、Groq 或 OpenRouter；未配置或失败时自动回退本地分析，无需付费即可使用核心功能。

**隐私**  
仅处理您主动选中的文本片段，不扫描整页。API Key 与偏好设置保存在本机。详见隐私政策链接。

**分类：** Productivity 或 Education  

**标签建议：** 日语, 语法解析, 查经, 阅读, 中文释义, Bible  

**English listing:** see `docs/store-listing-en.md`

## 5. 提交前 QA

- [ ] 划选日文：面板弹出，词汇/语法 Tab 正常
- [ ] 点击翻译：复制成功 + toast
- [ ] 词汇/语法 chip 与原文双向高亮
- [ ] Esc 关闭面板；拖拽后刷新页面布局仍记住（`overlayLayout`）
- [ ] 停用扩展（图标 OFF）后不再自动取词
- [ ] 无 AI Key：显示本地结果 +「设置 AI」提示；「不再提示」生效
- [ ] 配置 AI Key：状态显示 AI 来源；失败时「重试 AI」可用
- [ ] 选项页保存/读取 Key 正常
- [ ] Service Worker / Content Script / sidepanel iframe 控制台无持续报错

## 6. 提交步骤摘要

1. [Chrome 开发者控制台](https://chrome.google.com/webstore/devconsole) 注册开发者（一次性 $5）
2. 新建项目 → 上传 `release/verse-parse-1.0.0.zip`
3. 填写列表、截图、隐私政策 URL、支持邮箱
4. 完成「隐私实践」问卷（选中文字、可选第三方 AI）
5. 提交审核（通常数个工作日）

## 7. 发布后

- [ ] 监控审核邮件；若因 `<all_urls>` 被拒，可准备演示视频或考虑收窄 host（需产品决策）
- [ ] 版本迭代时同步 bump `manifest.json` version 并重新 `npm run package`
