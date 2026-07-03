# Proposal: fix-state-overwrite

---

## Intent

`blueprint change new <name>` 每次创建 adhoc change 时，`updateState` → `saveState` 会调用 `generateStateBody()` 从零生成 Markdown body，覆盖用户在 `state.md` body 中写的所有详细内容。

影响：任何调用 `updateState`/`saveState` 的命令（change new、archive、set-milestone、set-phase、set-step）都会覆盖 body。用户精心编写的变更列表、历史记录、检查清单全部丢失。

本变更为 bug fix，目标是让 `saveState` 保留现有 body，只更新 frontmatter。

---

## Scope

### In scope

- 修改 `src/core/state-file.ts` 的 `saveState` 函数：写入前先读现有文件 body，存在则保留，不存在则生成默认 body
- 此修复覆盖所有调用 `saveState`/`updateState` 的场景（change new、archive、set 命令）

### Out of scope

- 不改变 `generateStateBody` 的默认 body 格式（仍然用于新文件）
- 不修改 state.md 的 frontmatter 结构
- 不涉及其他文件

---

## Approach

`saveState` 函数在 `stringifyFrontmatter` 前，先尝试用 `readFrontmatterFile` 读取现有 body。如果文件存在，使用现有 body 而不是重新生成：

```ts
export function saveState(blueprintDir: string, state: StateFile): void {
  let body: string;
  try {
    const existing = readFrontmatterFile(statePath(blueprintDir));
    body = existing.content;
  } catch {
    body = generateStateBody(state);
  }
  const output = stringifyFrontmatter(state as unknown as Record<string, unknown>, body);
  writeFileSync(statePath(blueprintDir), output, 'utf-8');
}
```

`try/catch` 处理新文件场景（`blueprint init` 时文件不存在，抛出异常，回退到默认 body）。

---

## Must-haves

- `blueprint change new <name>` 创建 adhoc change 后，state.md body **不变**（只 frontmatter 追加 adhoc 条目）
- `blueprint archive <change>` 归档后，state.md body 保留
- `blueprint state set-milestone / set-phase / set-step` 后，state.md body 保留
- `blueprint init` 创建新 state.md 时，body 正常生成（默认 body）
- 现有测试全部通过

---

## Non-goals

- 不改变 body 格式或内容
- 不引入新依赖
