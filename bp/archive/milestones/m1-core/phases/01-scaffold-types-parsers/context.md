# Phase 1 Context: 项目骨架 + 类型定义 + 解析层

> 讨论时间: 2026-06-29
> 决策来源: research/stack.md + research/architecture.md + research/pitfalls.md + proposal.md

## Phase 目标

项目可编译，类型定义完整，YAML/frontmatter/heading-tree 解析可用。

## 实现决策

### D1: YAML 库选择 — yaml(eemeli) 2.x（覆盖 stack.md 的 js-yaml 推荐）

**决策**: 使用 `yaml` (eemeli) 2.x + `zod`，不用 js-yaml。

**理由**: project.yml 和 state.md 写回时需保留注释。js-yaml v4 不支持注释保留（architecture.md §1.2）。stack.md 推荐 js-yaml 是因为"最成熟"，但注释保留是硬需求。summary.md 已确认此覆盖。

**影响**: 
- dependencies 列表移除 js-yaml + @types/js-yaml，替换为 yaml
- 使用场景：project.yml 读写用 Document API 保留注释；.blueprint.yaml 只读用 parse() + zod

### D2: 构建工具 — tsup ^8

**决策**: tsup ^8 + tsc --noEmit（独立类型检查）。

**配置要点**:
- ESM 输出（`format: ['esm']`）
- dts 生成（`dts: true`）
- shebang 注入到 `dist/cli.js`（`banner: { js: '#!/usr/bin/env node' }`）
- 入口：`src/cli.ts`
- tsconfig `moduleResolution: bundler`

### D3: 项目目录结构

**决策**: 采用 stack.md 设计的结构，微调——parser 独立为顶层目录。

```
blueprint-cli/
├── bin/
│   └── blueprint.js              # shebang 入口，import ../dist/cli.js
├── src/
│   ├── cli.ts                 # commander 主入口（Phase 5 填充，Phase 1 仅 --version）
│   ├── types/
│   │   ├── project.ts         # ProjectConfig / Milestone / Phase / Change 类型
│   │   ├── state.ts           # StateFile / StateMachine / Transition 类型
│   │   ├── spec.ts            # Spec / SpecSection / HeadingNode 类型
│   │   └── config.ts          # Profile / WorkflowToggles / ModelMap 类型
│   ├── parser/
│   │   ├── yaml.ts            # yaml Document API 封装 + zod 验证
│   │   ├── frontmatter.ts     # gray-matter 封装（解析 + stringify）
│   │   ├── heading-tree.ts    # Markdown heading tree 解析器
│   │   └── spec-parser.ts     # spec 结构化解析（Purpose/Requirement/Scenario）
│   └── templates/             # 内置模板（Phase 6 完善，Phase 1 创建空目录）
├── tests/
│   └── parser/
│       ├── yaml.test.ts
│       ├── frontmatter.test.ts
│       ├── heading-tree.test.ts
│       └── spec-parser.test.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

**与 stack.md 差异**: parser/ 独立为顶层目录而非 lib/parser/，因为解析层是纯函数无状态，独立更清晰。

### D4: TypeScript 严格配置

**决策**: tsconfig.json 采用 stack.md 的配置，补充 zod 的类型推导。

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### D5: 依赖清单（Phase 1 范围）

**dependencies**（Phase 1 只需要这些）:
- `yaml` ^2.x — YAML 解析 + Document API
- `zod` ^3.x — 类型验证
- `gray-matter` ^4.x — frontmatter 解析
- `commander` ^14.x — CLI 框架（Phase 1 仅注册 --version）

**devDependencies**:
- `typescript` ^5.7
- `tsup` ^8.7
- `vitest` ^3.0
- `@types/node` ^22

**延后安装**（后续 Phase 需要）:
- @clack/prompts — Phase 5 init 向导
- consola — Phase 5 CLI 输出
- nanoid — Phase 2 ID 生成

### D6: parser/yaml.ts 接口设计

```typescript
// 读 + 验证（不保留注释，用于只读场景）
export function readYaml<T>(path: string, schema: z.ZodSchema<T>): T;

// 读 Document（保留注释，用于需写回的场景）
export function readYamlDoc(path: string): YAML.Document;

