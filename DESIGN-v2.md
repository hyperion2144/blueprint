# Blueprint v2 架构重设计

> 状态：设计提案 · 2026-07-16
> 目标：砍掉状态机官僚主义，保留工程严谨性，采纳 OpenSpec 的轻量结构

---

## 1. 问题诊断

### 1.1 当前 Blueprint 的重量来源

| 重量来源 | 数量 | 性质 |
|---------|------|------|
| 状态机状态 | ~20 个 | **官僚主义** — 状态转移、exit condition 验证、fix 循环独立状态 |
| 工作流步骤 | 25 个 | **官僚主义** — grill/research/discuss/split/proposal/plan/apply/review/archive/fix-plan/fix-apply... |
| 层级嵌套 | 4 层 | **官僚主义** — Project -> Milestone -> Phase -> Change，每层有独立状态 |
| PEG 语法 | 15 个 | **官僚主义** — AST 级 markdown 解析，维护成本高 |
| 制品模板 | 27 个 | **混合** — 有工程价值的（design/tasks/spec）和流程开销的（context/research/review-task） |
| 跨文档引用链 | FR->PR->DS->T | **官僚主义** — 硬性校验，过于刚性 |

### 1.2 OpenSpec 的优势与不足

**优势（借鉴）：**
- `specs/` 作为真相源 + `changes/` 作为变更单元 — 两文件夹模型
- Delta specs（ADDED/MODIFIED/REMOVED）— brownfield 友好
- Artifact-based 状态追踪 — 状态派生自文件存在性，不需要 state.md
- `continue` 推进机制 — 检查 schema 依赖图判断下一步
- Enablers not gates — 制品依赖是"什么变得可能"，不是"必须先做什么"
- YAML schema 定义制品依赖图 — 可定制，替代 PEG

**不足（不借鉴）：**
- `design.md` 是自由格式 — 没有结构化组件分解（DS-N）、没有决策记录（D-N）、没有文件清单
- `tasks.md` 是简单 checklist — 没有 wave 分解、没有依赖图、没有 TDD 标注、没有 RED 测试描述
- `apply` 是单个 agent 串行 — 没有子代理并发、没有 fresh-context 隔离
- 无质量门控 — apply -> archive 之间不检查实现质量
- 无 spec 门控 — delta spec 写了 ADDED/MODIFIED/REMOVED 但不验证是否真的实现
- 无 roadmap — 不支持大型项目的方向跟踪和进度追踪

### 1.3 核心矛盾

> **重量来自状态机官僚主义，不是来自工程严谨性。**
>
> 结构化 design（DS-N 组件分解）、结构化 tasks（wave + 依赖图 + TDD）、子代理并行派发、review 门控 — 这些是工程价值，必须保留。
>
> 20 个状态、25 个命令、4 层嵌套、15 个 PEG 语法、跨文档引用链 — 这些是流程开销，必须砍掉。

---

## 2. 设计目标

1. **规格驱动** — specs/ 是真相源，delta specs 描述变更，archive 合并回真相
2. **大型项目路线图** — roadmap.md 跟踪 milestone/phase 方向和进度，防止偏离
3. **工程严谨** — 结构化 design + tasks，子代理并行派发，spec 门控 + 质量门控
4. **轻量推进** — artifact-based 状态追踪，`continue` 自动检测下一步，无 state.md
5. **fluid not rigid** — 制品是 enablers 不是 gates，可随时回头修改
6. **brownfield 友好** — delta specs 描述变更而非全量重写

---

## 3. 架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                              bp/                                    │
│                                                                     │
│  ┌──────────────────┐    ┌──────────────────────────────────────┐  │
│  │  roadmap.md      │    │  specs/           (source of truth)  │  │
│  │  (方向 + 进度)    │    │    auth/spec.md                      │  │
│  │  milestone/phase │    │    payments/spec.md                  │  │
│  │  活文档，不门控   │    └──────────▲───────────────────────────┘  │
│  └────────┬─────────┘               │ merge on archive             │
│           │ references               │                              │
│  ┌────────▼─────────────────────────┴──────────────────────────┐   │
│  │  changes/                                                    │   │
│  │  ├── add-dark-mode/                                          │   │
│  │  │   ├── proposal.md      (why + what + scope)               │   │
│  │  │   ├── design.md        (how — 结构化：DS-N, D-N, 数据流)   │   │
│  │  │   ├── tasks.md         (steps — 结构化：wave, TDD, 依赖图) │   │
│  │  │   ├── specs/           (delta specs: ADDED/MODIFIED/REMOVED)│  │
│  │  │   │   └── ui/spec.md                                      │   │
│  │  │   └── review.md        (spec/quality/goal 门控结果)        │   │
│  │  ├── fix-auth-bug/                                            │   │
│  │  └── archive/              (已完成的，保留完整上下文)          │   │
│  │      └── 2025-01-24-add-dark-mode/                            │   │
│  ├── config.yaml           (项目配置 + schema + profile)         │   │
│  └── conventions/          (编码规范，自动注入子代理)             │   │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.1 两层架构

| 层 | 职责 | 状态追踪方式 |
|----|------|-------------|
| **Roadmap 层** | milestone/phase 方向 + 进度 | 活文档，archive 自动更新计数 |
| **Change 层** | spec 驱动的设计 -> 实现 -> 归档 | artifact-based（文件存在性 = 状态） |

**解耦关系：** change 可选引用 roadmap 中的 phase。Roadmap 不门控 change 流转。Archive 时自动更新 roadmap 进度。

