# viaim Brand OS · 可运行版

> 把原 PRD（v0.1）落到一个可在浏览器中真实操作的 SPA。所有数据保存在你本地浏览器，不上传任何服务器。

## 一句话定位

把 PRD 的「图」变成「能用的产品」。Phase 1 范围中除「Figma Plugin」外全部模块均已可操作。

## 快速启动

```bash
cd viaim-brand-os
./start.sh                # 默认 5173 端口
# 或指定端口
./start.sh 8080
```

打开 `http://localhost:5173` 即可。无依赖，纯静态。

> 也可以用任意静态服务器，只要 index.html 是入口即可。例如：
> `python3 -m http.server 5173` 或 `npx serve .`

## 三步上手

1. **Settings** · 填一个 LLM API key（OpenAI 协议或 Anthropic）。  
   未填也能跑：L1 / L2 / Cmdk 都有本地兜底。
2. **Asset Library** · 上传几张产品图（拖拽或点击），按 schema 打标。
3. **Generation Studio** · 选 L1/L2/L3 任一档生成。

## 模块映射（PRD §5 → 实现）

| PRD 模块 | 实现状态 | 文件 |
|---|---|---|
| §5.1 Brand Source（9 段编辑器 + 版本控制） | ✅ 完整 | `modules.js` Modules.brand |
| §5.2 Asset Library（强制 schema 打标 + 检索） | ✅ 完整 | `modules.js` Modules.assets |
| §5.3 Generation Studio L1/L2/L3 | ✅ 完整 | `modules.js` + `templates.js` |
| §5.3 Generation Studio L4 | ⚙️ 接口预留（Settings 启用即可跑） | Modules.studio.studioL4 |
| §5.4 Compliance（5 条 lint） | ✅ 完整 | `modules.js` Compliance |
| §5.5 ⌘K Command Palette | ✅ 完整 | `cmdk.js` |
| §5.6 Figma Plugin | ❌ 不在 v0.1（PRD 同标记为 P1） | — |
| §5.7 API & SDK | ⚙️ 客户端模拟 | `api.js` |
| §5.8 Settings（PRD 缺口已补） | ✅ 新增 | Modules.settings |

## API 接口预留

进入 **Settings** 配置：

- **LLM API**（必填，用于 L1/L2/⌘K 自然语言意图）
  - 兼容 OpenAI 协议（GPT、DeepSeek、通义、Moonshot、Together、Groq…）
  - 兼容 Anthropic Claude
- **Embedding API**（可选，启用后用于资产语义搜索）
- **Image Generation API**（可选，PRD §5.3 L4 的预备入口）

> API key 只保存到 `localStorage`，**不会上传**到任何服务器。  
> 浏览器同源策略：第三方 API 服务器需允许 CORS（OpenAI / Anthropic 默认允许）。

## 全局快捷键

| 按键 | 行为 |
|---|---|
| `⌘ K` / `Ctrl K` | 打开命令面板 |
| `G B` | 跳转 Brand Source |
| `G A` | 跳转 Asset Library |
| `G S` | 跳转 Generation Studio |
| `G C` | 跳转 Compliance |
| `G O` | 跳转 Output Archive |
| `G H` | 跳转主页 |
| `⌘ ⇧ V` | 切换 brand version（cmdk 预填 switch） |
| `/` | 聚焦当前页搜索框 |

## 数据存储

| 数据 | 存储位置 |
|---|---|
| Brand 版本（含 draft） | `localStorage` |
| Settings | `localStorage` |
| Asset metadata | `localStorage` |
| Asset 文件二进制 | `IndexedDB` |
| Output Archive | `localStorage` |

要重置：Settings → 危险区 → 恢复出厂设置。

## 文件结构

```
viaim-brand-os/
├── index.html      # 应用 shell
├── prd.html        # 原 PRD（保留为「PRD 文档」页）
├── styles.css      # 设计 token + 全局样式
├── store.js        # 数据层（schema + 持久化）
├── api.js          # LLM / Embedding / Image API 封装
├── templates.js    # L3 模板渲染
├── modules.js      # 所有页面模块
├── cmdk.js         # 命令面板
├── app.js          # 路由与全局快捷键
├── start.sh        # 一键启动
└── README.md
```

## 已知限制（v0.1 边界）

- 资产文件存 IndexedDB，单文件上限 10MB（已防御）
- L3 PNG 导出走 SVG `foreignObject` 路径，外链图片可能因 CORS 跨域失效，建议用本地上传的资产
- 没接 Figma Plugin（PRD 也标 P1）
- 没接真实 Git 仓库（PRD §5.1.4 同步到 Markdown 仓库的部分用前端 download `.md` 替代）

## 后续路径

按 PRD §9 Roadmap：

- Phase 2：扩展 L3 模板到 8-10 个、加视觉相似检索、Figma 提取 tokens
- Phase 3：L4 端到端图像 + Vitana 接入
- Phase 4：fine-tune、多 brand、agency portal
