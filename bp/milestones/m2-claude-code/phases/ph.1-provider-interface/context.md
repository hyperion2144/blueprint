# Context: ph.1-provider-interface

> Phase implementation decisions document. Express path — no gray areas to discuss.

---

## Phase Goals

定义 `PlatformProvider` 接口和 `PlatformRegistry`，将 `generators/index.ts` 改为 dispatch 模式。OMP 作为第一个 provider 注册，验证零行为变更。

---

## Architecture Decisions

### D1: Provider Interface Shape — 统一 `generate()` 方法
- **Decision**: `PlatformProvider` 暴露单个 `generate(config: ProjectConfig): GeneratedFile[]` 方法，内部按类型分发（commands/agents/skills）。
- **Rationale**: 各平台对"命令"和"skill"的定义不同（OMP 两者都有，`.agent/` 只有 skill）。统一入口让 provider 自行决定产出什么。
- **Alternatives considered**: 三方法接口（generateCommands/generateAgents/generateSkills）— 无法适配无 command 的平台。

### D2: Registry — 简单 `Record<string, PlatformProvider>`
- **Decision**: `PlatformRegistry` 用 `Map<string, PlatformProvider>` 实现，提供 `register(id, provider)`、`resolve(id)`、`list()`。
- **Rationale**: 不需要 DI 容器或复杂的生命周期管理。
- **Alternatives considered**: 独立类的 full registry — overkill。

### D3: Capability Flags — provider 的 `capabilities` 属性
- **Decision**: `PlatformProvider` 可选暴露 `capabilities: { supportsCommands?: boolean }`。默认为 `{ supportsCommands: false }`。
- **Rationale**: `.agent/` 没有 command，只需 skill。OMP 设置 `supportsCommands: true`。
- **Alternatives considered**: 用存在/不存在的方法判断 — 不明确；单独的能力文件 — 过度设计。

---

## Interface Contracts

```typescript
interface PlatformProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities?: {
    supportsCommands?: boolean;  // default: false
  };
  generate(config: ProjectConfig): GeneratedFile[];
}

class PlatformRegistry {
  register(id: string, provider: PlatformProvider): void;
  resolve(id: string): PlatformProvider;
  list(): PlatformProvider[];
  generateAll(config: ProjectConfig): GeneratedFile[];  // 遍历所有 registered
}
```

---

## Implementation Constraints

- OMP 零行为变更：`blueprint update` 输出必须与之前完全一致
- generator/index.ts 的 `generateAll()` 保持公共 API 签名不变

---

## Change Split Plan

| Change | 内容 | 范围 |
|--------|------|------|
| define-provider-interface | PlatformProvider + PlatformRegistry 类型和实现 | src/core/platform-registry.ts + test |
| refactor-generator-dispatch | generator/index.ts dispatch 模式 + OMP 注册验证 | src/generators/index.ts, src/integrations/omp/index.ts |

---

## Non-Goals

- 不改动 `src/integrations/omp/commands.ts`、`agents.ts`、`skills.ts` 的生成逻辑
- 不改动任何 command/agent/skill 模板内容
- 不为 claude-code 或 .agent/ 做任何准备工作（那是 Phase 2/3 的事）