### 3.2 与当前架构对比

| 维度 | 当前 Blueprint v0.5 | Blueprint v2 |
|------|---------------------|--------------|
| 状态追踪 | state.md + 20 个状态 + 转移表 | artifact-based（文件存在性） |
| 命令数 | 25 | 8 |
| 层级 | 4 层（P->M->Ph->C） | 2 层（Roadmap + Change） |
| 制品模板 | 27 | 6 |
| 校验 | PEG 5 维 + 引用链 | YAML schema + 轻量结构检查 |
| 子代理 | ✅ planner/executor/reviewer | ✅ 保留 |
| 质量门控 | ✅ 三重 review（强制） | ✅ 保留（profile 可选） |
| spec 门控 | ✅ spec-review | ✅ 保留 |
| delta specs | ✅ ADDED/MODIFIED/REMOVED | ✅ 保留 |
| 路线图 | milestone/phase 目录 + 状态 | roadmap.md 活文档 |
| continue | bp continue（读 state.md） | bp continue（检查 artifact） |
| enablers not gates | ❌ 状态机门控 | ✅ 制品依赖是 enablers |

---

## 4. 目录结构

### 4.1 项目初始化后

```
bp/
├── roadmap.md              # 路线图（milestone + phase + 进度）
├── specs/                  # 真相源（当前系统行为）
│   └── <domain>/
│       └── spec.md         # 需求 + 场景（SHALL/MUST + Given/When/Then）
├── changes/                # 变更目录
│   ├── <change-name>/      # 活跃变更
│   └── archive/            # 已归档变更（按日期戳）
│       └── YYYY-MM-DD-<name>/
├── config.yaml             # 项目配置
├── conventions/            # 编码规范（自动注入子代理）
│   └── coding.md
└── schemas/                # 自定义 schema（可选）
    └── <schema-name>/
        ├── schema.yaml
        └── templates/
```

### 4.2 单个 change 的结构

```
changes/<change-name>/
├── proposal.md             # 意图 + 范围 + 方法 + 交付物
├── design.md               # 结构化技术设计
├── tasks.md                # 结构化任务清单（wave + TDD + 依赖图）
├── specs/                  # Delta specs
│   └── <domain>/
│       └── spec.md         # ADDED/MODIFIED/REMOVED 需求 + 场景
└── review.md               # 审查结果（spec/quality/goal 三维度）
```

### 4.3 删除的目录/文件

| 删除项 | 理由 |
|--------|------|
| `state.md` | 用 artifact-based 状态追踪替代 |
| `requirements.md` | 合并进 `specs/`（行为契约）或 `roadmap.md`（项目目标） |
| `milestones/` 目录树 | `roadmap.md` 一个文件跟踪 |
| `research/` 目录 | 探索是临时的，不持久化（planner 子代理内部做） |
| `workspace/` 目录 | 无状态机就不需要 |
| `context.md`（phase 级） | 决策分布到各 change 的 proposal.md + design.md |
| `research.md`（phase 级） | planner 子代理内部做，不持久化 |
| `change-summary.md` | apply 的验证结果直接在 review.md 中体现 |
| `verification.md` | 合并进 review.md |
| `review-task.md` / `review-design.md` | fix 用 `--fix` flag 复用 tasks.md/design.md |

---

## 5. 变更生命周期

### 5.1 Artifact-Based 状态追踪

**核心思想：** change 的"状态"派生自哪些 artifact 文件存在，不需要显式 state.md。

```
(空目录) → proposal.md → design.md + tasks.md + specs/ → 代码实现 → review.md(PASS) → archive/
   │           │                    │                      │              │              │
   │           │                    │                      │              │              │
  propose    plan(子代理)         apply(子代理wave)      review(子代理)   archive
```

`bp continue` 检查 artifact 存在性，输出下一步指令：

```text
$ bp continue
Change: add-dark-mode
Artifacts: proposal.md ✓  design.md ✓  tasks.md ✓  specs/ ✓  code ✗
Next: apply — dispatch executor sub-agents for wave-based implementation

Run: bp apply add-dark-mode
```

### 5.2 生命周期阶段

| 阶段 | 触发条件 | 产出 | 执行者 |
|------|---------|------|--------|
| **propose** | 用户发起 | `proposal.md` | 编排者（人+AI 对话） |
| **plan** | proposal.md 存在 | `design.md` + `tasks.md` + `specs/<domain>/spec.md` | planner 子代理（fresh context） |
| **apply** | design.md + tasks.md 存在 | 代码 + 测试 + 原子提交 | executor 子代理（per wave, 并发） |
| **review** | 代码已实现 | `review.md`（三维度） | reviewer 子代理（fresh context） |
| **archive** | review.md = PASS | delta specs 合并 + change 归档 + roadmap 更新 | 编排者 |

### 5.3 Enablers Not Gates

制品依赖是"什么变得可能"，不是"必须先做什么"：

- 可以先写 specs 再写 proposal（两者都只依赖空目录）
- 可以跳过 design 直接写 tasks（如果变更足够简单）
- 可以在 apply 中途回头改 design（发现设计有问题）
- 可以在 review 后回头改 proposal（发现范围需要调整）

`bp continue` 建议**推荐**的下一步，但用户可以自由选择执行任何命令。

### 5.4 Fix 循环（无独立状态）

review 发现问题时，不进入独立状态，而是用 `--fix` flag 复用现有命令：