// 写 Document（保留注释）
export function writeYamlDoc(path: string, doc: YAML.Document): void;

// 修改 + 写回（保留注释）
export function updateYaml<T>(path: string, updater: (doc: YAML.Document) => void): void;
```

### D7: parser/frontmatter.ts 接口设计

```typescript
// 解析 frontmatter + body
export function parseFrontmatter(content: string): { data: Record<string, unknown>; content: string };

// 生成 frontmatter + body
export function stringifyFrontmatter(data: Record<string, unknown>, body: string): string;

// 读取文件 + 解析
export function readFrontmatterFile(path: string): { data: Record<string, unknown>; content: string };
```

### D8: parser/heading-tree.ts 接口设计

```typescript
export interface HeadingNode {
  level: number;          // 1-6
  text: string;           // heading 文本
  line: number;           // 行号
  children: HeadingNode[];
  content: string;        // 该 heading 下的内容（不含子 heading）
}

// 解析 Markdown 为 heading tree
export function parseHeadings(markdown: string): HeadingNode[];

// 查找指定 heading
export function findHeading(root: HeadingNode, text: string): HeadingNode | null;
```

### D9: parser/spec-parser.ts 接口设计

```typescript
export interface SpecSection {
  purpose: string;
  requirements: Requirement[];
}

export interface Requirement {
  name: string;           // "### Requirement: User Authentication" → "User Authentication"
  keywords: string[];     // ['SHALL', 'MUST'] 等 RFC 2119 关键词
  scenarios: Scenario[];
}

export interface Scenario {
  name: string;           // "#### Scenario: Valid credentials" → "Valid credentials"
  steps: { type: 'GIVEN' | 'WHEN' | 'THEN' | 'AND'; text: string }[];
}

// 解析 spec 文件为结构化数据
export function parseSpec(markdown: string): SpecSection;

// 从 heading tree 提取 spec 结构
export function extractSpecFromTree(root: HeadingNode): SpecSection;
```

### D10: 类型定义范围

**types/project.ts**:
```typescript
// 4 层实体类型
export type EntityType = 'project' | 'milestone' | 'phase' | 'change' | 'adhoc';

export interface Milestone { id: string; name: string; version: string; phases: Phase[]; }
export interface Phase { id: string; name: string; milestoneId: string; changes: Change[]; }
export interface Change { name: string; type: 'phase' | 'adhoc'; status: ChangeStatus; dependsOn: string[]; }
export type ChangeStatus = 'proposal' | 'planning' | 'applying' | 'reviewing' | 'verifying' | 'archiving' | 'blocked' | 'archived';
```

**types/state.ts**:
```typescript
export interface StateFile {
  project: { name: string; status: string; current_milestone: string | null; current_phase: string | null; };
  active_context: { type: EntityType; ref: string | null; step: string; };
  changes: ChangeState[];
  adhoc: ChangeState[];
}
export interface ChangeState { name: string; status: string; depends_on: string[]; }
export interface StateTransition { from: string; to: string; command: string; }
```

**types/config.ts**:
```typescript
export type Profile = 'lite' | 'standard' | 'strict';
export interface ProjectConfig {
  version: number; platform: string[]; profile: Profile;
  context: string; workflow: WorkflowToggles;
  review: ReviewConfig; change: ChangeConfig;
  git: GitConfig; conventions: { inject: boolean };
  models: Partial<Record<ModelRole, string>>;
}
```

## Change 拆分确认

roadmap.md 预估 3 个 change，确认如下：

1. **scaffold-project** — package.json + tsconfig + tsup + vitest 配置 + bin/blueprint.js + src/cli.ts（仅 --version）
2. **define-types** — src/types/ 下 4 个文件（project / state / spec / config）
3. **implement-parsers** — src/parser/ 下 4 个文件 + tests/parser/ 下 4 个测试

依赖：scaffold-project → define-types → implement-parsers（串行）

## 非目标

- 不实现 CLI 子命令（Phase 5）
- 不实现状态机逻辑（Phase 2）
- 不实现 spec 注入/合并（Phase 3）
- 不实现平台文件生成（Phase 4）
