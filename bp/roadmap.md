# Roadmap: blueprint

<!--
  Living document. Tracks project direction and progress.
  NOT a state machine - it doesn't gate change execution.

  Purpose:
  1. Make direction explicit (prevent drift)
  2. Track progress (count of archived changes per phase)
  3. Show what's planned next

  Updated automatically by `bp archive` (marks changes [x], increments counts).
  Updated manually by `bp roadmap` (add milestones, phases, planned changes).

  Format rules:
  - Status tags: [NOT_STARTED], [ACTIVE], [IN_PROGRESS], [COMPLETED], [SHIPPED]
  - Milestone: M{id} (e.g., M1, M2)
  - Phase: P{milestone}.{id} (e.g., P1.1, P1.2)
  - Change: listed under phase with [x] (done) or [ ] (pending)
-->

## Milestone: M1 - v2 Architecture Refactoring [ACTIVE]

**Goal**: Refactor Blueprint from v1 (state machine, 25 commands, PEG grammars) to v2 (artifact-based, 8 commands, YAML schema) while preserving engineering rigor.
**Status**: ACTIVE

### Phase: P1.1 - Core Engine [IN_PROGRESS]

- **Goal**: Rewrite core types, config, file-tree, continue engine for artifact-based progress detection
- **Spec domain**: core
- **Changes**: 1/1 completed
- **Status**: IN_PROGRESS

**Changes**:
- [x] v2-core-refactor (archived 2026-07-16)

**Next**: Phase P1.2

### Phase: P1.2 - Commands & Templates [IN_PROGRESS]

- **Goal**: Rewrite 8 commands, 7 artifact templates, 3 agent prompts, 8 workflow instructions
- **Spec domain**: templates
- **Changes**: 1/1 completed
- **Status**: IN_PROGRESS

**Changes**:
- [x] v2-commands-templates (archived 2026-07-16)

**Next**: Phase P1.3

### Phase: P1.3 - Platform Integration & Testing [NOT_STARTED]

- **Goal**: Update integrations (OMP, Claude Code, .agent), fix test suite, update docs
- **Spec domain**: platform-gen
- **Changes**: 4/4 planned
- **Status**: IN_PROGRESS

**Changes**:
- [x] v2-platform-tests (archived 2026-07-16)
- [x] bp-auto-context-injection (archived 2026-07-19)
- [x] add-claude-code-hooks (archived 2026-07-24)

**Next**: M2 planning

---

## Milestone: M2 - Polish & Extensions [PLANNED]

**Goal**: Polish v2 with custom schemas, brownfield support improvements, and community feedback integration.
**Status**: PLANNED

## Milestone: M3 - Telemetry-Driven Evolution [PLANNED]

**Goal**: From static workflow to telemetry-driven evolution. User-side collects telemetry; maintainers analyze and release evolved versions. See DESIGN-v3.md.
**Status**: PLANNED

### Phase: P3.1 - Telemetry Foundation [NOT_STARTED]

- **Goal**: Auto-collect telemetry in command handlers + anonymization + auto-report (opt-in)
- **Description**: Auto-collect .meta/ data in command handlers (plan/apply/review/archive auto-write run data); add failure mode marks + step usage stats; anonymization (hash code snippets, strip paths); auto-report if telemetry.enabled (async, non-blocking); bp telemetry status/export; config.telemetry field
- **Spec domain**: telemetry
- **Changes**: 0/2 completed
- **Status**: NOT_STARTED

**Changes**:
- [ ] telemetry-collection (proposed 2026-07-22)
  - **Goal**: 在命令处理器中自动收集运行遥测数据，为框架演进提供数据支撑
  - **What**: 在 plan/apply/review/archive 命令处理器中写入 .meta/ 运行数据；添加失败模式标记与步骤使用统计；实现匿名化（hash 代码片段、剥离路径）
  - **Deliverables**: 遥测收集模块、.meta/ 运行数据写入逻辑、匿名化处理器
  - **Outcomes**: 命令执行后自动产出匿名化遥测记录，可被导出与上报
- [ ] telemetry-export-upload (proposed 2026-07-22)
  - **Goal**: 提供遥测数据导出与可选自动上报能力（opt-in）
  - **What**: 实现 bp telemetry status/export 命令；config.telemetry 配置字段；异步非阻塞自动上报（telemetry.enabled 时）
  - **Deliverables**: bp telemetry status 命令、bp telemetry export 命令、config.telemetry 配置、异步上报模块
  - **Outcomes**: 用户可查看/导出遥测状态，opt-in 开启后自动非阻塞上报

**Next**: Phase P3.2

### Phase: P3.2 - Spec Governance [NOT_STARTED]

- **Goal**: Prevent specs/ from rotting — confidence, audit, version management
- **Description**: Auto-infer spec confidence from codebase-map exports + test files (high=has test+code, medium=code no test, low=spec only); implement bp spec audit (redundancy/staleness/coverage); add since version tags to requirements; bp spec diff
- **Spec domain**: specs
- **Changes**: 0/2 completed
- **Status**: NOT_STARTED

**Changes**:
- [ ] spec-confidence (proposed 2026-07-22)
  - **Goal**: 自动推断 spec 置信度，让维护者知道哪些 spec 有代码/测试支撑
  - **What**: 从 codebase-map 导出与测试文件自动推断置信度（high=有测试+代码，medium=有代码无测试，low=仅 spec）；为需求添加 since 版本标签
  - **Deliverables**: 置信度推断模块、since 版本标签机制、spec 置信度标注
  - **Outcomes**: 每条 spec 需求带有可计算的置信度等级与版本来源，便于审计
