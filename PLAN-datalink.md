# Data Link — 全链路编号 + PEG 格式化方案

> 统一 bp 所有文档的编号体系、引用链、格式定义、推进检查和自动化。
> 实施前所有文档用 PEG grammar 定义格式，`bp continue` 在各步骤自动校验。
> 2026-07

---

## 1. 编号作用域总表

| 层级 | 文档 | 编号 | 作用域 | 引用方式 |
|------|------|------|--------|---------|
| 项目 | requirements.md | `FR-1, FR-2, NFR-1` | 全局 | `refs: FR-1` |
| 阶段 | context.md | `D-1, D-2` | 当前 phase | `refs: D-1` |
| 变更 | proposal.md → Deliverables | `PR-1, PR-2` | 当前 change | `refs: PR-1` |
| 变更 | design.md → Design Items | `DS-1, DS-2` | 当前 change | `refs: DS-1` |
| 变更 | tasks.md | `T-1, T-2` | 当前 change | — |
| 变更 | review 文件 | `R1, Q1, G1` | 当前 change | `review_ref: R1` |
| 变更 | review-task.md | `FT-1` | 当前 change | `review_ref: R1` |
| 变更 | uat.md | `UT-1` | 当前 change | — |
| 项目 | roadmap.md | `Md-1, Ph-1.1` | 全局 | archive 自动打标 |

---

## 2. 引用链

```
requirements.md                          context.md (phase级)
  FR-1 [CURRENT]                           D-1 ACCEPTED  refs: FR-1
  NFR-1 [COMPLETED]                        D-2 ACCEPTED
       │                                        │
       └────────┬───────────────────────────────┘
                │ 每个 PR 项独立 refs FR/D
                ▼
proposal.md
  ## Deliverables
  - PR-1: login endpoint              refs: FR-1, D-1
  - PR-2: password hashing            refs: FR-1
  - PR-3: token refresh               refs: NFR-1, D-1
                │
                │ 每个 DS 项独立 refs PR
                ▼
design.md
  ## Design Items
  - DS-1: AuthController              refs: PR-1, PR-3
  - DS-2: TokenService                refs: PR-3
  - DS-3: PasswordHasher              refs: PR-2
                │
                │ 每个 T 项独立 refs DS
                ▼
tasks.md
  - [ ] T-1: implement AuthController  refs: DS-1
  - [ ] T-2: implement TokenService    refs: DS-2
  - [ ] T-3: implement PasswordHasher  refs: DS-3
```

### 2.1 无孤儿引用规则

```
PR → DS: 每个 PR 至少被一个 DS 引用（没有 DS 引用的 PR = 孤儿）
DS → T:  每个 DS 至少被一个 T 引用（没有 T 引用的 DS = 孤儿）
T → [x]: 所有 T 最终必须 [x]（归档条件）
D → 完成: 每个 D 关联的所有 T 必须 [x]（phase 完成条件）
```

---

## 3. 文件格式定义

### 3.1 requirements.md

```markdown
# Requirements: {{project-name}}

## FR-1: {{title}} [CURRENT]
**GIVEN** {{precondition}}
**WHEN** {{trigger}}
**THEN** {{expected}}

### Constraints
- {{constraint 1}}
- {{constraint 2}}

## NFR-1: {{title}} [COMPLETED]
- {{metric}}
- {{metric}}

## FR-2: {{title}} [PENDING]
**GIVEN** {{precondition}}
**WHEN** {{trigger}}
**THEN** {{expected}}
```

**状态枚举：** `[CURRENT]` / `[COMPLETED]` / `[PENDING]`

### 3.2 context.md

```markdown
# Context: {{phase-name}}

## D-1: {{decision-title}}
- Status: ACCEPTED
- Reason: {{why}}
- Alternatives considered: {{what else}}
- References: FR-{{id}}, FR-{{id}}

## D-2: {{decision-title}}
- Status: ACCEPTED
- Reason: {{why}}
- References: FR-{{id}}
```

**状态枚举：** `ACCEPTED` / `REJECTED` / `DEFERRED`