```text
review 发现 D 类问题（设计缺陷）:
  → bp plan --fix <name>     (planner 重读 review.md，修改 design.md + tasks.md)
  → bp apply --fix <name>    (executor 按修改后的 tasks 实现)
  → bp review <name>         (重新审查)

review 发现 R/Q/G 类问题（代码缺陷）:
  → bp apply --fix <name>    (executor 读 review.md 中的 issue 列表，逐个修复)
  → bp review <name>         (重新审查，在原 review.md 中标记 [x] 已修复)
```

---

## 6. 命令集

### 6.1 命令总览（8 个，从 25 个缩减）

| 命令 | 用途 | 子代理 |
|------|------|--------|
| `bp init` | 初始化项目 | — |
| `bp roadmap` | 查看/编辑路线图 | — |
| `bp propose <name>` | 创建 change + proposal.md | — |
| `bp plan [name]` | 派发 planner 子代理 → design + tasks + delta specs | ✅ planner |
| `bp apply [name]` | 派发 executor 子代理 per wave → 代码 + 测试 | ✅ executor ×N |
| `bp review [name]` | 派发 reviewer 子代理 → 三维度审查（门控） | ✅ reviewer |
| `bp archive [name]` | 合并 delta specs + 归档 + 更新 roadmap | — |
| `bp continue [name]` | 检查 artifact，输出下一步指令 | — |

### 6.2 命令详解

#### `bp init`

```text
输入: 项目路径
行为:
  1. 创建 bp/ 目录结构
  2. 生成 roadmap.md（空模板）
  3. 生成 config.yaml（默认 profile + schema）
  4. 生成 conventions/coding.md（空模板）
  5. 为每个配置的平台生成 slash commands + skills + agent 定义
输出: 项目骨架
```

#### `bp roadmap`

```text
行为:
  - 无参数: 显示当前路线图（milestone/phase/进度）
  - `--edit`: 打开编辑（或输出模板供 AI 填充）
  - `--add-milestone <name> --goal "<text>"`: 添加 milestone
  - `--add-phase <milestone> <name> --goal "<text>" --domain <domain>`: 添加 phase
  - `--mark <milestone> <phase> --shipped`: 标记 phase/milestone 完成
输出: 路线图内容或操作结果
```

#### `bp propose <name>`

```text
输入: change 名称
行为:
  1. 创建 changes/<name>/ 目录
  2. 生成 proposal.md（从模板）
  3. AI 填充: intent, scope(in/out), approach, deliverables
  4. 可选: 引用 roadmap 中的 phase（`--phase <milestone>/<phase>`）
  5. 可选: `--adhoc` 标记为临时变更（不关联 phase）
输出: proposal.md 就绪，提示运行 bp continue
```

#### `bp plan [name]`

```text
输入: change 名称（省略则取最近活跃的 change）
行为:
  1. 读取 proposal.md + 现有 specs/ + conventions/ + 代码库
  2. 派发 planner 子代理（fresh context）
  3. planner 产出:
     - design.md（结构化: DS-N 组件, D-N 决策, 数据流, 文件清单, 接口设计）
     - tasks.md（结构化: wave 分解, TDD 标注, RED 测试, 依赖图, 验收标准）
     - specs/<domain>/spec.md（delta: ADDED/MODIFIED/REMOVED）
  4. 编排者验证产出完整性
  5. 提交制品

  --fix 模式: planner 读 review.md 中的 D 类问题，修改 design.md + tasks.md
输出: design.md + tasks.md + delta specs 就绪
```

#### `bp apply [name]`

```text
输入: change 名称
行为:
  1. 读取 tasks.md，解析 wave 结构
  2. 构建依赖图（cross-wave depends_on）
  3. 按轮次派发 executor 子代理:
     - 每轮: 无未满足跨 wave 依赖的 wave 并发派发（一个子代理 per wave）
     - 每个 executor: fresh context，收到 wave 内全部 task + 相关 specs + conventions
     - executor 按 TDD 执行: RED(写失败测试) -> GREEN(实现) -> REFACTOR
     - 每个 task 完成后: 原子提交 + 自动标记 [x] + commit hash 注释
  4. 每轮完成后编排者验证: git log, git diff, tasks.md 标记, 测试通过
  5. 全部 wave 完成后: 运行完整测试套件 (tsc + vitest)

  --fix 模式: executor 读 review.md 中的 R/Q/G 类问题，逐个修复

  Lightweight 模式（全 type:config|docs|refactor|scaffolding）: 编排者自实现，不派发子代理
输出: 代码 + 测试 + 原子提交
```

#### `bp review [name]`

```text
输入: change 名称
行为:
  1. 派发 reviewer 子代理（fresh context）
  2. reviewer 执行三维度审查:
     - Spec 审查: delta spec 中每个 ADDED/MODIFIED/REMOVED 需求是否有对应实现
                 每个 Scenario(Given/When/Then) 是否有对应测试
     - Quality 审查: 代码规范、错误处理、安全、死代码、过度抽象
     - Goal 审查: proposal.md 中每个 deliverable 是否实现
  3. Issue 分类:
     - R-N (Spec): 规格不符 → reapply (bp apply --fix)
     - Q-N (Quality): 质量问题 → reapply (bp apply --fix)
     - G-N (Goal): 目标未达 → reapply (bp apply --fix)
     - D-N (Design): 设计缺陷 → replan (bp plan --fix)
  4. 输出 review.md（含 issue 清单 + 整体裁决）
  5. 若全 PASS: 提示运行 bp archive
  6. 若有 issue: 提示运行 bp apply --fix 或 bp plan --fix

  --fix 模式: 在原 review.md 中标记已修复的 issue ([ ] → [x])，追加新发现
输出: review.md（门控结果）
```