- [ ] spec-audit (proposed 2026-07-22)
  - **Goal**: 提供 spec 审计能力，发现冗余/过期/覆盖缺口
  - **What**: 实现 bp spec audit（冗余/过期/覆盖检测）；实现 bp spec diff
  - **Deliverables**: bp spec audit 命令、bp spec diff 命令、审计报告输出
  - **Outcomes**: 维护者可一键检测 spec 健康度并定位需更新的需求

**Next**: Phase P3.3

### Phase: P3.3 - Cross-Change Scheduling [NOT_STARTED]

- **Goal**: Support multi-change parallel development with dependency DAG
- **Description**: bp deps graph (DAG output + cycle detection); cascade change detection after archive (queryImpact + spec diff); enhanced parallel conflict detection (file + spec + module upstream/downstream via codebase-map)
- **Spec domain**: scheduling
- **Changes**: 0/2 completed
- **Status**: NOT_STARTED

**Changes**:
- [ ] deps-graph (proposed 2026-07-22)
  - **Goal**: 提供变更间依赖 DAG 可视化与环检测
  - **What**: 实现 bp deps graph 命令；输出 DAG；实现环检测
  - **Deliverables**: bp deps graph 命令、DAG 输出、环检测算法
  - **Outcomes**: 维护者可查看变更依赖关系图，并行开发前可识别循环依赖
- [ ] cascade-detection (proposed 2026-07-22)
  - **Goal**: archive 后自动检测级联影响，避免遗漏受影响的下游变更
  - **What**: 实现 queryImpact + spec diff 的级联检测；增强并行冲突检测（file + spec + module 上下游 via codebase-map）
  - **Deliverables**: 级联检测模块、queryImpact 查询、增强的冲突检测器
  - **Outcomes**: archive 一个变更后自动提示受影响的下游变更，并行开发冲突可提前预警

**Next**: Phase P3.4

### Phase: P3.4 - Uncertainty Quantification [NOT_STARTED]

- **Goal**: Match verification intensity to output confidence
- **Description**: Add Confidence field to DESIGN_TEMPLATE DS-N; update PLANNER_PROMPT to annotate confidence (high/medium/low); update review workflow to tier verification (high=auto test, medium=sub-agent review, low=triple review + human gate)
- **Spec domain**: verification
- **Changes**: 0/2 completed
- **Status**: NOT_STARTED

**Changes**:
- [ ] confidence-annotation (proposed 2026-07-22)
  - **Goal**: 让 planner 在设计阶段就标注每个组件的置信度，驱动差异化验证
  - **What**: 在 DESIGN_TEMPLATE DS-N 添加 Confidence 字段；更新 PLANNER_PROMPT 标注置信度（high/medium/low）
  - **Deliverables**: DESIGN_TEMPLATE Confidence 字段、PLANNER_PROMPT 置信度标注指引
  - **Outcomes**: 每个设计组件自带置信度等级，review 可据此分流验证强度
- [ ] tiered-verification (proposed 2026-07-22)
  - **Goal**: 根据置信度分层验证，高置信走轻量验证、低置信走严格验证
  - **What**: 更新 review 工作流分层验证（high=自动测试，medium=sub-agent review，low=triple review + human gate）
  - **Deliverables**: 分层 review 工作流、验证强度路由逻辑
  - **Outcomes**: 验证资源按风险分配，低置信变更必经人工门禁

**Next**: Phase P3.5

### Phase: P3.5 - Maintainer Analysis Tools [NOT_STARTED]

- **Goal**: Telemetry-driven framework evolution tooling
- **Description**: Telemetry aggregation tool; failure mode frequency stats; step usage rate report; bp audit workflow (prompt redundancy + step necessity + model version adaptation); complexity budget check (prompt tokens/step count/config count)
- **Spec domain**: telemetry
- **Changes**: 0/2 completed
- **Status**: NOT_STARTED

**Changes**:
- [ ] telemetry-analysis (proposed 2026-07-22)
  - **Goal**: 聚合用户侧遥测数据，输出失败模式频率与步骤使用率报告
  - **What**: 实现遥测聚合工具；失败模式频率统计；步骤使用率报告
  - **Deliverables**: 遥测聚合工具、失败模式频率统计、步骤使用率报告
  - **Outcomes**: 维护者可基于真实使用数据识别高频失败步骤与冷门步骤
- [ ] workflow-audit (proposed 2026-07-22)
  - **Goal**: 审计工作流本身的健康度，驱动框架自我演进
  - **What**: 实现 bp audit workflow（prompt 冗余 + 步骤必要性 + 模型版本适配）；复杂度预算检查（prompt tokens/步骤数/配置数）
  - **Deliverables**: bp audit workflow 命令、复杂度预算检查器、审计报告
  - **Outcomes**: 维护者可定位冗余 prompt 与可裁剪步骤，控制框架复杂度预算

**Next**: All changes completed

---

## Progress Summary

| Milestone | Phases | Changes | Status |
|-----------|--------|---------|--------|
| M1 - v2 Architecture Refactoring | 2/3 | 3/3 | ACTIVE |
| M2 - Polish & Extensions | 0/0 | 0/0 | PLANNED |
| M3 - Telemetry-Driven Evolution | 0/5 | 0/10 | PLANNED |
