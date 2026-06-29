# Design: brownfield-init

## 目标

实现 `specwf init --brownfield` 存量项目模式 + @clack/prompts 交互向导。

## 存量项目模式

`specwf init --brownfield` 时：
1. 检测项目类型（package.json / Cargo.toml / go.mod 等）
2. codebase mapping — 扫描现有代码，产出 research/codebase/ 下技术现状文档
3. spec bootstrap — 从代码提取初始行为契约到 specs/
4. 配置初始化 — 同新项目流程

## 交互向导

不传 --yes 时，用 @clack/prompts 交互式引导：
1. 选择 profile（lite/standard/strict）
2. 输入项目上下文描述
3. 选择平台（omp/claude-code）
4. 确认创建

## 文件

| 文件 | 内容 |
|---|---|
| src/commands/specwf-init.ts (更新) | 添加 --brownfield + 交互向导 |
| src/prompts/init-wizard.ts | @clack/prompts 交互向导 |
| src/core/brownfield.ts | 存量项目扫描逻辑 |
