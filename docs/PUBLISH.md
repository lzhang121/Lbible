# 发布操作清单

仓库与联系信息（基于当前 git 配置）：

| 项 | 值 |
|----|-----|
| GitHub 仓库（建议） | `lzhang121/Lbible` |
| 隐私政策 URL | https://lzhang121.github.io/Lbible/privacy.html |
| 支持邮箱 | zhspark@gmail.com |

若 GitHub 用户名不是 `lzhang121`，推送后改 Pages URL 并更新 `docs/privacy.html` 页脚链接。

---

## A. 推送到 GitHub

在项目根目录执行（首次需先在 GitHub 创建空仓库 `Lbible`）：

```powershell
cd C:\Users\linsh\git\Lbible
git add .
git status
git commit -m "Prepare Verse Parse for Chrome Web Store release"
git branch -M main
git remote add origin https://github.com/lzhang121/Lbible.git
git push -u origin main
```

已有 `origin` 时省略 `remote add`，直接 `git push`。

---

## B. 启用 GitHub Pages

1. 打开 https://github.com/lzhang121/Lbible/settings/pages  
2. **Build and deployment → Source**: Deploy from a branch  
3. **Branch**: `main`，**Folder**: `/docs`  
4. Save，等待 1–3 分钟  
5. 浏览器打开 https://lzhang121.github.io/Lbible/privacy.html 确认可访问  

---

## C. Chrome 开发者控制台

1. 注册：https://chrome.google.com/webstore/devconsole（一次性 $5）  
2. **New item** → 上传 `release/verse-parse-1.0.0.zip`（无则 `npm run package`）  
3. 填写列表（文案见 `docs/chrome-store-readiness.md`、`docs/store-listing-en.md`）  
4. **Privacy policy URL**: `https://lzhang121.github.io/Lbible/privacy.html`  
5. **Contact email**: `zhspark@gmail.com`  
6. **Privacy practices**: 参考 `docs/chrome-web-store-privacy-answers.md`  
7. 上传至少 1 张截图（见 `docs/screenshots/README.md`）  
8. Submit for review  

---

## D. 提交前最后检查

```powershell
npm run build
npm test
npm run package
```

- [ ] `dist/` 在 Chrome 中加载 unpacked 手测通过  
- [ ] 隐私政策 URL 公网可打开  
- [ ] zip 内根目录有 `manifest.json`  
- [ ] 选项页无真实 API Key 出现在截图中  

---

## E. 审核被拒时

- **`<all_urls>`**：附 30 秒演示视频（划选 → 面板弹出）  
- **隐私政策无法打开**：确认 Pages 已 deploy 且仓库为 Public  
- **AI 权限**：说明 Key 用户自备、仅存本地、可选功能  