PEG grammar:
```peg
Decision = "## D-" id ": " title EOL
           "- Status: " status EOL
           "- Reason: " text EOL
           alternatives? references?
```

### 3.3 proposal.md

```markdown
# Proposal: {{change-name}}

## Intent
{{what, why, who affected}}

## Deliverables
- PR-1: {{title}}  refs: FR-{{id}}, D-{{id}}
  {{description}}
- PR-2: {{title}}  refs: FR-{{id}}
  {{description}}
<!--
PR-N 是本提案的交付项编号。
每个 PR 项独立引用需求 (FR/NFR) 和决策 (D)，refs 中的编号必须在 requirements.md 和 context.md 中存在。
Adhoc change: 可以没有 refs，但 PR 项必须有。
-->

## Scope
{{what's included}}

## Out of Scope
{{what's excluded}}
```

PEG grammar:
```peg
Proposal     = "# Proposal:" name EOL intent deliverables scope? outOfScope?
deliverables = "## Deliverables" EOL deliverable+
deliverable  = "- PR-" id ":" title "refs:" refList EOL text?
refList      = refId (", " refId)*
refId        = "FR-" id / "NFR-" id / "D-" id
```

4 维校验：
- **FORM**: PEG parse
- **FILL**: 每个 PR 项有非空标题 + 描述，无 `{{placeholder}}` 残留
- **ENUM**: —（proposal 无枚举字段）
- **REFS**: 每个 PR 项的 refs 中 FR/NFR 在 requirements.md 存在，D 在 phase context.md 存在

### 3.4 design.md

```markdown
# Design: {{change-name}}

## Design Items
- DS-1: {{component}}
  refs: PR-{{id}}, PR-{{id}}
  {{description, interfaces, responsibilities}}
- DS-2: {{component}}
  refs: PR-{{id}}
  {{description}}
<!--
DS-N 是设计分解项编号。
每个 DS 项独立引用 proposal 中的 PR 编号，refs 中的 PR-N 必须在 proposal.md Deliverables 中存在。
-->

## Architecture
{{component diagram, data flow, module boundaries}}

## Alternatives
- {{approach}}: {{why rejected}}
```

PEG grammar:
```peg
Design   = "# Design:" name EOL items architecture? alternatives?
items    = "## Design Items" EOL item+
item     = "- DS-" id ":" title EOL "refs:" prList EOL text?
prList   = "PR-" id (", " "PR-" id)*
```

4 维校验：
- **FORM**: PEG parse
- **FILL**: 每个 DS 项有非空标题 + 描述，无 `{{placeholder}}`
- **ENUM**: —
- **REFS**: 每个 DS 项的 refs 中 PR-N 在 proposal.md Deliverables 中存在
- **COMPLETE**: 所有 PR-N 至少被一个 DS 引用（无孤儿 PR）

### 3.5 tasks.md

```markdown
# Tasks: {{change-name}}

## Wave 1: {{theme}}

- [ ] T-1: [type:{{type}}] {{title}}
  - **refs**: DS-{{id}}
  - **files**: {{paths}}
  - **spec_ref**: specs/{{domain}}/spec.md
  - **acceptance**: {{criteria}}
  {{if behavior}}
  - ***RED test***:
    ```
    GIVEN {{precondition}}
    WHEN {{trigger}}
    THEN {{expected}}
    ```
  {{/if}}

## Implementation Verification
- [ ] tsc --noEmit passes
- [ ] vitest run all pass
```

Wave 数量不限，每个 Wave 有主题名。

PEG grammar:
```peg
Task = "## Wave " id ":" title EOL task+
task = "- [" checkbox "] T-" id ": [type:" typeName "]" title fields
fields = refsLine filesLine acceptanceLine (specRefLine)? (redtestSect)?
refsLine = indent "- **refs**: DS-" id
typeName = "behavior" / "config" / "refactor" / "docs" / "scaffolding"
```

