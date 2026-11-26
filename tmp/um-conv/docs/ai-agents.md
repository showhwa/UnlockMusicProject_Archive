# AI Agent 规范与 Skill

仓库使用通用的 `AGENTS.md` 与 `.agents/skills/` 结构，兼容 Codex、Cursor、Antigravity 等支持 `AGENTS.md` 和 Agent Skills 规范的工具。

## 规则与 Skill 清单

- **规则文件**：
  - 根目录规则：[`AGENTS.md`](../AGENTS.md)
  - 前端目录规则：[`frontend/AGENTS.md`](../frontend/AGENTS.md)
- **项目 Skill**（`.agents/skills/`）：
  - [`dev`](../.agents/skills/dev/SKILL.md)：用于 Go/Wails/React 跨层开发与审查，涵盖权威状态、设置、转换进度、revision、生成 bindings 和前端状态同步。
  - [`code-review`](../.agents/skills/code-review/SKILL.md)：专门用于仓库代码审查，结合 Go 作为唯一数据源的架构约束、revision/并发安全、Wails bindings 与 Go/TypeScript/React 最佳实践。
  - [`add-decryptor`](../.agents/skills/add-decryptor/SKILL.md)：用于新增或调整加密音乐解密器（`um_cli_rs` 子命令接入、扩展名冲突注册顺序、来源标签、测试与文档清单）。
  - `vercel-react-best-practices`、`web-design-guidelines`：通过 [`skills-lock.json`](../skills-lock.json) 管理的前端 React 与 UI 审查技能。

## 在本仓库中使用

克隆仓库后不需要额外安装，支持 Agent Skills 规范的工具会自动发现 `.agents/skills/` 中的 skill。可以让 Agent 根据任务描述自动匹配，或在对话中显式指定（例如在 Codex 中使用 `$dev`、在 Cursor 中使用 `/dev`，或直接提及 `dev` / `.agents/skills/dev/SKILL.md`）：

```text
使用 dev skill 检查设置更新是否可能被旧的状态事件覆盖
```

如果新加入或更新的 skill 没有生效，请开启新会话或重启对应工具。
