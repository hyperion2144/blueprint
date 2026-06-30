# 三重审查

对 Apply 产出的代码并行执行规格审查、质量审查、目标审查。三个独立视角互不干扰，全部通过后才能进入 verify 阶段。

## Subagent

一次派出三个 `specwf-reviewer` agent 并行执行：

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

审查通过后自动进入 verify 阶段执行测试验证。

## 参考技能

- `skills/specwf-review/SKILL.md` — specwf-reviewer agent 的详细操作指引、审查清单、输出格式规范
