# 修改方案 v2：Apply 批次拆分 + Review 回环修复

日期：2026-07-03
版本：v2（按 Wave 粒度派发子代理，复用现有代理 prompt）

---

## 变更一：Apply Wave 拆分主代理化

### 现状问题

当前 apply 工作流将全量 `tasks.md` 交给 executor 子代理，由子代理内部做依赖分析、派发子子代理。主代理失去对执行进度的可见性和控制。

### 目标

主代理负责：
1. 解析 `tasks.md` → 识别 Wave + 跨 Wave 依赖 → 生成执行计划
2. **每个 Wave 派发一个子代理**，子代理收到该 Wave 内全部 task
3. **Wave 间有依赖（task depends_on 跨 Wave）→ 顺序执行**
4. **Wave 间无依赖 → 并发派发**
5. 子代理内部按 depends_on 顺序实现 task，自行 commit
6. 主代理在每个 Wave 完成后执行 verify（tsc + vitest）+ 打标

### Wave 拆分逻辑

```
tasks.md:
  Wave 1: 数据模型
    task-1.1: 定义 Board 类型
    task-1.2: 定义 Move 类型
    task-1.3: 实现 Board.init()     depends_on: [task-1.1]
  Wave 2: 业务逻辑
    task-2.1: 实现 move 验证          depends_on: [task-1.3]  ← 跨 Wave 依赖
    task-2.2: 实现 game 状态机
  Wave 3: CLI 命令
    task-3.1: bp new 命令
    task-3.2: bp list 命令

跨 Wave 依赖分析:
  task-2.1 depends_on task-1.3 → Wave 2 依赖 Wave 1
  Wave 3 无跨 Wave 依赖

派发计划:
  Round 1:

    Wave 1 → 子代理 A（task-1.1, task-1.2, task-1.3）

  Round 2（等 Wave 1 完成，Wave 2 和 Wave 3 无相互依赖可并发）:

    Wave 2 → 子代理 B（task-2.1, task-2.2）
    Wave 3 → 子代理 C（task-3.1, task-3.2）
```

**规则**：
- 一个 Wave = 一个子代理，收到该 Wave 全部 task
- 子代理按 depends_on 顺序实现，每 task 完成后 `bp commit --task <id>`
- 主代理在每个 Wave 子代理完成后：`tsc --noEmit` + `vitest run` → 打标 `[x]`
- 跨 Wave 有依赖 → 顺序；无依赖 → 并发

### 数据流

```
main agent
  ├→ parse tasks.md → waves + inter-wave dep graph
  ├→ Round 1: dispatch Wave 1 sub-agent
  ├→ verify + mark [x] + commit
  ├→ Round 2: dispatch Wave 2 + Wave 3 sub-agents (concurrent)
  ├→ verify + mark [x] + commit
  └→ final verify + change-summary.md
```

---

## 变更二：Review 回环 — 新增独立修复阶段

### 现状问题

```
当前 STATE_TRANSITIONS:
  change-reviewing → replan → change-planning   ← 回到原始 plan 状态
  change-reviewing → reapply → change-applying   ← 回到原始 apply 状态

问题：
1. 回到原始状态后，plan/apply 执行的是原始 tasks.md/design.md，而非修复内容
2. 没有地方写修复任务和修复结果
3. 修复后重新 review 没有机制
4. 无法区分"首次 review"和"修复后 review"
```

### 目标

引入两个**全新状态**和独立的修复步骤：

```
                            ┌─────────────────────┐
                            │  change-reviewing    │
                            └──────┬──────┬───────┘
                     replan │      │      │ reapply
                            ▼      │      ▼
              ┌─────────────────┐  │  ┌─────────────────┐
              │change-fix-planning│  │  │change-fix-applying│
              └────────┬────────┘  │  └────────┬────────┘
                  apply-fix │      │   review-fix │
                            ▼      │      │       │
              ┌─────────────────┐  │      ▼       │
              │change-fix-applying│◄─┘  ┌──────────┴──────┐
              └────────┬────────┘      │  change-reviewing │ (--fix)
                       └──────────────→│  原地更新原 review │
                                       └──────────────────┘
```

**删除旧回环**：
```
change-reviewing → replan → change-planning   ✗
change-reviewing → reapply → change-applying   ✗
change-reviewing → fix → change-applying        ✗
```