#### `bp archive [name]`

```text
输入: change 名称
前置: review.md 存在且无未解决 issue（或用户 --force 跳过）
行为:
  1. 合并 delta specs:
     - ADDED → 追加到 bp/specs/<domain>/spec.md
     - MODIFIED → 替换对应 requirement
     - REMOVED → 删除对应 requirement
  2. 移动 change 到 changes/archive/YYYY-MM-DD-<name>/
  3. 更新 roadmap.md: 标记 change 为 [x]，递增 phase 计数
  4. 若 phase 所有 change 归档: 标记 phase COMPLETED
  5. 若 milestone 所有 phase 完成: 标记 milestone SHIPPED
  6. 提交
输出: specs 更新 + change 归档 + roadmap 进度更新
```

#### `bp continue [name]`

```text
输入: change 名称（省略则取最近活跃的 change）
行为:
  1. 检查 change 目录中的 artifact 存在性
  2. 根据 schema 依赖图判断当前进度
  3. 输出下一步推荐 + 命令

  判断逻辑:
  - 无 proposal.md → "Run: bp propose <name>"
  - proposal.md 存在, 无 design.md → "Run: bp plan <name>"
  - design.md + tasks.md 存在, 代码未实现 → "Run: bp apply <name>"
  - 代码已实现, 无 review.md → "Run: bp review <name>"
  - review.md 存在但未 PASS → "Run: bp apply --fix <name>" 或 "bp plan --fix <name>"
  - review.md PASS → "Run: bp archive <name>"
  - 无活跃 change → 显示 roadmap，建议下一步方向

  代码是否实现的判断: tasks.md 中是否有 [x] 标记
输出: 当前状态 + 推荐下一步
```

### 6.3 删除的命令（17 个）

| 删除命令 | 替代方案 |
|---------|---------|
| `bp grill` | 用户直接与 AI 对话探索需求，不需要独立命令 |
| `bp research` | planner 子代理内部做技术调研，不持久化 |
| `bp design` (UI 设计) | 非核心流程，移除 |
| `bp discuss` | phase 级上下文收集，用 proposal.md 替代 |
| `bp research-phase` | planner 子代理内部做 |
| `bp split` | 用户直接创建多个 change，不需要拆分命令 |
| `bp milestone` | `bp roadmap --add-milestone` 替代 |
| `bp add-phase` | `bp roadmap --add-phase` 替代 |
| `bp adhoc` | `bp propose --adhoc` 替代 |
| `bp proposal` | 合并进 `bp propose` |
| `bp fix-plan` | `bp plan --fix` 替代 |
| `bp fix-apply` | `bp apply --fix` 替代 |
| `bp commit` | executor 内部直接 git commit，不需要独立命令 |
| `bp audit` | `bp review` 已覆盖 |
| `bp loop` | 用户手动运行 `bp continue`，不需要自动循环 |
| `bp ship` | `bp roadmap --mark --shipped` 替代 |
| `bp upgrade` | 保留但简化（模板更新） |

---

## 7. 制品结构

### 7.1 proposal.md（保留，简化）

```markdown
# Proposal: <change-name>

## Intent
<为什么要做这个变更？解决什么问题？>

## Scope
### In Scope
- <具体包含的内容>
### Out of Scope
- <明确排除的内容>

## Approach
<高层方法描述，不需要技术细节>

## Deliverables
<!-- 按可观测能力拆分，每个 deliverable 对应一组 spec 需求 -->
- PR-1: <title>
  - Source: <FR-id 或 spec 引用>
  - System SHALL <可观测行为>
  - Verify: <验证方法>
- PR-2: <title>
  - Source: <spec 引用>
  - System SHALL <可观测行为>
  - Verify: <验证方法>

## Roadmap Reference
<!-- 可选：关联的 milestone/phase -->
- Milestone: <name>
- Phase: <name>
```

### 7.2 design.md（保留结构化，这是 OpenSpec 缺失的）

```markdown
# Design: <change-name>

## Design Items
<!-- 组件分解: 每个 DS-N 是一个模块边界 -->

### DS-1: <component-name>
- **Refs**: PR-1, PR-2
- **Source**: PR-1 (proposal.md)
- **Responsibility**: <这个组件负责什么>

### DS-2: <component-name>
- **Refs**: PR-2
- **Source**: PR-2 (proposal.md)
- **Responsibility**: <...>

## Architecture Decisions
<!-- 决策记录: 每个 D-N 有状态、理由、替代方案 -->

### D-1: <decision-title>
- Status: ACCEPTED
- Decision: <决定了什么>
- Reason: <为什么>
- Alternatives: <考虑了什么替代方案>

### D-2: <decision-title>
- Status: ACCEPTED
- Decision: <...>
- Reason: <...>

## Technical Approach

### Architecture Diagram
<!-- ASCII 架构图，标注 [NEW], [MODIFIED], [EXISTING] -->
```text
<diagram>
```

### Core Data Structures
<!-- 关键类型/接口，TypeScript interface 格式 -->

### Data Flow
<!-- 触发到效果的步骤流 -->

### Interface Design
<!-- 接口定义: method, path, request/response -->
#### <endpoint> `HTTP_METHOD /path`
- **Request**: <schema>
- **Response**: <schema>
- **Errors**: <error codes>
- **Source**: specs/<domain>/spec.md SHALL-<id>

## File Manifest
| File Path | Description | Action | Source |
|-----------|-------------|--------|--------|
| `src/...` | <description> | Create | DS-1 |
| `src/...` | <description> | Modify | DS-2 |

## TDD Strategy
- behavior 任务: RED->GREEN->REFACTOR
- 其他类型: 直接实现

## Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| <risk> | <impact> | <mitigation> |
```

