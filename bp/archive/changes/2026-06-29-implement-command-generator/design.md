# Design: 平台生成器

## 目标

实现 3 个生成器模块，为 `blueprint update` 命令提供 OMP 平台文件生成能力。

## 文件清单

| 文件 | 内容 |
|---|---|
| src/generators/omp-commands.ts | 14 个 slash command 定义 + 生成函数 |
| src/generators/omp-agents.ts | 6 个 agent 定义 + 模型映射 + 生成函数 |
| src/generators/index.ts | 生成器调度入口 |

## 技术决策

- agent frontmatter 的 `model` 字段通过 `resolveModels(config)` 从 profile + project.yml models 解析
- command body 使用模板字符串，每步有独立的 guidance 文本
- 输出格式与 OMP 发现机制兼容（`.omp/commands/*.md` 非递归、`.omp/agents/*.md` first-wins）
