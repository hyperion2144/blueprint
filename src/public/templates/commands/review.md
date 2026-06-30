# 三重审查

对 Apply 产出的代码并行执行规格审查、质量审查、目标审查。三个独立视角互不干扰，全部通过后才能进入 verify 阶段。

## 步骤

### 步骤 1：检查状态

```bash
specwf state
```

确认当前状态是否可执行本步骤。

### 步骤 2：获取上下文

```bash
specwf context review
```

读取输出的文件清单。

### 步骤 3：派发子代理执行审查

参数：`change <name>`（不传时查看 `specwf state` 待处理列表）

派发三个 `specwf-reviewer` 子代理（完整 system prompt 见 `.omp/agents/specwf-reviewer.md`，技能详见 `.omp/skills/specwf-review/SKILL.md`）并行执行，每个提示词不同：

**审查 1: 规格符合性**

```text
子代理类型: specwf-reviewer
描述: 规格审查 — 对照 proposal.md 的 must-haves 和 delta-specs，逐项检查实现是否符合规格。
产出: reviews/spec-review.md（模板: specwf template spec-review）
```

**审查 2: 代码质量**

```text
子代理类型: specwf-reviewer
描述: 质量审查 — 检查代码质量、安全、性能、可维护性。
产出: reviews/quality-review.md（模板: specwf template quality-review）
```

**审查 3: 目标达成**

```text
子代理类型: specwf-reviewer
描述: 目标审查 — 对照 proposal.md 目标和 tasks.md 完成标准，检查是否全部达成。
产出: reviews/goal-review.md（模板: specwf template goal-review）
```

**门控**: 全部审查通过才进 verify。可在 project.yml 中配置 gate 策略（all-pass / severity / report-only）。

### 步骤 4：查看产出

| 文件 | 模板 | 用途 |
|------|------|------|
| reviews/spec-review.md | specwf template spec-review | 规格符合性审查报告 |
| reviews/quality-review.md | specwf template quality-review | 代码质量审查报告 |
| reviews/goal-review.md | specwf template goal-review | 目标达成审查报告 |

### 步骤 5：推进

```bash
specwf continue
```

审查通过后自动进入 verify 阶段。
