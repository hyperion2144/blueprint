# Proposal: fix-change-summary

---

## Intent

每个 change 完成后没有总结文档。阶段总结需要手动汇总 change 产出，容易遗漏。

本变更为流程改进，目标是：
1. executor agent 在 apply 完成后写 change-level summary.md
2. archive 命令检查 summary.md 是否存在
3. 新建 change 级 summary 模板，区别于已有的 phase 级 summary 模板

---

## Scope

### In scope

- 新建 `templates/artifacts/change-summary.md` — Change 级别的 summary 模板（含产出文件、关键决策、验证结果）
- `executor` agent 的 `## 产物要求` 加"完成后写 summary.md"步骤
- `archive` 命令在归档前检查 `changes/<name>/summary.md` 是否存在，不存在则 warning
- 注册 `specwf template change-summary` 模板类型
- 补上我这轮 missing 的 9 个 change summary

### Out of scope

- 不修改 phase 级 summary 模板
- 不做自动合并 phase summary（后续再考虑）

---

## Approach

### Change Summary 模板内容

```
# Change Summary: <name>

## Intent
（为什么做）

## 产出文件
| 文件 | 操作 | 说明 |
|------|------|------|

## 关键决策
（实现中做的选择）

## 验证结果
- tsc --noEmit: ✅
- vitest: N/N passed
```

### executor agent 更新

在 `## 产物要求` 中增加：
```
执行完成后，使用 `specwf template change-summary` 生成 summary.md，填写后放入 change 目录。
```

### archive 命令更新

在 `archiveHandler` 中增加：
```typescript
const summaryPath = join(fullChangePath, 'summary.md');
if (!existsSync(summaryPath)) {
  console.warn('⚠ summary.md 不存在，建议先完成变更总结');
}
```
