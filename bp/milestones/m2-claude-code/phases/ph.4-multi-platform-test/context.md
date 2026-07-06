# Context: ph.4-multi-platform-test

> Express path.

## Goals
1. project.yml `platform` 数组支持完整验证（含空数组回退 `[omp]`）
2. 更新 bp 自身 project.yml 使用 `[omp, claude-code, agent]`
3. golden-file 测试：每个平台独立快照 + 多平台组合
4. 集成测试：三平台同时生成

## Changes
| Change | Description |
|--------|-------------|
| implement-config-platform-array | Config validation + bp self-update |
| add-multi-platform-tests | Golden-file + integration tests |