**与 OpenSpec 的区别：** OpenSpec 的 design.md 只有 "Technical Approach" 和 "Architecture Decisions" 两个自由格式段落。Blueprint v2 保留结构化的 DS-N 组件分解、D-N 决策记录、文件清单、接口设计 — 这些是 planner 子代理产出、executor 子代理消费、reviewer 子代理验证的结构化契约。

### 7.3 tasks.md（保留结构化，这是 OpenSpec 缺失的）

```markdown
# Tasks: <change-name>

## TDD Type Annotations
| type | Meaning | TDD Protocol |
|------|---------|-------------|
| behavior | 业务行为 | RED->GREEN->REFACTOR |
| config | 配置 | 直接实现 |
| refactor | 重构 | 验证测试→重构→再验证 |
| docs | 文档 | 直接实现 |
| scaffolding | 骨架代码 | 直接实现 |

## Wave 1: <theme>
<!-- wave 分解: 有层间依赖时才多 wave，默认 1 wave -->

- [ ] T-1: [type:behavior] <title>
  - **refs**: DS-1
  - **spec_ref**: specs/ui/spec.md#theme-selection
  - **files**: src/contexts/ThemeContext.tsx, src/contexts/ThemeContext.test.tsx
  - **acceptance**: <验收标准>
  - **RED**: GIVEN <precondition> WHEN <action> THEN <assertion>

- [ ] T-2: [type:behavior] <title>
  - **refs**: DS-1
  - **spec_ref**: specs/ui/spec.md#theme-persistence
  - **files**: src/hooks/useTheme.ts, src/hooks/useTheme.test.ts
  - **acceptance**: <验收标准>
  - **RED**: GIVEN <precondition> WHEN <action> THEN <assertion>
  - **depends_on**: T-1

- [ ] T-3: [type:scaffolding] <title>
  - **refs**: DS-2
  - **files**: src/components/ThemeToggle.tsx
  - **acceptance**: <验收标准>

## Wave 2: <theme>
<!-- 仅当 Wave 1 的任务被 Wave 2 依赖时才存在 -->
- [ ] T-4: [type:behavior] <title>
  - **refs**: DS-2
  - **spec_ref**: specs/ui/spec.md#toggle-visibility
  - **files**: src/components/ThemeToggle.test.tsx
  - **RED**: GIVEN <precondition> WHEN <action> THEN <assertion>
  - **depends_on**: T-3

## Pre-Archive Checklist
- [ ] `tsc --noEmit` passes
- [ ] `vitest run` all suites pass
- [ ] All wave acceptance criteria confirmed
```

**与 OpenSpec 的区别：** OpenSpec 的 tasks.md 是简单的编号 checklist（`- [ ] 1.1 Create ThemeContext`）。Blueprint v2 保留：
- **Wave 分解** — 有依赖关系的 task 分到不同 wave，wave 内并发
- **Task 类型标注** — behavior/config/refactor/docs/scaffolding，决定 TDD 策略
- **RED 测试描述** — type:behavior 任务必须写 GIVEN/WHEN/THEN，executor 先写失败测试
- **依赖图** — depends_on 字段，构建执行 DAG
- **spec_ref** — 每个 behavior task 引用 delta spec 中的具体需求，reviewer 据此做 spec 门控
- **组件引用** — refs: DS-N，追溯到 design 中的组件分解

### 7.4 delta specs（保留，从 OpenSpec 借鉴的核心）

```markdown
# Delta: <domain>

## ADDED Requirements

### Requirement: Theme Selection
The system SHALL allow users to choose between light and dark themes.

#### Scenario: Manual toggle
- GIVEN a user on any page
- WHEN the user clicks the theme toggle
- THEN the theme switches immediately
- AND the preference persists across sessions

#### Scenario: System preference detection
- GIVEN a user with no saved preference
- WHEN the application loads
- THEN the system's preferred color scheme is used

## MODIFIED Requirements

### Requirement: Session Expiration
The system MUST expire sessions after 15 minutes of inactivity.
(Previously: 30 minutes)

#### Scenario: Idle timeout
- GIVEN an authenticated session
- WHEN 15 minutes pass without activity
- THEN the session is invalidated

## REMOVED Requirements

### Requirement: Remember Me
(Deprecated in favor of 2FA. Users should re-authenticate each session.)
```

### 7.5 review.md（三维度合一，替代三个独立文件）

