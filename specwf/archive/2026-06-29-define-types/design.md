# Design: define-types

## 目标

定义 specwf CLI 所有 TypeScript 类型，覆盖 4 层实体、状态机、配置、spec 结构。

## 文件清单

| 文件 | 内容 |
|---|---|
| src/types/project.ts | ProjectConfig / Milestone / Phase / Change 实体类型 |
| src/types/state.ts | StateFile / ChangeState / StateTransition 状态机类型 |
| src/types/spec.ts | SpecSection / Requirement / Scenario / HeadingNode 类型 |
| src/types/config.ts | Profile / WorkflowToggles / ModelMap 配置类型 |
| src/types/index.ts | 统一导出 |
