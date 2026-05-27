# Chrome Store Readiness Checklist

## Package and Build

- [x] Build extension package from `dist/`
- [x] Manifest V3 present
- [x] No remote code dependency

## Permissions Review

- [x] Use minimum permissions required for v1
- [x] Host permissions scoped to `https://prs.app/*` only
- [x] Permission reasons documented in privacy policy

## Listing Content (Ready To Paste)

### Name

Verse Parse

### Short Description

日语圣经阅读效率插件：选中文字即得语法解析、中文释义与词汇信息。

### Full Description

Verse Parse 是为中国用户设计的日语圣经学习工具，核心目标是提升“读得懂”和“读得快”。
你只需选中网页中的日文经文，即可获得结构化分析结果：

- 词汇层：词形、原形、读音、词性
- 语法层：助词、动词时态/形态、句型命中
- 理解层：中文释义与句子简要理解
- 输出层：支持复制结果用于复习笔记

适合场景：
- 日语圣经精读
- 查经前预习与查经后复盘
- 日常灵修中的语言难点快速突破

v1 能力说明：
- 本地分析优先（零付费 API）
- 低权限、低打扰、响应快
- 面向日语经文阅读场景优化

隐私说明：
- 插件默认仅处理你选中的文本片段，不抓取整页内容。

### Category

Productivity / Education

### Suggested Store Tags

日语圣经, 查经工具, 语法解析, 中文释义, 灵修学习, 阅读效率

## Assets Needed Before Submit

- [ ] 128x128 icon
- [ ] Store screenshots (minimum 1280x800)
- [ ] Privacy policy URL (hosted page)
- [ ] Support contact email

## QA Before Submission

- [x] `npm run build`
- [x] `npm test`
- [ ] Manual pass on target page
- [ ] Confirm no console errors in service worker, content script, and side panel
