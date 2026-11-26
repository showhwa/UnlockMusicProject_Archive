# 开发文档

本目录整理了 `um-conv` 的开发、构建、架构及 AI 辅助开发相关说明；面向最终用户的使用说明请见项目根目录的 [README.md](../README.md)。

## 文档导航

- [开发与构建指南](development.md)：技术栈、环境依赖、初始化 `build/`、本地开发、测试、本机与容器打包、常用命令。
- [项目结构与架构说明](architecture.md)：目录结构、Go/Wails 状态同步机制、解密与转码管线、配置与外部工具解析。
- [AI Agent 规范与 Skill](ai-agents.md)：仓库内的 `AGENTS.md` 规则文件与 `.agents/skills/` 技能使用说明。

## 仓库开发规范

- 根目录开发规范：[AGENTS.md](../AGENTS.md)
- 前端开发规范：[frontend/AGENTS.md](../frontend/AGENTS.md)