```markdown
# Review: <change-name>

## Overall Verdict: PASS | FAIL | NEEDS_REVISION

## Spec Review
<!-- Spec 门控: delta spec 中每个需求是否有对应实现 -->

### Constraint Checklist
| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Theme Selection (ADDED) | PASS | src/contexts/ThemeContext.tsx:42 |
| 2 | Session Expiration (MODIFIED) | FAIL | src/auth/session.ts — still 30min |

### Scenario Coverage
| Scenario | Test | Status |
|----------|------|--------|
| Manual toggle | ThemeContext.test.tsx:15 | PASS |
| System preference | ThemeContext.test.tsx:28 | PASS |
| Idle timeout | session.test.ts:8 | MISSING |

## Quality Review
<!-- 质量门控: 代码规范、错误处理、安全 -->

### Issues
| # | Severity | File:Line | Issue | Fix |
|---|----------|-----------|-------|-----|
| Q1 | MAJOR | src/contexts/ThemeContext.tsx:42 | No error boundary | Wrap in ErrorBoundary |

## Goal Review
<!-- 目标门控: proposal 中每个 deliverable 是否实现 -->

### Goal Checklist
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| PR-1: Theme toggle | ACHIEVED | Header toggle works |
| PR-2: System preference | ACHIEVED | Detects on load |
| PR-3: localStorage | PARTIAL | Saves but doesn't restore |

## Issues
<!-- 所有待解决问题，按前缀分类 -->
- [ ] R1: Session Expiration 未修改为 15 分钟 (spec-review)
- [ ] Q1: ThemeContext 无 error boundary (quality-review)
- [ ] G1: localStorage 恢复未实现 (goal-review)

## Routing
- D 类问题 (0): 无
- R/Q/G 类问题 (3): → bp apply --fix <name>
```

---

## 8. 子代理派发模型

### 8.1 三种子代理（保留）

| 子代理 | 职责 | 输入 | 输出 | Fresh Context | Isolated |
|--------|------|------|------|----------------|----------|
| **Planner** | 设计技术方案 + 分解任务 + 写 delta specs | proposal.md, specs/, conventions/, 代码库 | design.md, tasks.md, specs/<domain>/spec.md | ✅ | ❌ 单实例，只写 change 目录，需读真实代码库 |
| **Executor** | 按 wave 实现 task，TDD，原子提交 | tasks.md(单个wave), design.md, delta specs, conventions | 代码 + 测试 + git commits | ✅ | ✅ 多实例并发写源码，必须 worktree 隔离防冲突 |
| **Reviewer** | 三维度审查 + issue 分类 + 路由 | design.md, tasks.md, delta specs, 代码, proposal.md | review.md | ✅ | ❌ 单实例，只读源码 + 写 review.md，需读真实代码 |

### 8.2 派发流程

```text
bp plan <name>
  │
  ├──► [Planner 子代理] ──► design.md + tasks.md + specs/
  │                         (fresh context, 读取所有上下文)
  │
  ▼ (编排者验证产出)

bp apply <name>
  │
  ├── 读取 tasks.md, 构建 wave 依赖图
  │
  ├── Round 1: 并发派发无依赖的 wave
  │   ├──► [Executor-A 子代理] ──► Wave 1 tasks (代码 + 测试 + 提交)
  │   ├──► [Executor-B 子代理] ──► Wave 2 tasks (代码 + 测试 + 提交)
  │   │   (fresh context, 各自隔离)
  │   │
  │   ▼ (编排者验证: git log, git diff, tasks.md [x], 测试通过)
  │
  ├── Round 2: 派发依赖 Round 1 的 wave
  │   ├──► [Executor-C 子代理] ──► Wave 3 tasks
  │   │
  │   ▼ (编排者验证)
  │
  ▼ (全量测试: tsc + vitest)

bp review <name>
  │
  ├──► [Reviewer 子代理] ──► review.md
  │   (fresh context, 三维度审查 + issue 分类)
  │
  ▼ (编排者读取 review.md, 判断路由)

  PASS → bp archive
  R/Q/G → bp apply --fix
  D     → bp plan --fix
```

### 8.3 Lightweight vs Full 模式（保留自动分类）

```text
读取 tasks.md 的 task types:
  全部 type:config|docs|refactor|scaffolding → LIGHTWEIGHT (编排者自实现)
  存在 type:behavior → FULL (派发子代理)
```

### 8.4 子代理上下文注入

每个子代理的 prompt 中注入：

```xml
<context>
  <project_context>config.yaml 的 context 字段</project_context>
  <conventions>conventions/coding.md 的内容</conventions>
  <specs>bp/specs/ 中相关 domain 的 spec.md</specs>
  <change_artifacts>proposal.md, design.md 等已存在的制品</change_artifacts>
</context>
```

---

## 9. 门控系统

### 9.1 双重门控

| 门控 | 位置 | 检查内容 | 裁决 |
|------|------|---------|------|
| **Spec 门控** | review 阶段 | delta spec 中每个 ADDED/MODIFIED/REMOVED 需求是否有对应实现；每个 Scenario 是否有测试 | PASS/FAIL |
| **质量门控** | review 阶段 | 代码规范、错误处理、安全、死代码、过度抽象 | PASS/FAIL |

### 9.2 门控路由

```text
review.md 裁决:

  全 PASS
    → bp archive <name>

  存在 R/Q/G 类 issue (代码可修复)
    → bp apply --fix <name>
    → bp review <name> (re-review, 标记 [x])

  存在 D 类 issue (设计需重做)
    → bp plan --fix <name>
    → bp apply --fix <name>
    → bp review <name>
```

### 9.3 Profile 控制

| Profile | Review 门控 | 子代理 | TDD |
|---------|------------|--------|-----|
| **lite** | 可选（`--review` flag 触发） | auto（lightweight/full 自动分类） | 可选 |
| **standard** | 强制（archive 前必须 PASS） | auto | behavior 强制 |

---

## 10. Profile 系统

### 10.1 两档（从三档简化）

删除 `strict`（人工门控每步太重）。

```yaml
# config.yaml
profile: standard    # lite | standard
```

### 10.2 Profile 行为矩阵

