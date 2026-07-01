# Change Summary: fix-milestone-archive

> **完成日期**: 2026-06-30
> **Change 类型**: adhoc

---

## Intent

切换里程碑时没有归档能力，旧里程碑的 phase 数据留在原目录。里程碑完成后没有统一的归档路径。

变更点：
1. `specwf state set-milestone <id>` 在切换时自动归档上一里程碑
2. 归档到 `archive/milestones/<name>/`，与 change 归档分离
3. 完整保留 milestone 下的 phase 目录结构
4. 已有 change 归档（`archive/2026-06-29-xxx/`）不受影响

## 产出文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/core/file-tree.ts` | 修改 | 新增 `archiveMilestoneDir` 函数，将里程碑完整目录移动到 `archive/milestones/<name>/` |
| `src/commands/specwf-state.ts` | 修改 | `setMilestone` 切换前调用 `archiveMilestoneDir` 自动归档上一里程碑 |

## 归档结构

```
archive/
├── 2026-06-29-xxx/          ← change 归档（不变）
└── milestones/              ← 里程碑归档（新增）
    └── <name>/
        └── phases/.../
```

## 关键决策

- **归档路径与 change 分离**：`archive/milestones/<name>/` 独立于 `archive/<change-name>/`，避免命名冲突和语义混杂
- **整目录移动**：直接移动 `milestones/<name>` 整个目录树到 `archive/milestones/<name>`，保留 phase 子目录的完整结构
- **检测未 shipped 的 milestone**：仅对存在且未 shipped 的上一里程碑执行归档动作
- **不做 summary 内容自动生成**：只负责目录移动，summary 内容由人工或后续 task 生成

## 验证结果

| 检查项 | 结果 |
|--------|------|
| tsc --noEmit | ✅ 0 errors |
| vitest run | ✅ 79/79 passed |
| npm run build | ✅ 78KB |
| 切换 milestone 时归档上一里程碑 | ✅ |
| 归档到 `archive/milestones/<name>/phases/` | ✅ |
| 原 `milestones/` 目录被移动 | ✅ |
| 已有 change 归档不受影响 | ✅ |