4 维校验：
- **FORM**: PEG parse
- **FILL**: 每个 task 有标题、files、acceptance，无 `{{placeholder}}`
- **ENUM**: type 值在枚举中
- **REFS**: 每个 task 的 refs: DS-N 在 design.md Design Items 中存在；type:behavior 必须有 spec_ref
- **COMPLETE**: 所有 DS-N 至少被一个 T 引用（无孤儿 DS）

### 3.6 spec-review.md（格式不变，加 PEG）

```markdown
# Spec Review: {{change-name}}

## Overall: {{verdict}}
<!-- PASS / FAIL / NEEDS_REVISION -->

## Constraint Checklist
| # | Constraint | Location | Status | Evidence |
|---|-----------|----------|--------|----------|
| R1 | {{constraint}} | {{file:line}} | PASS / FAIL / N/A | {{note}} |

## Issues
- [R1/Q1/G1/D1] {{description}} (xref R1)
```

PEG: 校验 severity 枚举、issue prefix 枚举、表格列数。

### 3.7 quality-review.md（格式不变，加 PEG）

PEG: 校验 BLOCKER/MAJOR/MINOR/INFO 枚举、表格列数。

### 3.8 goal-review.md（格式不变，加 PEG）

PEG: 校验 ACHIEVED/PARTIAL/NOT_ACHIEVED 枚举。

### 3.9 review-task.md

```markdown
# Fix Tasks: {{change-name}}

## Wave 1: Critical Fixes

- [ ] FT-1: [type:{{type}}] {{fix title}}
  - **files**: {{paths}}
  - **review_ref**: R{{id}} / Q{{id}} / G{{id}} / D{{id}}
  - **acceptance**: {{criteria}}
```

PEG: 复用 tasks.peggy，增加 `reviewRefLine`。

### 3.10 uat.md

```markdown
# UAT: {{change-name}}
Status: TESTING

## UT-1: {{test-title}}
- Steps: 1. {{step}} 2. {{step}} 3. {{step}}
- Expected: {{expected behavior}}
- Actual: {{filled during test}}
- Verdict: PASS / FAIL / SKIP
```

PEG: 校验 status 枚举、verdict 枚举、steps 格式。

### 3.11 verification.md（格式收紧）

```markdown
# Verification: {{change-name}}

## Status: passed
<!-- passed / gaps_found / human_needed -->

## Results
- [x] tsc --noEmit passes
- [x] vitest run all pass
- [x] Each wave acceptance confirmed
```

PEG: 校验 status 枚举、checkbox 格式。

### 3.12 roadmap.md

```markdown
# Roadmap: {{project-name}}

## Md-1: {{title}} [ACTIVE]
### Ph-1.1: Foundation [COMPLETED]
### Ph-1.2: CLI Commands [ACTIVE]

## Md-2: {{title}} [NOT_STARTED]
### Ph-2.1: User Management [NOT_STARTED]
```

状态枚举：`[NOT_STARTED]` / `[ACTIVE]` / `[COMPLETED]`

PEG:
```peg
Milestone = "## Md-" id ":" title "[" mstatus "]" EOL phase+
phase     = "### Ph-" id ":" title "[" pstatus "]" EOL
mstatus   = "NOT_STARTED" / "ACTIVE" / "COMPLETED"
pstatus   = "NOT_STARTED" / "ACTIVE" / "COMPLETED"
```

---

## 4. 推进检查矩阵

`bp continue` / `bp archive` / `bp milestone` 在各步骤自动调用 `parseAndValidate()`。

### 4.1 Check A: planning → applying

触发：`bp continue change <name>`（状态从 planning 推进到 applying）

```
1. parseAndValidate(proposal.md)    — FORM + FILL + REFS(FR/D)
2. parseAndValidate(design.md)      — FORM + FILL + REFS(PR)
3. parseAndValidate(tasks.md)       — FORM + FILL + REFS(DS) + ENUM(type) + behavior→spec_ref
4. checkCoverage PR→DS              — 所有 PR 至少被一个 DS 引用
5. checkCoverage DS→T               — 所有 DS 至少被一个 T 引用
```

错误示例：
```
✗ proposal.md parse error (line 12): expected "refs:" after PR title
✗ PR-3 未被任何 Design Item 引用
✗ DS-2 未被任何 Task 引用
✗ T-2: behavior type missing spec_ref
```