**新增转移**：
```typescript
// 从 review 进入修复阶段
{ from: 'change-reviewing', command: 'replan', to: 'change-fix-planning', slashCommand: '/bp:fix-plan', subagent: true },
{ from: 'change-reviewing', command: 'reapply', to: 'change-fix-applying', slashCommand: '/bp:fix-apply', subagent: true },

// 修复阶段间流转
{ from: 'change-fix-planning', command: 'apply-fix', to: 'change-fix-applying', slashCommand: '/bp:fix-apply', subagent: true },
{ from: 'change-fix-applying', command: 'review-fix', to: 'change-reviewing', slashCommand: '/bp:review', subagent: true },
```

### fix-plan（计划修复）

**入口**：review 发现设计/架构级 BLOCKER → `bp continue change <name> --command replan`

**步骤**（参考 plan，来源改为 review 结果）：
1. 读取 spec-review.md / quality-review.md / goal-review.md 中的 BLOCKER/FLAG 项
2. 派发 **planner 子代理（fix 模式）**：
   - 子代理读取三个 review 文件
   - 写 `review-design.md`（模板 = design.md）
   - 写 `review-task.md`（模板 = tasks.md，Wave 1 = BLOCKER 修复，Wave 2 = FLAG 修复）
3. 主代理验证产出 → commit + advance → `change-fix-applying`

**命令**：`/bp:fix-plan`

### fix-apply（执行修复）

**入口**：review 发现代码级 BLOCKER → `bp continue change <name> --command reapply`，或 fix-plan 完成

**步骤**（同 apply Wave 拆分逻辑，来源改为 review-task.md）：
1. 主代理解析 review-task.md → Wave + 跨 Wave 依赖
2. 按 Wave 派发 **executor 子代理（fix 模式）**（每 Wave 一个）
3. Wave 间有依赖顺序、无依赖并发
4. 主代理 verify（tsc + vitest）+ 打标
5. commit + advance → `change-reviewing`（带 `--fix`）

**命令**：`/bp:fix-apply`

### review-fix（修复后重新 review）

**入口**：fix-apply 完成后 `bp continue change <name>`（自动带 `--fix`）

**步骤**：
1. 读取原有三个 review 文件 + review-task.md
2. **不创建新文件**，在原文件原地更新：
   - 每个已修复的 finding → 追加 `**✅ 已修复**` 标记
   - 对修复代码进行新一轮审查
   - 新问题 → 追加新 finding（编号顺延），状态 BLOCKER/FLAG/NOTE
3. 汇总：仍有 BLOCKER → 继续回环，无 BLOCKER → advance → archive

### review --fix 参数

#### `src/commands/bp-continue.ts`

`bp continue change <name>` 从 `change-fix-applying` 推进时自动带 `--fix`。

`formatContinueResult` 当推进到 review 且来源为 fix-applying 时输出 `fix: true`。

#### `src/templates/workflows/review.ts`

当 `fix: true` 时：
- 不按原流程创建新 review 文件
- 改为"读取原有 review 文件 → 标记已修复 → 追加新发现 → 原地写回"

### 数据流

```
review 发现 BLOCKERs
  │
  ├─ replan (设计问题) → change-fix-planning
  │   ├→ 读 review 结果 → dispatch planner (fix 模式)
  │   │   └→ 写 review-design.md + review-task.md
  │   └→ advance → change-fix-applying
  │        ├→ Wave 分析 review-task.md → dispatch executor (fix 模式)
  │        ├→ verify + 打标
  │        └→ advance → change-reviewing (--fix)
  │             ├→ 原地更新 review 文件（标记已修复 + 追加新发现）
  │             ├→ 仍有 BLOCKER? → 继续回环
  │             └→ 无 → advance → archive
  │
  └─ reapply (代码问题) → change-fix-applying
       └→ (同上 fix-apply → review-fix 流程)
```

---

## 代理 Prompt 修改

**不创建新代理类型**。fix-plan 和 fix-apply 复用现有 `bp-planner` 和 `bp-executor`，在其 prompt 中增加条件分支（Step 0 模式判断）。

### executor prompt (`src/templates/agents/index.ts`)

**删除**：Step 2a（Parse dependencies）、Step 2b（Execute in dependency batches）——不再由 executor 内部做批次拆分和子子代理派发。

**新增** Step 0 模式判断：

