# Design: refactor-generator-dispatch

> This document is the Change Design — describing how to refactor generator dispatch to use PlatformRegistry.

---

## Context & Goals

**Context**: `src/generators/index.ts` 硬编码调用 OMP 生成函数。`PlatformRegistry` 已在上一 change 实现，但尚未接入。

**Goals**:
1. 将 `generateAll()` 改为通过 `PlatformRegistry` 多平台分发
2. OMP 注册为第一个 provider（零行为变更）
3. `supportsCommands` 从模块级常量改为 provider capability
4. `bp-update.ts` 适配使用 registry 获取 capability

---

## Technical Approach

### Architecture Diagram

```text
src/generators/index.ts [MODIFIED]
  generateAll(config):
    config.platform (default ['omp'])
    → PlatformRegistry.resolve(id).generate(config)
    → flatten

src/integrations/omp/index.ts [MODIFIED]
  + registerOmpProvider() →
    PlatformRegistry.register('omp', ompProvider)
  - supportsCommands (module-level) →
    → provider.capabilities.supportsCommands

src/commands/bp-update.ts [MODIFIED]
  import { supportsCommands } → PlatformRegistry.resolve('omp').capabilities?.supportsCommands ?? true
```

### Core Data Structures

已有 `PlatformProvider`、`PlatformRegistry`（在 `src/core/platform-registry.ts`）。

### Data Flow

```text
bp update / bp init
  → generateAll(config)
    → platforms = config.platform.length ? config.platform : ['omp']
    → for each platform id:
        provider = PlatformRegistry.resolve(id)
        files.push(...provider.generate(config))
    → return files (flat)
```

### Interface Design

```typescript
// src/generators/index.ts 保持:
export function generateAll(config: ProjectConfig): GeneratedFile[]
// 实现改为 dispatch 模式
```

---

## File Manifest

| File Path | Description | Action |
|-----------|-------------|--------|
| `src/generators/index.ts` | 改为 dispatch 模式 | Modify |
| `src/integrations/omp/index.ts` | 添加 registerOmpProvider，保留 supportsCommands 向后兼容 | Modify |
| `src/commands/bp-update.ts` | supportsCommands 改为从 OMP provider capability 获取 | Modify |
| `src/core/platform-registry.test.ts` | 添加集成测试：OMP 注册 + dispatch | Modify |

---

## Test Strategy

### Unit Tests
- `platform-registry.test.ts` 新增:
  - OMP provider 注册验证
  - generateAll 通过 dispatch 模式调用 OMP
  - 空 platform 数组默认 omp

### Integration Tests
- `bp update` 在测试目录运行，输出与 baseline 一致

### TDD Tasks
- 无 type:behavior（纯 refactor）

---

## Alternatives

| Approach | Pros | Cons | Reason |
|----------|------|------|--------|
| 在 bp-init/bp-update 中手动注册 | 显式初始化 | 需要改所有入口 | generator/index.ts 自注册更简洁 |
| 保留 generateAll 不动，新增 generateAllMulti | 零改动 | 代码重复，不解决根本问题 | 直接改 generateAll |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| 破坏现有 `bp update` 输出 | Low | High | golden-file baseline 测试 |
| supportsCommands 导入方式破坏 bp-update | Low | Medium | 保留向后兼容导出 |
