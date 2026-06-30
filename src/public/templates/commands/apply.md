# 代码实现

按 tasks.md 执行代码实现。TDD 强制执行：type:behavior 任务走 RED→GREEN→REFACTOR 协议，其他类型直接实现。由 specwf-executor agent 负责执行。

## 步骤

### 步骤 1：检查状态

```bash
specwf state
```

确认当前状态是否可执行本步骤。

### 步骤 2：获取上下文

```bash
specwf context apply
```

读取设计的文件清单：
- design.md — 技术方案
- tasks.md — 实现清单（标注 type:behavior / config / refactor / docs / scaffolding）
- delta-specs — 行为契约（SHALL / MUST 约束）
- 依赖的 specs/ — 已有全局规范

### 步骤 3：派发子代理执行

参数：`change <name>`（不传时查看 `specwf state` 待处理列表）

派发 `specwf-executor` 子代理（完整 system prompt 见 `.omp/agents/specwf-executor.md`，技能详见 `.omp/skills/specwf-apply/SKILL.md`）。

提示词内容：

```text
子代理类型: specwf-executor
描述: 代码实现 — 按 tasks.md 执行，TDD RED→GREEN→REFACTOR

【项目上下文】
- 从 state.md 获取当前 change 标识
- 从 design.md 获取技术方案
- 从 tasks.md 获取任务清单
- 从 delta-specs 获取规格约束

【本次职责】
- 按 tasks.md 的 wave 顺序依次实现
- type:behavior 走 RED→GREEN→REFACTOR
- 每个 task 原子提交
- 所有 wave 完成后写 change-summary

【约束条件】
- 不跳过任何 task
- 遇到架构级变更时暂停并提问
```

按以下协议执行：

**任务分组** — 依据 tasks.md 的依赖关系分组。组内串行、组间并行。

**TDD 协议（type:behavior）** — 每个任务分三步：
- RED：写明确断言 delta-spec 行为的失败测试，提交 `test(<scope>): RED - <描述>`
- GREEN：写最小实现使测试通过，提交 `feat(<scope>): GREEN - <描述>`
- REFACTOR：改进代码质量，提交 `refactor(<scope>): REFACTOR - <描述>`

**type:config/refactor/docs/scaffolding** — 直接实现，单次提交。

**偏差处理** — 发现 bug 自动修（`[auto-fix]`），缺失代码自动补（`[auto-add]`），架构变更暂停并提问。

### 步骤 4：Wave 检查

完成每个 wave 后确认：
- [ ] wave 内所有 task 已完成
- [ ] 所有 type:behavior task 通过 RED→GREEN→REFACTOR 完整闭环
- [ ] 实现符合 delta-spec 的 SHALL / MUST 约束
- [ ] 类型检查通过（tsc --noEmit）
- [ ] 测试全部通过（vitest run）
- [ ] 每个提交是原子的，commit message 格式符合规范

### 步骤 5：产出总结

所有 wave 完成后，使用模板生成 change summary：

```bash
specwf template change-summary --name <change-name> --dir specwf/changes/<change-name>
```

### 步骤 6：推进

```bash
specwf continue
```

检查代码已提交且测试通过后，推进到 review。

### 步骤 7：查看产出

| 产出 | 说明 |
|------|------|
| 代码变更 | 按 tasks.md 实现 |
| 测试 | 与源文件同目录 *.test.ts |
| summary.md | specwf template change-summary |