### 4.2 Check B: reviewing 推进

触发：`bp continue change <name>`（reviewing 状态），review 结论为 archive/reapply/replan 前

在已有 3 review 文件格式验证之外，增加：

```
1. checkCoverage PR→DS  (同 Check A)
2. checkCoverage DS→T   (同 Check A)
3. 如有孤儿 → 追加到 Issues，review 结论改为 NEEDS_REVISION
```

### 4.3 Check C: change 归档

触发：`bp archive <change>` / `bp continue change <name>`（archiving→archived）

```
1. parseAndValidate(verification.md)  — FORM + FILL + ENUM(status)
2. tasks.md 所有 T 项 [x]
3. 更新 roadmap.md: 当前 phase [ACTIVE] → [COMPLETED]
```

### 4.4 Check D: phase 完成

触发：`bp stage phase <id>` / `bp continue` phase→ship

```
1. 读取 phase context.md → 提取 D-1, D-2...
2. 遍历 phase 下所有已归档 change:
   - 读取 proposal.md → 提取该 change 引用的 D-N
   - 读取 tasks.md → 提取所有 T 项 [x] 状态
3. 对每个 D-N:
   - 收集所有引用了该 D 的 T 项
   - 检查这些 T 是否全部 [x]
   - 存在未完成 → phase 不能 ship
```

错误示例：
```
✗ D-1（use JWT）尚未完成：change-a 的 T-3 未标记 [x]
✗ D-2（password hashing）尚未完成：change-b 的 T-1 未标记 [x]
```

### 4.5 Adhoc 绕过

| 检查项 | adhoc 行为 |
|--------|-----------|
| proposal.md REFS(FR/D) | 跳过（但 FR 在 requirements.md 中存在仍会报 warning） |
| design.md REFS(PR) | 只检查 PR 编号在当前 change proposal 中存在，不检查 FR/D |
| tasks.md REFS(DS) | 不跳过 |
| checkCoverage | 不跳过 |
| tasks.md behavior→spec_ref | 不跳过 |

---

## 5. 数据结构（类型定义）

```typescript
// 解析结果类型 — 每个 PEG parse 返回以下之一

interface ParsedProposal {
  name: string;
  deliverables: Array<{
    id: string;        // "PR-1"
    title: string;
    refs: string[];    // ["FR-1", "D-1"]
    description: string;
  }>;
}

interface ParsedDesign {
  name: string;
  items: Array<{
    id: string;        // "DS-1"
    title: string;
    refs: string[];    // ["PR-1", "PR-2"]
    description: string;
  }>;
}

interface ParsedTask {
  id: string;          // "T-1"
  type: 'behavior' | 'config' | 'refactor' | 'docs' | 'scaffolding';
  title: string;
  refs: string;        // "DS-1"
  spec_ref?: string;
  files: string;
  checked: boolean;    // [x] or [ ]
}

// 校验结果
interface ValidationResult {
  valid: boolean;
  errors: string[];     // 行号+描述
  ast?: ParsedProposal | ParsedDesign | ParsedTask[];
}
```

---

## 6. 文件改动清单

### 6.1 新增文件

| 路径 | 内容 |
|------|------|
| `src/core/validate/grammar/proposal.peggy` | proposal.md PEG grammar |
| `src/core/validate/grammar/design.peggy` | design.md PEG grammar |
| `src/core/validate/grammar/tasks.peggy` | tasks.md PEG grammar |
| `src/core/validate/grammar/requirements.peggy` | requirements.md PEG grammar |
| `src/core/validate/grammar/context.peggy` | context.md PEG grammar |
| `src/core/validate/grammar/spec-review.peggy` | spec-review.md PEG grammar |
| `src/core/validate/grammar/quality-review.peggy` | quality-review.md PEG grammar |
| `src/core/validate/grammar/goal-review.peggy` | goal-review.md PEG grammar |
| `src/core/validate/grammar/review-task.peggy` | review-task.md PEG grammar |
| `src/core/validate/grammar/uat.peggy` | uat.md PEG grammar |
| `src/core/validate/grammar/verification.peggy` | verification.md PEG grammar |
| `src/core/validate/grammar/roadmap.peggy` | roadmap.md PEG grammar |
| `src/core/validate/index.ts` | `parseAndValidate()`, `checkCoverage()`, `checkPhaseCompletion()` |

