# Proposal: refactor-generator-dispatch

> This document is a Change Proposal — align intent, scope, and approach before implementation. Complete each section; reviewers will evaluate this proposal before the design phase.

---

## Intent

**Problem**: `src/generators/index.ts` 的 `generateAll()` 硬编码调用 OMP 命令/agent/skill 生成函数，无法扩展到多平台。
**Who affected**: 所有使用 `blueprint update` 的用户。
**What if not done**: 每新增平台就需要改 `generateAll()` 加 if 分支，维护成本线性增长。
**Type**: refactor

---

## Scope

### In scope

- 改造 `src/generators/index.ts`：`generateAll(config)` 遍历 `config.platform` → `registry.resolve(platform)` → `provider.generate(config)`
- `src/integrations/omp/index.ts` 注册为 `'omp'` provider（import 现有命令/agent/skill 生成函数）
- `supportsCommands` 从 `src/integrations/omp/index.ts` 的模块级常量改为 provider 的 `capabilities.supportsCommands`
- 更新 `src/commands/bp-update.ts` 中引用 `supportsCommands` 的代码（用于 `cleanupStaleFiles`）
- `generateAll()` 公共 API 签名保持不变：`(config: ProjectConfig) => GeneratedFile[]`
- golden-file 测试：before/after 快照对比验证零行为变更
- `platform` 为空或未知时的回退行为（默认 `[omp]`）

### Out of scope

- 不注册 claude-code 或 agent provider（那是 Phase 2/3 的事）
- 不改动 `src/integrations/omp/commands.ts`、`agents.ts`、`skills.ts` 的逻辑
- 不改动项目模板内容

---

## Approach

- `generators/index.ts` 改为：`generateAll(config) → config.platform.forEach(id → registry.resolve(id).generate(config))`
- OMP registry 注册：在 `src/integrations/omp/index.ts` 新增 `register()` 函数，导入 `PlatformRegistry` 注册自身
- 回退行为：`platform` 数组为空或缺失时，默认使用 `['omp']`
- `generateAll()` 返回 `GeneratedFile[]` 扁平数组（与当前签名一致）
- golden-file 测试：先捕获 baseline 快照 → 应用 refactor → 再次生成快照 → diff 对比

---

## Must-haves

1. SHALL `generateAll(config)` 对于 `config.platform: ['omp']` 输出与当前代码完全一致（golden-file 验证）
2. SHALL `generateAll(config)` 遍历 `config.platform` 数组，对每个平台调用对应 provider.generate()
3. SHALL `config.platform` 为空数组时，回退使用 `['omp']`
4. SHALL OMP `supportsCommands` 能力移至 provider.capabilities.supportsCommands
5. SHALL `bp-update.ts` 中的 `cleanupStaleFiles` 通过 registry 而非模块级常量获取 supportsCommands
6. SHALL `config.platform` 包含未知平台时，跳过并输出 warning（不阻塞其他平台生成）
7. SHALL golden-file 测试捕获 refactor 前后的文件输出并对比，证明零行为变更

---

## Non-goals

- 不改变任何生成文件的路径、内容或格式
- 不改变 `bp update` 命令行接口
- 不为 claude-code 或 .agent/ 做任何准备
