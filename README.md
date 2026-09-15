# 真人聊天增强 (HumanChat) — Operit 版

让 AI 助手在 Operit 中像真人一样随机应变地聊天。

**双版本提供**：Skill（轻量Prompt） + ToolPkg（硬检测引擎）

---

## 快速安装

### 方式一：Skill 版（推荐入门）

1. 下载 `operit/SKILL.md`
2. 放到手机 `/sdcard/Download/Operit/skills/human_chat/`
3. 重启 Operit 或在技能管理中刷新

### 方式二：ToolPkg 版（硬检测，推荐进阶）

1. 下载 `operit/human_chat.toolpkg`
2. 放到手机 `/sdcard/Android/data/com.ai.assistance.operit/files/packages/`
3. 在 Operit → 包管理 → 右上角刷新 → 找到"真人聊天增强" → 启用

---

## 功能

| | Skill 版 (Prompt) | ToolPkg 版 (JS硬检测) |
|---|---|---|
| 4种人格风格 | ✅ | ✅ |
| 智能情绪切换(auto) | ✅ | ✅ |
| 情绪强度+混合情绪+反讽 | ✅ | — |
| 时间感知 | ✅ | — |
| 自检清单 | ✅ | — |
| ngram反重复硬检测 | — | ✅ |
| System Prompt注入 | — | ✅ |
| AI味黑名单过滤 | — | ✅ |
| 命令 /human | ✅ | — |

**两个版本可同时启用，互补工作。**

---

## 命令

| 命令 | 作用 |
|------|------|
| `/human style natural` | 自然随性 |
| `/human style humorous` | 幽默风趣 |
| `/human style warm` | 温暖贴心 |
| `/human style serious` | 严肃专业 |
| `/human style auto` | 智能切换（情绪自动匹配） |
| `/human emoji medium` | 表情密度 |
| `/human status` | 查看当前状态 |

---

## Token 优化器 (TokenOptimizer)

把 Tokenless / codex-tokens-compress / dsh-token-saver 三类能力统一进一个 Operit ToolPkg：

| 能力 | 说明 |
|------|------|
| 响应压缩 | 去 ANSI、去噪音行、折叠空白、去 AI 味、超限中间截断 |
| TOON 编码 | 结构化数据紧凑编码，通常比 JSON 更省 token |
| 命令重写 | 给常见命令补静默/精简参数，降低输出噪音 |
| 规约压缩 | 压缩 AGENTS.md / system prompt 片段：去重 bullet、删空节、按预算截断 |
| 工具限流 | 单条工具输出 token 上限 + 中间截断，保留头尾 |
| 统计 | `getStats()` 查看压缩前后与节省比例 |

### 安装

1. 下载 `operit/token_optimizer.toolpkg`
2. 放到手机 `/sdcard/Android/data/com.ai.assistance.operit/files/packages/`
3. 在 Operit → 包管理 → 右上角刷新 → 找到"Token 优化器" → 启用

源码位于 `operit/token_optimizer/`（`manifest.json` + `main.js`）。重新打包：

```bash
cd operit/token_optimizer
zip -X ../token_optimizer.toolpkg manifest.json main.js
```

---

## 开源协议

MIT