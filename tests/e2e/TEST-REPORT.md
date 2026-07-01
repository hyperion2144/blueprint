# TEST-REPORT: Blueprint E2E 测试

> 测试日期: 2026-07-01
> 测试项目: 推箱子 (Sokoban) — Web/Canvas/TypeScript 纯前端
> OMP 版本: v16.2.12
> BP 版本: v0.3.0
> 测试 Driver: specworkflow agent (本会话)
> SUT: OMP RPC session (MiniMax M3)

---

## 1. 全链路步进表

| 步骤 | 命令 | Verdict | 取证路径 | 说明 |
|------|------|---------|---------|------|
| 01 | `/bp-init` | **PASS** | `.omp.run/fixture-1/01-init/` | bp/ 目录完整 (10+ 文件)，state.md frontmatter 合规，16c/7a/16s 生成 |
| 02 | `/bp-grill` | **PASS** | `.omp.run/fixture-1/02-grill/` ~ `02-grill-q4/` | requirements.md 6.9KB，覆盖 FR-1~7 + NFR-1~6 + 13 constraints + 15 success criteria。14 个决策全部记录，无遗留 TODO |
| 03 | `/bp-research` | **PASS** | `.omp.run/fixture-1/02-grill-final/` | research/ 产出 stack(22KB)/architecture(21KB)/pitfalls(21KB)/summary(11KB)。3 子代理并行，无 TODO |
| 04 | `/bp-roadmap` | **PASS** | `.omp.run/fixture-1/03-roadmap/` | MVP 模式，3M×10P。roadmap.md 完整，milestones 目录已创建 |
| 05 | `/bp-discuss` | **PASS** | `.omp.run/fixture-1/04-discuss/` | context.md + research.md 落在 phase 目录。express path 跳过讨论。split 产出 4 changes (DAG 正确) |
| 06 | change 执行 | **PASS** | `.omp.run/fixture-1/05-continue-changes/` | ph.1 四 change 全链路 (plan→apply→review→verify→archive→ship)。代码可编译，8 test files / 28 tests pass |
| 07 | `/bp-ship` | **PASS** | (自动) | ph.1-foundation shipped。ph.2-core-engine 80% 完成 (types-and-helpers + move-and-history archived，reducer planning) |

**当前状态**: ph.2-core-engine 最后 change (reducer) 在 planning 步骤。
**证据汇总**: `.omp.run/fixture-1/` 下每步有 events.jsonl / reply.json / state.md / diff.patch / bp-files.txt / verdict.md。

---

## 2. 修复清单

| # | 根因层 | 严重度 | 描述 | 修复 | 状态 |
|---|--------|--------|------|------|------|
| P1 | TEMPLATE | MAJOR | `apply.ts:32` "Mark all tasks as checked" → agent 在 applying 阶段开始时一次性全部标记，而非逐个 task 执行完再 mark | 改为 "Mark each task after implementation verified; then append ## Completion" | 待修 |
| P2 | PROMPT | MAJOR | type:behavior change (smoke-test) 未 dispatch executor 子代理。3 个 behavior task 在同一 commit (ba7ae2b) 由主 agent 直接完成 | apply.ts 中 "If FULL — dispatch executor" 指令需强化，可能需要前置检查 gate | 待修 |
| P3 | ENGINE | MAJOR | 所有 4 个 changes 的 delta-spec (spec.md) 均为空模板 (12 行，`<name>`/`<behavior>` 占位符)。无法从 spec 回读指导独立开发 | bp-plan 或生成 spec 的流程需强制填充 delta-spec；或 archive 时校验 spec 非空 | 待修 |
| P4 | PROMPT | MAJOR | spec-review 未检测空 spec — 检查 proposal.md must-haves 但忽略了 spec.md 本身是空模板。导致 review 全部 PASS 但规格缺失 | spec-review 模板增加 "Verify spec.md contains at least one non-template SHALL/MUST" 检查项 | 待修 |
| P5 | TEMPLATE | HIGH | bp-roadmap 模板强制 milestone-phase 嵌套 + "3-5 phases per milestone" 约束，导致推箱子被拆分为 3M×10P（对比 gsd-core 只需 3-5P 直接完成） | 增加 "simple mode" (无 milestone) 或降低小型项目的 phase count 约束到 2-3 | 待修 |
| P6 | PROMPT | LOW | `setWidget autoresearch` extension UI 每步未处理（不影响功能） | RPC driver 增加 setWidget 的 silent-accept | 待修 |

