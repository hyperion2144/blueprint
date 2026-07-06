# Phase 2 Context: 配置管理 + 状态机

> 讨论时间: 2026-06-29
> 决策来源: research/architecture.md §4 + Phase 1 context.md

## Phase 目标

project.yml 读写 + state.md 读写 + 状态机引擎 + continue 逻辑。

## 实现决策

### D1: config.ts — project.yml 读写

使用 yaml(eemeli) Document API 保留注释 + zod 验证。复用 Phase 1 的 parser/yaml.ts。

```typescript
// 读 + 验证
export function loadConfig(blueprintDir: string): ProjectConfig;

// 写回（保留注释）
export function saveConfig(blueprintDir: string, config: ProjectConfig): void;

// 修改单个字段并写回
export function updateConfig(blueprintDir: string, updater: (config: ProjectConfig) => void): void;

// 获取 profile 默认模型映射
export function resolveModels(config: ProjectConfig): ModelMap;
```

resolveModels: 先取 PROFILE_MODEL_MAP[profile]，再用 config.models 覆盖。

### D2: state-file.ts — state.md 读写

使用 gray-matter 解析 frontmatter + zod 验证。

```typescript
export function loadState(blueprintDir: string): StateFile;
export function saveState(blueprintDir: string, state: StateFile): void;
export function updateState(blueprintDir: string, updater: (state: StateFile) => void): void;
```

saveState 需要同时更新 frontmatter + Markdown body（当前位置 + 历史）。

### D3: state-machine.ts — 状态转移验证

纯函数，无状态。复用 types/state.ts 的 STATE_TRANSITIONS。

```typescript
// 验证状态转移是否合法
export function canTransition(from: string, command: string): boolean;

// 获取转移后的状态
export function getTransition(from: string, command: string): StateTransition | null;

// 获取所有合法的下一步命令
export function getNextSteps(from: string): StateTransition[];
```

### D4: continue.ts — continue 逻辑

读取 state.md → 确定当前上下文 → 查转移表 → 输出下一步命令。

```typescript
export interface ContinueResult {
  currentStep: string;
  nextCommand: string | null;
  slashCommand: string | null;
  needsSubagent: boolean;
  context: string;  // 当前位置描述
}

export function determineNextStep(blueprintDir: string): ContinueResult;
```

## Change 拆分

1. **implement-config** — config.ts（project.yml 读写 + resolveModels）
2. **implement-state** — state-file.ts + state-machine.ts + continue.ts

依赖：implement-config → implement-state（state-file 复用 config 的路径定位逻辑）
