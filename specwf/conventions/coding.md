# 编码约定

## 语言

- 代码、注释、文档使用中文
- 变量名、函数名使用英文

## TypeScript

- 严格模式: `strict: true`
- 模块: ESM (`"type": "module"`)
- 目标: ES2022
- 路径别名: `@/` → `src/`

## 命名

- 源码文件: kebab-case (`specwf-init.ts`)
- **Markdown 文件: 全小写** (`project.md`, `requirements.md`, `state.md`, `roadmap.md`)
  - 不使用大写文件名（如 ~~PROJECT.md~~），统一全小写
  - 交叉引用也使用小写：`详见 [state.md](state.md)`
- 函数/变量: camelCase
- 类/类型/接口: PascalCase
- 常量: UPPER_SNAKE_CASE
- CLI 命令: kebab-case (`specwf init`, `specwf update`)

## 测试

- 框架: Vitest
- 测试文件: `*.test.ts`，与源文件同目录
- TDD: type:behavior 任务必须 RED→GREEN→REFACTOR

## Git

- 提交消息: Conventional Commits
- 分支策略: none（直接在主分支开发，除非配置 phase/milestone 分支）

## 注入规则

此文件会被 `specwf context` 自动注入到所有步骤的 agent 上下文中。
