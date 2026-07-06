# Design: define-provider-interface

> This document is the Change Design — written after proposal approval, describing how to implement. Each section has fill-in guidance. After this document, proceed to task breakdown.

---

## Context & Goals

**Context**: blueprint 需要支持多平台文件生成。当前 `src/generators/index.ts` 硬编码调用 OMP 生成器。此 change 定义通用的 `PlatformProvider` 接口和 `PlatformRegistry`，作为后续 provider 扩展的基础。

**Goals**:
1. 定义 `PlatformProvider` 接口 — 统一的平台生成器合约
2. 实现 `PlatformRegistry` — 注册/解析/遍历 provider
3. 所有接口/类型可独立测试，不依赖任何实际 provider

---

## Technical Approach

### Architecture Diagram

```text
src/core/platform-registry.ts [NEW]
  PlatformProvider (interface)       ←  provider 实现方实现
  PlatformRegistry (class)           ←  singleton, Map 存储
  createDefaultRegistry()            ←  factory
  setPlatformRegistry()              ←  test helper

src/generators/index.ts              ← 不变（下个 change 改）
src/integrations/omp/index.ts        ← 不变
```

### Core Data Structures

```typescript
interface PlatformProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities?: {
    supportsCommands?: boolean;  // default: false
  };
  generate(config: ProjectConfig): GeneratedFile[];
}

interface GeneratedFile {  // 已有，在 types 中
  path: string;
  content: string;
}
```

### Data Flow

```text
registry = createDefaultRegistry()
  → registry.register('omp', ompProvider)
  → registry.resolve('omp')  → ompProvider
  → registry.generateAll(config)  → [ompProvider.generate(config), ...]
```

### Interface Design

```typescript
// PlatformRegistry
register(id: string, provider: PlatformProvider): void       // throws on duplicate
resolve(id: string): PlatformProvider                          // throws on unknown
list(): PlatformProvider[]
has(id: string): boolean
generateAll(config: ProjectConfig): GeneratedFile[]           // 顺序遍历
```

---

## File Manifest

| File Path | Description | Action |
|-----------|-------------|--------|
| `src/core/platform-registry.ts` | PlatformProvider 接口 + PlatformRegistry 实现 | Create |
| `src/core/platform-registry.test.ts` | Registry 单元测试 | Create |
| `src/types/index.ts` | 重导出 GeneratedFile（已有，验证导出路径） | Verify |

---

## Test Strategy

### Unit Tests
- `platform-registry.test.ts`:
  - register + resolve 正常路径
  - register 重复 id 抛错
  - resolve 未知 id 抛错
  - has() 存在/不存在
  - list() 返回所有
  - generateAll() 遍历所有
  - capabilities 默认值

### Integration Tests
- 无（纯类型/数据结构，不涉及文件系统或外部依赖）

### TDD Tasks
- 无 type:behavior 任务（纯 refactor/scaffolding）

---

## Alternatives

| Approach | Pros | Cons | Rejection Reason |
|----------|------|------|-----------------|
| 抽象类 AbstractProvider | 强制子类实现 | 限制了未来平台的灵活性 | 接口更轻量 |
| DI 容器 | 依赖注入清晰 | 引入外部依赖 | Map-based registry 足够 |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| 接口设计不满足未来平台需求 | Low | Medium | 保持接口最小，额外能力通过 `capabilities` 扩展 |
| singleton 测试间状态泄漏 | Medium | Low | `setPlatformRegistry()` 允许测试重置 |
