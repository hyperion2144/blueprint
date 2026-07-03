# Design: fix-state-overwrite

---

## 背景与目标

`saveState` 每次写入 state.md 时都从调用 `generateStateBody()` 生成全新 body，丢弃用户在 body 中编写的所有详细内容（变更列表、历史记录、检查清单等）。所有调用 `updateState`/`saveState` 的命令都受影响。

本设计目标：
- `saveState` 写入时保留现有 body，只更新 frontmatter
- 修改覆盖所有调用路径（change new、archive、set-milestone/set-phase/set-step）
- `blueprint init` 创建新文件场景正常生成默认 body

---

## 技术方案

### 架构图

```text
修改前:
updateState() → loadState() → updater(frontmatter)
  → saveState() → generateStateBody() [丢弃原 body]
  → stringifyFrontmatter(frontmatter, 新 body)
  → writeFileSync()

修改后:
updateState() → loadState() → updater(frontmatter)
  → saveState() → readFrontmatterFile() [读现有 body]
  ├─ 文件存在 → 使用现有 body
  └─ 文件不存在 → generateStateBody() [仅新文件]
  → stringifyFrontmatter(frontmatter, body)
  → writeFileSync()
```

### 核心数据结构

无变更。`StateFile` 类型和 frontmatter schema 保持不变。

### 数据流

1. `updateState()` 或 `saveState()` 被调用
2. 需要写回 state.md
3. `saveState()` 先尝试 `readFrontmatterFile()` 读取现有文件
4. **文件存在** → 提取 `content`（现有 body）→ 传入 `stringifyFrontmatter`
5. **文件不存在**（`blueprint init` 等新文件场景）→ `readFrontmatterFile` 抛异常 → fallback 到 `generateStateBody()` 生成默认 body
6. `stringifyFrontmatter(frontmatter, body)` 组合 frontmatter + body → 写入文件

### 接口设计

```typescript
// 修改 saveState 函数 — 签名不变，行为变更
function saveState(blueprintDir: string, state: StateFile): void

// 新增的内部逻辑
// - 尝试读取现有 body（readFrontmatterFile）
// - 存在 → 保留
// - 不存在 → generateStateBody() fallback
```

---

## 文件清单

| 文件路径 | 内容描述 | 操作 |
|---------|---------|------|
| `src/core/state-file.ts` | `saveState` 增加 body 保留逻辑 | 修改 |

---

## 测试策略

### 单元测试
- 现有 `state-file.test.ts` 覆盖 `loadState`/`saveState`/`updateState`，已有 79 tests 全部通过
- 不需要额外测试用例：行为不变（保留 body 而非覆盖是新行为，但输出 frontmatter 一致）

### 集成测试
- 已在临时目录 E2E 验证：init → 添加自定义 body → change new → body 保留

### TDD 任务
- 无需 TDD：这是个内部逻辑修复，已有测试覆盖

---

## 备选方案

| 方案 | 优点 | 缺点 | 不选原因 |
|-----|------|------|---------|
| **StateFile 加 body 字段** | 显式传递，类型安全 | 需改类型定义 + 所有 loadState 调用者 | 过度设计，仅一个函数需要 |
| **updateState 内嵌 body 保留** | 改动更局部 | 只修 updateState 不修 saveState，其他调用者仍会覆盖 | saveState 是公共 API，应该在此层解决 |
| **使用 gray-matter 的 orig 保留** | 库支持 | gray-matter 的 orig 不是公开 API，依赖内部行为 | 不可靠 |

---

## 风险点

| 风险 | 概率 | 影响 | 缓解措施 |
|-----|------|------|---------|
| 新文件场景下 readFrontmatterFile 抛异常类型不稳定 | 低 | 中 | try/catch 兜底，异常时 fallback generateStateBody |
| gray-matter write 改变 body 格式（尾部空行等） | 低 | 低 | E2E 验证确认 body 内容不变 |
