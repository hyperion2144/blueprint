# Design: Skill 生成器

## 目标

实现 skill 文件生成器，生成 skills/specwf-<step>/SKILL.md（14 个 skill）。

## 说明

Skill 文件包含工作流指引，agent 通过 `read skill://specwf-<step>` 按需加载。
依赖 generators/index.ts 调度入口，目前优先实现 commands + agents，skills 作为可扩展点。

## 文件

（预留 — skills 生成器在后续 phase 实现）
