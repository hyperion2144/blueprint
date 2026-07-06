# Proposal: define-provider-interface

> This document is a Change Proposal — align intent, scope, and approach before implementation. Complete each section; reviewers will evaluate this proposal before the design phase.

---

## Intent

**Problem**: `src/generators/index.ts` 硬编码调用 `src/integrations/omp/`，无法扩展支持多平台。
**Who affected**: 所有使用 `blueprint update` 的用户和后续平台开发者。
**What if not done**: 无法增加 claude-code 和 .agent/ 平台支持（m2 目标受阻）。
**Type**: refactor

---

## Scope

### In scope

- 定义 `PlatformProvider` 接口（`generate()` 方法）
- 定义 `GeneratedFile` 产出类型（已在 types 中，重导出即可）
- 实现 `PlatformRegistry` 类（`register`/`resolve`/`list`/`generateAll`）
- `PlatformProvider` 的 `capabilities` 可选属性（`supportsCommands`）
- 单元测试：provider 注册、解析、遍历、重复注册检测

### Out of scope

- 不改动 `generators/index.ts` 的 dispatch 逻辑（那是 refactor-generator-dispatch change 的事）
- 不注册任何 provider
- 不影响任何已有代码的行为

---

## Approach

- `src/core/platform-registry.ts`：纯 TypeScript 模块，不依赖外部库
- 接口设计（来自 context.md D1-D3）：
  - `PlatformProvider`：`readonly id`, `readonly name`, `readonly capabilities?`, `generate(config): GeneratedFile[]`
  - `PlatformRegistry`：`Map<string, PlatformProvider>` 实现 + singleton
- 测试辅助：`setPlatformRegistry()` 允许测试时替换 registry 实例（防止单例跨测试泄漏）
- 导出位置：从 `src/core/platform-registry.ts` 导出 `PlatformProvider`、`PlatformRegistry`、`createDefaultRegistry()`

---

## Must-haves

1. SHALL `PlatformProvider` 接口包含 `id`, `name`, `generate(config)` 三个必需成员
2. SHALL `PlatformRegistry.register(id, provider)` 存储 provider 并可通过 `resolve(id)` 检索
3. SHALL `PlatformRegistry.register()` 对重复 `id` 抛出错误
4. SHALL `PlatformRegistry.list()` 返回所有已注册的 provider
5. SHALL `PlatformRegistry.generateAll(config)` 按注册顺序生成所有 provider 的文件
6. SHALL `PlatformProvider` 的 `capabilities` 为可选属性，缺失时默认 `{ supportsCommands: false }`
7. SHALL 所有测试独立（`setPlatformRegistry()` 重置防止状态泄漏）

---

## Non-goals

- 不改动 `generators/index.ts`
- 不改动任何 `src/integrations/` 下的代码
- 不引入 DI 容器或装饰器