```markdown
### Step 0: Determine execution mode

**Normal mode** (tasks.md): You receive ONE wave of tasks.
- Implement all tasks in dependency order within this wave
- Commit each task: bp commit --task <id> --tasks-path ...
- Do NOT run tsc or vitest — main agent verifies
- Return when all tasks in this wave are done

**Fix mode** (review-task.md): You are fixing review findings.
- Read review-task.md — each task maps to a review finding (BLOCKER/FLAG)
- Read the three review files (spec-review.md, quality-review.md, goal-review.md)
  to understand what was wrong and what the fix should address
- Implement fixes following review-task.md wave/task structure
- Each committed task = one review finding resolved
- Commit: bp commit --task <id> --tasks-path <review-task.md path>
- Do NOT run tsc/vitest; do NOT modify the original review files
```

### planner prompt (`src/templates/agents/index.ts`)

**新增** Step 0 模式判断：

```markdown
### Step 0: Determine planning mode

**Normal mode** (proposal.md): Design from scratch.
- Read proposal.md, context.md, research.md, existing specs
- Write design.md, tasks.md, delta-specs as described below

**Fix mode** (review results): Fix design based on review findings.
- Read spec-review.md, quality-review.md, goal-review.md
- Identify ALL BLOCKER and FLAG findings
- Write review-design.md (template = design.md, title "# Fix Design: <change-name>")
  - For each BLOCKER: describe what was wrong, why the new approach fixes it
- Write review-task.md (template = tasks.md, title "# Fix Tasks: <change-name>")
  - Wave 1 = BLOCKER fixes, Wave 2 = FLAG fixes
  - Each task references the review finding it addresses
  - spec_ref points to review file + finding number
- Output: review-design.md + review-task.md (NOT design.md/tasks.md)
```

---

## 影响文件清单

| 文件 | 操作 | 内容 |
|------|------|------|
| `src/types/state.ts` | **修改** | 删除 3 条旧回环，新增 4 条新转移 |
| `src/templates/workflows/shared.ts` | **新增** | WAVE_SPLIT + REVIEW_LOOPBACK 常量 |
| `src/templates/workflows/apply.ts` | **重写** | Wave 拆分主代理化 |
| `src/templates/workflows/review.ts` | **重写** Step 2-4 | --fix 感知 + 原地更新 |
| `src/templates/workflows/fix-plan.ts` | **新建** | 计划修复工作流（参考 plan） |
| `src/templates/workflows/fix-apply.ts` | **新建** | 执行修复工作流（参考 apply） |
| `src/templates/workflows/registry.ts` | **修改** | 注册 fix-plan, fix-apply |
| `src/templates/agents/index.ts` | **修改** | planner + executor 各增加 fix 模式 Step 0 |
| `src/templates/artifacts/index.ts` | **新增** | review-design, review-tasks 模板 |
| `src/core/continue.ts` | **修改** | STEP_TO_WORKFLOW + STEP_INFO |
| `src/integrations/omp/commands.ts` | **修改** | STEP_DEFS 新增 fix-plan, fix-apply |
| `tests/` | **新增** | 回环 E2E + fix-plan/fix-apply 测试 |

---

## 验收标准

### Apply Wave 拆分
- [ ] 主代理解析 tasks.md → Wave + 跨 Wave 依赖图
- [ ] 一个 Wave 派发一个子代理（收到该 Wave 全部 task）
- [ ] Wave 间有依赖 → 顺序；无依赖 → 并发
- [ ] 子代理按 depends_on 顺序实现，自行 commit
- [ ] 主代理每 Wave 完成后 verify + 打标

### Review 回环
- [ ] replan → fix-planning，reapply → fix-applying
- [ ] fix-plan: planner (fix 模式) → review-design + review-task → fix-applying
- [ ] fix-apply: executor (fix 模式) → Wave 拆分 review-task → verify → review (--fix)
- [ ] review --fix: 原地更新原 review 文件（标记已修复 + 追加新发现）
- [ ] 仍有 BLOCKER → 继续回环；无 → archive

### 代理 Prompt
- [ ] executor prompt 删除内部批次拆分逻辑
- [ ] executor prompt 新增 fix 模式 Step 0
- [ ] planner prompt 新增 fix 模式 Step 0
- [ ] 不创建新代理类型（复用 bp-planner / bp-executor）
