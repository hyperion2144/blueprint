# Proposal: fix-milestone-archive

---

## Intent

切换里程碑时没有归档能力，旧里程碑的阶段数据留在原地。里程碑完成后没有统一归档路径。

本变更为：
1. `blueprint state set-milestone <id>` 自动归档上一里程碑
2. 归档结构: `archive/milestones/<name>/`，与 change 归档分离
3. 归档内容包括里程碑下所有 phase 目录
4. 生成里程碑 summary

---

## Scope

### 归档结构

```
archive/
├── 2026-06-29-fix-state-overwrite/     ← change 归档（不变）
├── milestones/                           ← 里程碑归档（新增）
│   └── <milestone-name>/
│       ├── summary.md
│       └── phases/
│           ├── <phase-name>/
│           │   ├── summary.md
│           │   ├── context.md
│           │   └── changes/<change-name>/
│           └── ...
```

### In scope

- `src/core/file-tree.ts` 新增 `archiveMilestoneDir` 函数
- `src/commands/blueprint-state.ts` 的 `setMilestone` 增加归档逻辑
- 检测上一 milestone 未 shipped 时自动归档
- 归档包括完整 phase 结构

### Out of scope

- 不修改现有 change 归档路径
- 不自动创建 milestone summary 内容（只移动目录）
