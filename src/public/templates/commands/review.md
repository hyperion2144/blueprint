# 三重审查

对 Apply 产出的代码并行执行规格审查、质量审查、目标审查。三个独立视角互不干扰，全部通过后才能进入 verify 阶段。

## 子代理

### 子代理类型
`specwf-reviewer`（完整 system prompt 见 `.omp/agents/specwf-reviewer.md`）

### 提示词结构

派发三个 reviewer 子代理并行执行，每个提示词不同：

**审查 1: 规格符合性**

```
对照 proposal.md 的 must-haves 和 delta-specs，逐项检查实现是否符合规格。
产出: reviews/spec-review.md（模板: specwf template spec-review）
```

**审查 2: 代码质量**

```
检查代码质量、安全、性能、可维护性。
产出: reviews/quality-review.md（模板: specwf template quality-review）
```

**审查 3: 目标达成**

```
对照 proposal.md 目标和 tasks.md 完成标准，检查是否全部达成。
产出: reviews/goal-review.md（模板: specwf template goal-review）
```

### 门控
全部审查通过才进 verify。

## Subagent

派发 specwf-reviewer 子代理，三重审查并行执行：
- 规格审查（spec-review.md）
- 质量审查（quality-review.md）
- 目标审查（goal-review.md）

```yaml
agent: specwf-reviewer
fan-out: 3（batch tasks[3] 并行）
  - 规格审查 → spec-review.md
  - 质量审查 → quality-review.md
  - 目标审查 → goal-review.md
```

每个 agent 读取对应的上下文文件（proposal.md、delta-specs、design.md、tasks.md），使用 grep/ast_grep 在实现代码中搜索验证，独立输出审查报告。

## 产出

| 文件 | 模板参考 | 用途 |
|------|----------|------|
| `@specwf/reviews/spec-review.md` | `specwf template spec-review` | 规格符合性审查报告 |
| `@specwf/reviews/quality-review.md` | `specwf template quality-review` | 代码质量审查报告 |
| `@specwf/reviews/goal-review.md` | `specwf template goal-review` | 目标达成审查报告 |

## 上下文检查

```bash
specwf context review
specwf state
```

确认当前阶段上下文包含：proposal.md、delta-specs、design.md、tasks.md、实现代码、测试代码。

## 门控

可在 project.yml 中配置 gate 策略：

- **all-pass（默认）** — 三份报告都 PASS 才进入 verify
- **severity** — 没有 critical/high 未修复即可进入 verify
- **report-only** — 审查结果仅供参考，不阻塞进入 verify

任一份报告 FAIL 时，记录问题清单后回 apply 阶段修复，修复后重新审查涉及的部分。

## 推进

```bash
specwf continue
```

然后根据输出的"推荐下一步"执行对应操作。

```bash
# 例: 输出 → 下一步: grill
# 则执行 .omp/commands/specwf-grill.md
```

审查通过后自动进入 verify 阶段执行测试验证。

## 参考技能