| 行为 | lite | standard |
|------|------|----------|
| Review 门控 | 可选（`--review` flag） | 强制（archive 前必须 PASS） |
| 子代理派发 | auto（lightweight/full 自动） | auto |
| TDD | 可选 | behavior 强制 (RED->GREEN->REFACTOR) |
| Wave 并发 | ✅ | ✅ |
| Fix 循环 | ✅ | ✅ |
| Delta specs | ✅ | ✅ |

---

## 11. Schema 系统

### 11.1 用 YAML schema 替代 PEG

```yaml
# bp/schemas/spec-driven/schema.yaml
name: spec-driven
version: 2
description: Spec-driven development with structured design and sub-agent dispatch

artifacts:
  - id: proposal
    generates: proposal.md
    requires: []
    description: "Why + what + scope + deliverables"

  - id: design
    generates: design.md
    requires: [proposal]
    description: "Structured technical design (DS-N, D-N, data flow, file manifest)"

  - id: specs
    generates: specs/**/*.md
    requires: [proposal]
    description: "Delta specs (ADDED/MODIFIED/REMOVED)"

  - id: tasks
    generates: tasks.md
    requires: [design, specs]
    description: "Structured task checklist (waves, TDD, dependency graph)"

apply:
  requires: [tasks]
  tracks: tasks.md
  dispatch: executor    # sub-agent type

review:
  requires: [apply]
  dispatch: reviewer    # sub-agent type
  dimensions: [spec, quality, goal]

archive:
  requires: [review]
  merges: [specs]
```

### 11.2 制品依赖图

```
proposal (root)
    │
    ├──► design (requires: proposal)
    │
    ├──► specs (requires: proposal)
    │       │
    │       ▼
    └──► tasks (requires: design + specs)
            │
            ▼
         apply (requires: tasks)
            │
            ▼
         review (requires: apply)
            │
            ▼
         archive (requires: review)
```

**Enablers not gates:** design 和 specs 都只依赖 proposal，可以并行创建。可以跳过 design（如果变更简单）。可以回头改任何制品。

### 11.3 轻量校验（替代 PEG 5 维）

| 校验项 | 方法 | 何时触发 |
|--------|------|---------|
| 文件存在 | `fs.existsSync` | `bp continue` 判断进度 |
| 必填段落存在 | 正则匹配 `## ` 标题 | `bp plan` / `bp apply` 前 |
| 无模板占位符 | 正则匹配 `{{` | 制品提交前 |
| Delta spec 结构 | 正则匹配 `## ADDED/MODIFIED/REMOVED Requirements` | `bp archive` 前 |
| SHALL/MUST 存在 | 正则匹配 | `bp archive` 前 |
| tasks.md checkbox | 正则匹配 `- [ ]` / `- [x]` | `bp apply` / `bp review` |

**不做的校验：** AST 级 markdown 解析、跨文档引用链强制（FR->PR->DS->T）、PEG 语法树。

---

## 12. Roadmap 系统

### 12.1 roadmap.md 格式

```markdown
# Roadmap

## Milestone: M1 — Core Engine [ACTIVE]
Goal: 构建 CLI 核心引擎，支持规格驱动开发工作流

### Phase: Auth System [IN_PROGRESS]
- Goal: 用户认证 + 会话管理
- Spec domain: auth/
- Changes: 3/4 completed
  - [x] add-login-flow (archived 2025-01-20)
  - [x] add-session-expiry (archived 2025-01-22)
  - [x] add-2fa-support (archived 2025-01-23)
  - [ ] add-password-reset
- Next: add-password-reset

### Phase: Payment Integration [NOT_STARTED]
- Goal: 支付处理
- Spec domain: payments/
- Changes: 0/3
- Planned changes:
  - add-payment-gateway
  - add-refund-flow
  - add-payment-webhooks

## Milestone: M2 — Multi-Platform [PLANNED]
Goal: 支持 Claude Code, Cursor 等多平台
```

### 12.2 防偏离机制

1. **方向显式** — roadmap.md 明确写出每个 milestone/phase 的 goal
2. **引用追溯** — 每个 change 的 proposal.md 可选引用所属 phase
3. **Spec 契约** — specs/ 是行为真相，可以对比实现是否匹配
4. **Review 门控** — reviewer 检查 deliverable 是否实现（goal 审查）
5. **进度可见** — `bp roadmap` 一眼看到 milestone/phase/change 进度

### 12.3 进度自动更新

`bp archive` 执行时：
1. 在 roadmap.md 中将 change 标记为 `[x]` + 归档日期
2. 递增 phase 的 `Changes: N/M` 计数
3. 若 phase 所有 change 归档 → 标记 `[COMPLETED]`
4. 若 milestone 所有 phase 完成 → 标记 `[SHIPPED]`

---

## 13. config.yaml

```yaml
# Blueprint project configuration
version: 2

# 多平台
platform:
  - omp
  - claude-code
  - agent

# 工作流 profile
profile: standard    # lite | standard

# 项目上下文注入
context: |
  项目: my-app
  技术栈: TypeScript, React, Node.js, PostgreSQL
  测试: Vitest + React Testing Library
  API 风格: RESTful
  语言: 中文

# 制品规则（注入子代理 prompt）
rules:
  proposal:
    - "每个 deliverable 必须有可观测的验收方法"
  specs:
    - "使用 Given/When/Then 格式"
    - "每个 Requirement 至少有 1 个 Scenario"
  design:
    - "每个 DS-N 必须有 Source: PR-{id} 标注"
    - "架构图必须标注 [NEW]/[MODIFIED]/[EXISTING]"
  tasks:
    - "type:behavior 任务必须有 RED 测试描述"
    - "depends_on 只能引用同 wave 或前序 wave 的 task"

# 默认 schema
schema: spec-driven

# 模型配置（角色 -> OMP modelRole）
models:
  research: slow
  plan: slow
  execute: default
  review: slow
  archive: default

# conventions 注入
conventions:
  inject: true

# git 配置
git:
  create_tag: true    # milestone ship 时打 tag
```

