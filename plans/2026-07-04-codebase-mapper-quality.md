# 修复方案：Codebase Mapper 输出质量提升

日期：2026-07-04
参考：gsd-core 的 codebase-mapper agent + map-codebase workflow

---

## 问题

bp 的 codebase-mapper 输出过于简略：
- agent prompt 仅 30 行，每步只有一句话
- 模板只有占位符，无具体指引
- 单 agent 处理全部 7 个文档，上下文不足
- 无探索命令、无文件路径要求、无"Where to add new code"指引

## 对比

| 维度 | bp 当前 | gsd-core |
|------|---------|----------|
| agent prompt | 30 行 | 200+ 行 |
| focus 拆分 | 单 agent 做 7 文档 | 同左，单 agent |
| 探索命令 | 无 | 每个 focus 有具体 bash/cmd |
| 模板质量 | 占位符 | 完整章节 + 好例子 + 编写指引 |
| 文件路径 | 未要求 | 强制要求 backtick 路径 |
| "Where to add" | 无 | STRUCTURE.md 必须包含 |

---

## 修改文件清单

### 1. `src/templates/agents/index.ts` — codebase-mapper agent prompt

**重写** `CODEBASE_MAPPER_PROMPT`，参考 gsd-core 结构：

```markdown
## Role
Codebase Mapper — 分析存量代码，生成结构化技术报告

## Focus Areas
根据 prompt 中的 focus 参数确定输出文档：
- tech → STACK.md, INTEGRATIONS.md
- arch → ARCHITECTURE.md, STRUCTURE.md
- quality → CONVENTIONS.md, TESTING.md
- concerns → CONCERNS.md

## Philosophy
- 文档质量优先：200 行有实际范例的文档 > 74 行摘要
- 必须包含文件路径：`src/services/user.ts` 而非"用户服务"
- 规范性写法：用"Use X pattern"而非"X pattern is used"
- 只写当前状态，不写历史或规划

## 探索命令（按 focus）

### tech
```bash
cat package.json | head -100
ls tsconfig.json .nvmrc .env* 2>/dev/null
grep -r "import.*from" src/ --include="*.ts" | head -50
```

### arch
```bash
find . -type d -not -path '*/node_modules/*' | head -50
ls src/index.* src/main.* src/server.* 2>/dev/null
grep -r "^import" src/ --include="*.ts" | head -100
```

### quality
```bash
ls .eslintrc* .prettierrc* vitest.config.* 2>/dev/null
find . -name "*.test.*" -o -name "*.spec.*" | head -30
ls src/**/*.ts | head -10
```

### concerns
```bash
grep -rn "TODO\|FIXME\|HACK" src/ --include="*.ts" | head -50
find src/ -name "*.ts" | xargs wc -l | sort -rn | head -20
grep -rn "return null\|return \[\]" src/ --include="*.ts" | head -30
```

## 输出要求
- 使用 Write 工具直接写文件（不用 bash heredoc）
- 文件名：UPPERCASE.md
- 日期：使用 prompt 中提供的 Today's date
- 返回确认格式：## Mapping Complete, Focus: {focus}, Documents: {paths}
```

### 2. `src/templates/artifacts/index.ts` — 重写 7 个 codebase 模板

参考 gsd-core 模板，每个模板增加：
- 具体章节标题
- 编写指引（What belongs here / What does NOT）
- 好的例子（Good Examples）
- "Where to add new code" 章节（STRUCTURE.md）

#### STACK.md 模板结构
```
# Technology Stack
## Languages (Primary/Secondary)
## Runtime (Environment, Package Manager, Lockfile)
## Frameworks (Core, Testing, Build/Dev)
## Key Dependencies (Critical, Infrastructure)
## Configuration (Environment, Build)
## Platform Requirements (Development, Production)
```

#### ARCHITECTURE.md 模板结构
```
# Architecture
## Pattern Overview (Overall, Key Characteristics)
## Layers (per layer: Purpose, Contains, Location, Depends on, Used by)
## Data Flow (per flow: step-by-step, State Management)
## Key Abstractions (per abstraction: Purpose, Examples, Pattern)
## Entry Points (per entry: Location, Triggers, Responsibilities)
## Error Handling (Strategy, Patterns)
## Cross-Cutting Concerns (Logging, Validation, Auth, File Ops)
```

