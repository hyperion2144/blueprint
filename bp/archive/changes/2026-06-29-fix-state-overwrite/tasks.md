# Tasks: fix-state-overwrite

---

## TDD type 标注规则

| type | 含义 | TDD 协议 |
|------|------|---------|
| `behavior` | 业务行为 | **RED→GREEN→REFACTOR** |
| `refactor` | 不改变外部行为的内部改进 | 先验证已有测试 → 修改 → 再次验证 |
| `config` | 配置文件 | 直接实现 |
| `scaffolding` | 骨架代码 | 直接实现 |

---

## Wave 1: 修复 saveState body 覆盖

- [ ] task-1: [type:refactor] saveState 写入时保留现有 body
  - **description**: `saveState()` 在 `stringifyFrontmatter` 前，先通过 `readFrontmatterFile()` 读取现有文件 body。文件存在时使用现有 body；不存在时（新文件场景，如 `blueprint init`）回退到 `generateStateBody()` 生成默认 body
  - **files**: `src/core/state-file.ts`
  - **acceptance**: `blueprint change new <name>` 后 state.md body 不变；`blueprint init` 创建新文件时 body 正常生成；79 tests 全部通过
  - ***RED 测试***: 不适用（refactor，无外部行为变更）

---

## 验证

- [x] `tsc --noEmit` 通过（或对应语言的类型检查）
- [x] `vitest run` 测试套件全部通过（79/79）
- [x] E2E 验证：init → 手动添加 body → change new → body 保留
