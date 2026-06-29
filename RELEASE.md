# v0.1.0 — CLI 核心可用

**Milestone: m1-core**

> 2026-06-29

规格驱动开发工作流（specwf）初始版本。面向 AI 编码 agent 的 CLI，在写代码前对齐规格，在 fresh-context 子代理中执行重活，通过结构化产物让状态跨会话持久化。

## 功能

- `specwf init` — 交互式初始化项目骨架
- `specwf update` — 生成本地平台文件（commands + agents + skills）
- `specwf config` / `specwf config set` — 读写 project.yml
- `specwf state` — 格式输出当前状态
- `specwf context <step>` — 输出步骤上下文文件清单
- `specwf continue` — 读取状态并推送下一步
- `specwf archive <change>` — delta-spec 合并 + 代码认知回灌 + 归档
- `specwf list` — 列出 milestones/phases/changes
- `specwf template <type>` — 从内置模板生成产物文件

## 技术栈

- TypeScript + Node.js ≥ 20
- CLI: commander + @clack/prompts
- 解析: yaml(eemeli) + gray-matter + zod
- 构建: tsup (ESM)
- 测试: vitest (71 tests)

## 验证

- tsc --noEmit: 0 errors
- vitest run: 71/71 通过
- npm run build: 50KB dist
- specwf init → update → state → archive 完整流程可用