#### STRUCTURE.md 模板结构
```
# Codebase Structure
## Directory Layout (ASCII tree with ├── └── │)
## Directory Purposes (per dir: Purpose, Contains, Key files, Subdirectories)
## Key File Locations (Entry Points, Configuration, Core Logic, Testing, Docs)
## Naming Conventions (Files, Directories, Special Patterns)
## Where to Add New Code (New Feature, New Component, New Route, Utilities)
## Special Directories (generated code, build output)
```

#### CONVENTIONS.md 模板结构
```
# Coding Conventions
## Code Style (Indentation, Quotes, Semicolons, Line Length)
## Naming (Functions, Variables, Classes, Files, Directories)
## Import Patterns (Order, Aliases, Barrel exports)
## Error Handling (Patterns, Expected Errors, Unexpected Errors)
## Type System (Strictness, Generics, Type vs Interface, any usage)
## Async Patterns (Promise, async/await, Error handling)
## Component Patterns (if React/Vue: Props, State, Composition)
```

#### TESTING.md 模板结构
```
# Testing
## Framework & Setup (Framework, Config, Runner)
## Test Structure (Location, Naming, Organization)
## Test Patterns (Unit: arrange-act-assert, Integration: setup-teardown, Mocking)
## Coverage (Current, Targets, Gaps)
## Running Tests (Commands, CI, Watch mode)
```

#### INTEGRATIONS.md 模板结构
```
# External Integrations
## APIs & External Services (per service: SDK/Client, Auth, Purpose)
## Data Storage (Databases, File Storage, Caching)
## Authentication & Identity (Provider, Implementation)
## Webhooks & Events (Incoming, Outgoing)
## Email & Notifications (Provider, Templates)
## Third-Party Libraries (Critical deps, Version constraints)
```

#### CONCERNS.md 模板结构
```
# Codebase Concerns
## Tech Debt (per item: Issue, Why, Impact, Fix approach)
## Known Bugs (per bug: Symptoms, Trigger, Workaround, Root cause)
## Security Considerations (per area: Risk, Mitigation, Recommendations)
## Performance Bottlenecks (per item: Problem, Measurement, Cause, Improvement)
## Fragile Areas (per area: Why, Failures, Safe modification, Test coverage)
## Scaling Limits (per resource: Capacity, Limit, Symptoms, Scaling path)
## Dependencies at Risk (per dep: Risk, Impact, Migration plan)
## Missing Critical Features (per gap: Problem, Workaround, Blocks, Complexity)
## Test Coverage Gaps (per gap: What, Risk, Priority, Difficulty)
```

### 3. `src/templates/workflows/init.ts` — 派发单个 codebase-mapper

单 agent 处理全部 7 个文档：

```markdown
### Step 2: Brownfield scan

Dispatch codebase-mapper sub-agent:

1. Run \`bp dispatch codebase-mapper\`
2. Prompt: analyze entire codebase — tech stack, architecture, structure, conventions, testing, integrations, concerns
3. Write all 7 documents to \`bp/codebase/\`
```

### 文件命名

全部**小写**：
- `stack.md`
- `architecture.md`
- `structure.md`
- `conventions.md`
- `testing.md`
- `integrations.md`
- `concerns.md`

---

## 执行

1. 重写 `agents/index.ts` 的 CODEBASE_MAPPER_PROMPT
2. 重写 `artifacts/index.ts` 的 7 个 codebase 模板（小写文件名）
3. 修改 `init.ts` Step 2（单 agent 处理全部文档）

## 验收

- codebase-mapper 输出的 STACK.md 包含具体版本号和文件路径
- ARCHITECTURE.md 包含分层描述和 Data Flow
- STRUCTURE.md 包含 ASCII 目录树和"Where to Add New Code"
- CONCERNS.md 包含 TODO/FIXME 引用和修复建议
- 每个文档 ≥ 50 行实质性内容
