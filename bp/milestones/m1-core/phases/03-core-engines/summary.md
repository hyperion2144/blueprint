# Phase 3 Summary: 核心引擎

## 完成状态

✅ Phase 3 shipped。3 个引擎 + file-tree 全部归档。

## Change 产出明细

### change: core-engines
- **描述**: 核心引擎：spec-injector + delta-merge + code-extract + file-tree
- **产出文件**:
  - `src/core/spec-injector.ts` — context 命令核心（读 state.md → 按步骤类型确定注入范围 → 输出文件路径清单 + formatContextTerminal）
  - `src/core/delta-merge.ts` — delta-spec 合并引擎（heading tree 三向合并 + SHA-256 fingerprint 冲突检测 + mergeAndWrite）
  - `src/core/code-extract.ts` — 代码认知提取（从 git diff 提取行为/约束 → writeExtractionToSpec + AUTO-EXTRACTED 标记）
  - `src/core/file-tree.ts` — 产物目录树操作（createSpecwfStructure + createMilestoneDir + createPhaseDir + createChangeDir + createAdhocChangeDir + archiveChangeDir + list*）
  - `tests/core/spec-injector.test.ts` — 3 tests
  - `tests/core/delta-merge.test.ts` — 6 tests（fingerprint + 指纹匹配 + 新增 section + 纯追加合并 + 冲突检测）
  - `tests/core/file-tree.test.ts` — 8 tests
- **验证**: 65 tests 累计全绿

## 验证结果

| 验证项 | 结果 | 证据 |
|---|---|---|
| tsc --noEmit | ✅ | 0 errors |
| vitest run | ✅ | 65/65 通过 |
| delta-merge 指纹匹配 | ✅ | 指纹匹配时直接替换 |
| delta-merge 冲突检测 | ✅ | content 冲突时标记 conflict |
| spec-injector context 输出 | ✅ | 项目层步骤注入所有 specs + conventions |
| file-tree 目录创建 | ✅ | createSpecwfStructure + createChangeDir |