### 6.2 修改文件

| 文件 | 改动 |
|------|------|
| `src/templates/artifacts/index.ts` | PROPOSAL, DESIGN, TASKS, REQUIREMENTS, CONTEXT, VERIFICATION, UAT, ROADMAP 模板按 3 节格式更新 |
| `src/templates/workflows/proposal.ts` | Step 3 增加 FR/D 引用填写指导 |
| `src/templates/workflows/plan.ts` | 轻量模式增加 DS-N 分解 + refs 指导 |
| `src/templates/agents/index.ts` PLANNER_PROMPT | Step 2: 设计分解为 DS 项 + refs PR-N；Step 3: task refs DS-N |
| `src/templates/agents/index.ts` REVIEWER_PROMPT | 增加引用链完整性检查 |
| `src/templates/workflows/review.ts` | Step 3-4 增加 PR→DS→T 全覆盖检查 |
| `src/core/state-validator.ts` | planning 改用 PEG 校验；archiving 改用 PEG 校验 |
| `src/commands/bp-continue.ts` | planning→applying 前调用 `checkCoverage()` |
| `src/commands/bp-archive.ts` | 末尾追加 roadmap 自动打标 + change-complete 检查 |
| `src/core/file-tree.ts`(或新增) | `checkPhaseCompletion()` 供 phase→ship 使用 |
| `package.json` | 添加 `peggy` 依赖 |
| `tsup.config.ts` | 添加 peggy build 步骤（grammar→JS） |

### 6.3 Prompt 更新详情

**proposal.ts Step 3 新增：**
```
- 从 requirements.md 和 context.md 中提取 FR/NFR/D 编号
- 每个 PR 项独立编写 refs，指向具体哪个需求、哪个决策
- Adhoc change: 可以不写 refs，但 PR 项必须有
```

**plan.ts 轻量模式新增：**
```
**If LIGHTWEIGHT:**
1. Run `bp template design`, fill Design Items:
   - 从 proposal.md 提取 PR-N 列表
   - 分解为 DS-1, DS-2...，每项 refs: PR-N
2. Write Architecture section
3. Run `bp template tasks`, each task has refs: DS-N
```

**PLANNER_PROMPT Step 2 重写：**
```
### Step 2: Design technical solution

Run `bp template design`. Fill the template:

1. Read proposal.md → extract PR-1, PR-2 from ## Deliverables
   Note each PR's title and description to understand scope
2. Decompose the solution into design items:
   - Each item = a module, component, or logical concern
   - Assign DS-1, DS-2, DS-3... sequentially
   - For each DS item, add `refs: PR-{id}, PR-{id}` showing which deliverables it implements
   - Write a concise description of the component's responsibilities and interfaces
3. Every PR must be referenced by at least one DS item — no orphan PRs
4. Write Architecture section (diagram, data flow)
5. Compare at least 2 alternatives in the Alternatives section
```

**PLANNER_PROMPT Step 3 重写 refs 部分：**
```
3. For each task:
   - Assign T-1, T-2... sequentially
   - **refs (required)**: DS-N — which design item this task implements
     Every DS must be referenced by at least one task — no orphan DS items
   - **spec_ref (required for behavior)**: the delta-spec domain
   - **files (required)**: full relative paths
```

---

## 7. 实施顺序