---

## 14. 迁移路径

### 14.1 代码层面需要修改的模块

| 当前模块 | 操作 | 说明 |
|---------|------|------|
| `src/core/state-file.ts` | **删除** | 不再需要 state.md |
| `src/core/state-machine.ts` | **删除** | 不再需要状态转移表 |
| `src/core/continue.ts` | **重写** | 改为 artifact-based 进度检测 |
| `src/core/state-validator.ts` | **删除** | 不再需要 exit condition 验证 |
| `src/core/validate/` (PEG) | **删除** | 用 YAML schema + 正则校验替代 |
| `src/core/delta-merge.ts` | **保留** | delta spec 合并逻辑不变 |
| `src/core/spec-injector.ts` | **保留** | 上下文注入逻辑不变 |
| `src/core/code-extract.ts` | **保留** | git diff 分析不变 |
| `src/core/brownfield.ts` | **保留** | 存量项目检测不变 |
| `src/core/config.ts` | **修改** | 简化 profile/toggle |
| `src/core/file-tree.ts` | **修改** | 简化目录结构（无 milestones/ 层级） |
| `src/core/platform-registry.ts` | **保留** | 多平台生成不变 |
| `src/types/state.ts` | **删除** | 不再需要 StateFile/StateTransition |
| `src/types/project.ts` | **修改** | 简化 ChangeStatus |
| `src/templates/workflows/` (25个) | **缩减为8个** | propose, plan, apply, review, archive, continue, init, roadmap |
| `src/templates/artifacts/` (27个) | **缩减为6个** | proposal, design, tasks, spec, review, roadmap |
| `src/templates/agents/` (7个) | **保留3个** | planner, executor, reviewer |
| `src/commands/` (25个) | **缩减为8个** | 对应 8 个命令 |
| `src/parser/` (PEG编译) | **删除** | 不再需要 PEG |

### 14.2 迁移步骤

```
Phase 1: 核心引擎重写
  1. 删除 state-machine, state-file, state-validator, parser/
  2. 重写 continue.ts (artifact-based 进度检测)
  3. 新建 schema.ts (YAML schema 加载 + 依赖图)
  4. 新建 artifact-validator.ts (轻量正则校验)
  5. 修改 file-tree.ts (简化目录结构)
  6. 修改 config.ts (简化 profile)

Phase 2: 命令层重构
  7. 新建 bp-propose.ts (合并 proposal + adhoc)
  8. 修改 bp-plan.ts (添加 --fix 模式)
  9. 修改 bp-apply.ts (添加 --fix 模式)
  10. 修改 bp-review.ts (三维度合一到 review.md)
  11. 修改 bp-archive.ts (更新 roadmap)
  12. 修改 bp-continue.ts (artifact-based)
  13. 新建 bp-roadmap.ts
  14. 修改 bp-init.ts (新目录结构)
  15. 删除: grill, research, discuss, split, milestone, adhoc, fix-plan, fix-apply, commit, audit, loop, ship, add-phase, design, upgrade

Phase 3: 模板层重构
  16. 缩减 workflows/ 为 8 个
  17. 缩减 artifacts/ 为 6 个
  18. 缩减 agents/ 为 3 个

Phase 4: 测试 + 文档
  19. 更新集成测试
  20. 更新 AGENTS.md / README.md
```

### 14.3 向后兼容

- 当前 `bp/` 目录中的已归档 change 保持不变（archive/ 结构兼容）
- `state.md` 可保留为只读历史记录，不再驱动流程
- 现有 `specs/` 目录结构不变
- `project.yml` → `config.yaml`（提供迁移脚本）

---

## 15. 总结

### 核心决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 状态追踪 | artifact-based（文件存在性） | 轻，无需 state.md，enablers not gates |
| 命令数 | 8（从25缩减） | 砍掉 phase 级流程命令，保留工程管道 |
| 层级 | 2 层（Roadmap + Change） | 路线图轻量跟踪，change 独立流转 |
| 校验 | YAML schema + 正则 | 替代 15 个 PEG，维护成本低 |
| 制品 | 6 个结构化模板 | 保留 design/tasks 结构化，OpenSpec 太轻 |
| 子代理 | 3 类（planner/executor/reviewer） | fresh context；仅 executor 隔离（并发写源码），planner/reviewer 不隔离（单实例，需读真实代码库） |
| 门控 | spec + quality（review 阶段） | profile 可选，D 类路由到 replan |
| Delta specs | ADDED/MODIFIED/REMOVED | brownfield 友好，archive 自动合并 |
| Roadmap | 活文档，不门控 | 防偏离 + 进度跟踪，不阻塞 change |
| Fix 循环 | --fix flag 复用命令 | 无独立状态，无独立命令 |

### 定位

> **Blueprint v2 = OpenSpec 的轻量结构 + Blueprint 的工程严谨性**
>
> 比 OpenSpec 多：结构化 design/tasks、子代理并发、spec 门控、质量门控、路线图
> 比 Blueprint v0.5 少：状态机、25 个命令、4 层嵌套、15 个 PEG、跨文档引用链