**修复循环**: 无（本次测试为观察/判读，未执行修复）。

---

## 3. 质量审查

### 3.1 代码质量

| 维度 | 状态 | 证据 |
|------|------|------|
| 编译 | ✅ PASS | `tsc --noEmit` 通过 (8 test files, 28 tests) |
| 测试 | ✅ PASS | Vitest `Test Files 8 passed, Tests 28 passed` |
| TypeScript 严格 | ✅ PASS | strict + noUncheckedIndexedAccess + noImplicitOverride + verbatimModuleSyntax |
| 架构 | ✅ PASS | reducer + thin shell (pure core/ 无 DOM 导入) |
| `any` 滥用 | ⚠️ 未检查 | 未做 AST 级别审计 |
| Convention 遵守 | ✅ PASS | .test.ts 命名，ESM，conventional commits |

### 3.2 文档质量 — specs 回读测试

**抽样**: smoke-test change (type:behavior)

| 产物 | 状态 | 说明 |
|------|------|------|
| design.md | ✅ 完整 | 105 行，Context、Technical Approach、Risks 表格 |
| spec.md | ❌ **空模板** | 12 行全是 `<name>` / `<behavior>` 占位符 |
| proposal.md | ✅ 完整 | Must-have 列表清楚 |
| tasks.md | ✅ 完整 | 含 RED test 规格 (GIVEN/WHEN/THEN) |
| spec-review.md | ⚠️ 误报 PASS | 未检测 spec.md 空模板 |
| quality-review.md | ✅ PASS | 无问题发现 |
| goal-review.md | ✅ PASS | goal-backward 分析详细 |
| verification.md | ✅ PASS | 验证命令记录完整 |

**回读测试结论**: **FAIL** — 独立开发者无法从 spec.md 推断需求（空模板），但可以从 design.md + proposal.md + tasks.md 推断。spec.md 是规格文档的核心缺失。

### 3.3 选题理由验证 ✅

推箱子 = 规则引擎 (reducer/move/winCheck) + 可视化渲染 (Canvas renderer) + 关卡数据 (JSON loader) + 状态管理 (history/undo)。这几个子能力对应 BP 全链路的不同验证维度：
- 规则引擎 → type:behavior change，TDD RED→GREEN→REFACTOR
- 可视化渲染 → scaffolding change，组件集成
- 关卡数据 → config + behavior 混合
- 状态管理 → behavior change，state machine

---

## 4. Token 分析

| 步骤 | Input | Output | CacheRead | CacheWrite | 累计 Input |
|------|-------|--------|-----------|------------|-----------|
| 01-init | 52,732 | 2,211 | 457,472 | 0 | 52,732 |
| 02-grill-q1 | 1,069 | 2,756 | 165,888 | 0 | 53,801 |
| 02-grill-q2 | 450 | 913 | 113,920 | 0 | 54,251 |
| 02-grill-q3 | 1,367 | 2,206 | 116,096 | 0 | 55,618 |
| 02-grill-q4 | 3,859 | 2,252 | 183,040 | 0 | 59,477 |
| 02-grill-final | 27,504 | 7,083 | 1,072,896 | 0 | 86,981 |
| 03-roadmap | 8,879 | 8,597 | 712,064 | 0 | 95,860 |
| 05-continue-changes | 6,996 | 7,796 | 2,713,472 | 0 | 102,856 |
| **总计 (已统计)** | **~103k** | **~34k** | **~5.5M** | **0** | — |