| Step | 内容 | 文件数 | 前置 |
|------|------|--------|------|
| 1 | 安装 peggy + build 集成（tsup 编译 grammar） | 2 | 无 |
| 2 | 写 `src/core/validate/index.ts` 框架 | 1 | Step 1 |
| 3 | requirements grammar + 模板 | 2 | Step 2 |
| 4 | context grammar + 模板 | 2 | Step 2 |
| 5 | proposal grammar + 模板 + REFS(FR/D)校验 | 2 | Step 3, 4 |
| 6 | design grammar + 模板 + REFS(PR)校验 + checkCoverage | 2 | Step 5 |
| 7 | tasks grammar + 模板 + REFS(DS)校验 + checkCoverage | 2 | Step 6 |
| 8 | review-task grammar + 模板 | 2 | Step 7 |
| 9 | uat grammar + 模板 | 2 | Step 2 |
| 10 | verification grammar + 模板 | 2 | Step 2 |
| 11 | spec-review / quality-review / goal-review grammar | 3 | Step 2 |
| 12 | roadmap grammar + 模板 + archive 自动打标 | 2 | Step 2 |
| 13 | 集成到 `state-validator.ts`（替换现有校验） | 1 | Step 5-12 |
| 14 | 集成到 `bp-continue.ts`（planning checkCoverage） | 1 | Step 13 |
| 15 | 集成到 `bp-archive.ts`（roadmap 打标） | 1 | Step 12 |
| 16 | `checkPhaseCompletion()` + phase→ship 集成 | 1 | Step 7 |
| 17 | 更新 proposal.ts 指导 | 1 | Step 5 |
| 18 | 更新 plan.ts 轻量模式指导 | 1 | Step 6 |
| 19 | 重写 PLANNER_PROMPT Step 2-3 | 1 | Step 6, 7 |
| 20 | 更新 REVIEWER_PROMPT 引用链检查 | 1 | Step 6, 7 |
| 21 | 更新 review.ts Step 3-4 引用链检查 | 1 | Step 6, 7 |
| 22 | 全量测试 + snapshot 更新 | — | Step 3-21 |

---

## 8. 检查总表（速查）

| 推进 | 文件 | FORM | FILL | ENUM | REFS | COVERAGE |
|------|------|------|------|------|------|----------|
| proposal→planning | proposal.md | ✓ | ✓ | — | FR/D 存在 | — |
| planning→applying | design.md | ✓ | ✓ | — | PR 存在 | PR→DS ✓ |
| planning→applying | tasks.md | ✓ | ✓ | type | DS 存在 | DS→T ✓ |
| reviewing→archive | spec-review | ✓ | ✓ | severity | — | PR→DS + DS→T |
| reviewing→archive | quality-review | ✓ | ✓ | severity | — | (同上) |
| reviewing→archive | goal-review | ✓ | ✓ | status | — | (同上) |
| archiving→archived | verification | ✓ | ✓ | status | — | — |
| archiving | tasks.md | — | — | — | — | 所有 T [x] |
| archiving | roadmap | ✓ | ✓ | status | — | 自动打标 |
| phase→ship | 各 change tasks | — | — | — | — | 每个 D 关联 T [x] |

---

## 9. 错误信息示例

```
$ bp continue change add-auth
✗ 推进阻断：planning → applying

proposal.md:
  ✓ FORM 解析通过
  ✓ FILL 非模板
  ✓ REFS: FR-1, D-1 存在
  ✗ REFS: FR-99 在 requirements.md 中不存在

design.md:
  ✓ FORM 解析通过
  ✓ FILL 非模板
  ✓ REFS: PR-1, PR-2 在 proposal 中存在
  ✗ COVERAGE: PR-3 未被任何 Design Item 引用

tasks.md:
  ✓ FORM 解析通过
  ✓ FILL 非模板
  ✓ ENUM: type 值正确
  ✗ REFS: DS-2 在 design.md 中不存在
  ✗ COVERAGE: DS-3 未被任何 Task 引用
  ✗ T-2: behavior 类型缺少 spec_ref

--------------------------------------------------------
5 errors found. 修复后重新运行 `bp continue change add-auth`
```

```
$ bp stage phase ph.1
✗ phase 完成条件未满足

D-1（use JWT）:
  ✓ change-a T-3 [x]
  ✗ change-b T-1 [ ]  ← 未标记完成

D-2（password hashing）:
  ✓ change-a T-5 [x]

--------------------------------------------------------
1 个决策项有未完成任务。完成后再 ship phase。
```
