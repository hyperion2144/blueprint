# v0.4.0 — 任务流修复、Ship 增强、Audit/UAT、死代码清理

> 2026-07-01

修复 E2E 测试发现的 5 个模板问题，增强 ship 命令，新增 audit/UAT 功能，精简 prompt。

### 任务流修复 (P1-P4)

- **plan.ts**: plan 阶段不再标记 task 为 done（留 UNCHECKED 给 apply）；FULL change 强制 dispatch planner 子代理
- **apply.ts**: LIGHTWEIGHT 改为逐 task 实现→验证→mark；FULL change 强制 dispatch executor 子代理；修复 Step 编号重复
- **review.ts**: spec-review 增加空 spec 模板检测
- **agents/index.ts**: reviewer agent spec-review 第一步检测空 spec，发现即 FAIL
- **roadmap.ts**: Phase count 下限从 3 降为 1（小型项目 1-4 phases）

### Ship 增强

- `bp ship --dry-run`: 校验 changeSummary/verification/review 全部 PASS 后才能 ship
- Richer `summary.md`: verification matrix 表 + 完整 change summaries + review verdicts
- Auto git commit（`--skip-commit` 跳过）
- `findNextPhase` 限定当前 milestone 作用域

### 新增：Audit/UAT

- `bp audit change/phase/milestone`: 生成 uat.md skeleton
- `/bp-audit` slash command: agent 读 artifacts → 写真实 UAT 测试
- 交互式 UAT session：逐测试提问 → 自动推断 severity → Gaps → adhoc change
- UAT 模板（`bp template uat`）
- 17 slash commands（+1 audit）

### Prompt 精简

- `ORCHESTRATOR_RULE` 共享常量：5 个 template 去重
- Guardrails caveman 化压缩 30-50%

### 死代码清理

- 删除 `src/generators/omp-commands.ts`（僵尸副本，零引用）

### E2E 测试资产

- `tests/e2e/SKILL.md`: E2E 测试技能文档
- `tests/e2e/TEST-GOAL.md`: 测试目标与执行协议
- `tests/e2e/scripts/rpc-driver.py`: RPC 驱动脚本

### 验证

- tsc --noEmit: 0 errors
- vitest: 79/79 tests passed
- bp ship --dry-run / bp audit change/phase: fixture 验证通过

---

# v0.2.1 — 状态校验与输出增强

> 2026-06-29

前置校验、continue 输出增强、里程碑状态机修复。

### 新增

- 状态转移前置校验（state-validator）
- continue 输出增加步骤描述、产出物列表、command 文件参考

### 修复

- 里程碑流程修正
- Adhoc change 状态机完整路径
- archive 命令同时更新 state.adhoc
- continue 支持 change 子命令
- saveState 保留现有 body
- 模板内容充实

### CI

- GitHub Actions npm 自动发布

---

# v0.2.0 — v1 修复

> 2026-06-29

### Bug 修复

- saveState 保留现有 body
- archive 同时检查 state.adhoc
- continue change <name> 子命令
- 模板内容充实

### CI

- GitHub Actions npm 自动发布

### 验证

- tsc --noEmit: 0 errors
- vitest: 79/79 tests passed