> 注：部分中间步骤超时未采集完整 token 数据。CacheRead 高是因为 grill/discuss 等交互步骤中上下文缓存了大量重复注入的系统 prompt 和模板内容。

**Token 效率观察**:
- **grill 交互冗余**: 4 轮 Q&A 合计 ~7k input tokens。可优化为 batch questions (如 q3 的批量模式)。
- **CacheRead 占比极高** (~95%): 说明 bp 系统 prompt + 模板大量复用了上下文，反过来说明 prompt 较"重"。
- **RPC 进程长会话**: tokens 在单进程中累计，未触发 compaction。

---

## 5. 优化方案

| # | 类别 | 描述 | 影响面 | 改动量 | Token降幅 | 建议 |
|---|------|------|--------|--------|----------|------|
| O1 | TEMPLATE | 修复 P1: 改为逐个 task 执行完 mark | apply.ts | S | 0 | **H** — 影响 task 执行正确性 |
| O2 | TEMPLATE | 修复 P2: 强化 type:behavior 必须 dispatch executor | apply.ts + executor agent | M | 0 | **H** — 影响代码质量和 TDD 合规 |
| O3 | TEMPLATE | 修复 P3: plan 阶段强制填充 delta-spec | plan.ts + spec 模板 | M | 0 | **H** — 影响规格文档可用性 |
| O4 | PROMPT | 修复 P4: spec-review 增加空 spec 检测 | review.ts | S | 0 | **H** — 影响 review 质量 |
| O5 | TEMPLATE | 修复 P5: roadmap 增加 simple mode / 降低 phase count | roadmap.ts | M | 0 | **H** — 影响项目规划合理性 |
| O6 | PROMPT | 修复 P6: 处理 setWidget | rpc-driver.py | S | 0 | **L** |
| O7 | PROMPT | grill 步骤批量提问（参考已有批量模式） | grill.ts | S | ~2k/grill | **M** — 减少交互轮次 |
| O8 | ENGINE | bp continue 在 apply 超时后自动推进（不用等 agent_end） | continue.ts | M | 0 | **M** — 当前 apply 步骤经常超时 |

---

## 6. 总结

### 通过项
- ✅ BP 全链路 (init → grill → research → roadmap → discuss → split → plan → apply → review → verify → archive → ship) 端到端可运行
- ✅ Platform 文件生成正确 (16 commands + 7 agents + 16 skills)
- ✅ State machine 状态流转正确 (initialized → grill → researched → roadmap-defined → change 循环 → phase-shipped)
- ✅ 实际代码产出可编译运行 (tsc PASS, 8 test files / 28 tests PASS)
- ✅ Change 归档流程完整 (proposal/design/tasks/spec + triple review + verification + change-summary)

### 阻塞项
- ❌ 推箱子游戏尚未达到"至少 1 关可通关"（ph.2-core-engine 的 reducer change 未完成，ph.3-first-level 未开始）
- 原因：apply 步骤 agent 执行时间超 10min 超时（reducer 在 planning），并非 BP 流程错误

### 关键发现
1. **delta-spec 空模板 (P3)** 是最严重问题 — 影响规格文档作为独立开发指导的核心价值
2. **task 标记时机 (P1)** 和 **子代理调度缺失 (P2)** 影响实现质量和 TDD 合规
3. **roadmap 过度拆分 (P5)** 需要参考 gsd-core 简化
4. BP 整体架构可行，主要问题集中在模板提示词的细节

### 下一步建议
1. 优先修复 P1-P5（TEMPLATE 层，改动量小，影响大）
2. 修复后重新跑 E2E 测试（脚本已就绪：`bin/rpc-driver.py`）
3. 增加 CI 集成：每次 PR 自动在 fixture 跑 init → grill → research → roadmap 链路
