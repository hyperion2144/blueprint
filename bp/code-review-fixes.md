# Code Review — Fix Summary

## 综述

2026-07-16 代码审查后修复清单。

### 真实问题修复（4 项）

| # | 文件 | 问题 | 修复方式 |
|---|------|------|----------|
| 1 | `src/core/validate/index.ts:107` | 模板占位符正则 `/\\{\\{/` 实际匹配 `\{\{`（反斜杠 + 双花括号），不是 `{{` → FILL 校验失效 | 改为 `/\{\{/` |
| 2 | `src/core/continue.ts:308-326` + `bp-continue.ts:83-93` | `resolveStatus` 与 `resolveStatusKey` 重复实现且发散；后者漏处理 adhoc-pending | 统一导出 `resolveStatus`，删除局部 `resolveStatusKey`，三处调用点替换 |
| 3 | `src/core/state-file.ts:122-123` | `while (Date.now() < until) { /* spin */ }` busy-spin 占满 CPU | 替换为 `Atomics.wait` 同步休眠 |
| 4 | `src/commands/bp-continue.ts` | `continueHandler` 220 行 + `continueChangeHandler` 157 行 | 提取 `handleFileConflicts`、`handleCoverageCheck` 辅助函数 |

### 代码整洁（5 项）

| # | 文件 | 问题 | 处理 |
|---|------|------|------|
| 1 | `bp-config.ts:83-85` + `bp-state.ts:57-59` | `findBlueprintDir` 重复定义 | 提取到 `src/commands/_utils.ts` |
| 2 | `src/core/delta-merge.ts:29-32` | `captureBaseFingerprint` export 但无调用方 | 删除 |
| 3 | `src/core/code-extract.ts:88,113` | `_domain` 参数未使用 | 删除参数及调用点实参 |
| 4 | `bp-init.ts:82,98` | `baseDir.split('/').pop()` 替代 `path.basename` | 改用 `path.basename` |
| 5 | `src/core/config.ts` | 新增 `commitDocs` 配置项（测试需要） | 保留 |

### 误报说明（原代码审查标为 CRITICAL/HIGH 但已验证为安全）

以下 4 条安全问题已逐一核实为误报：

1. **`bp-commit.ts:46`** — 原审查称 "execSync with user-provided message without sanitization"。实际代码使用 `execFileSync('git', ['commit', '-F', msgFile])`，commit 消息写入临时文件后通过 `-F` 传递，无 shell 注入面。已验证（line 117-123）。

2. **`bp-milestone.ts:40`** — 原审查称 "spawnSync with string interpolation for git rm"。实际使用 `spawnSync('git', ['rm', '-r', `bp/milestones/${id}`])` 数组形式 + id 经 `/^[A-Za-z0-9._-]+$/` 严格正则校验。已验证（line 36-40）。

3. **`bp-archive.ts:149`** — 原审查称 "spawnSync('git', ['rm', ...]) with interpolated path"。实际路径经 `gitPath.startsWith('bp/')` 断言后传入数组形式 `spawnSync('git', ['rm', '-r', gitPath])`。已验证（line 150-155）。

4. **`src/core/code-extract.ts:55`** — 原审查称 "execSync with user-controlled cwd — command injection"。实际命令字符串为硬编码 `'git diff HEAD'`，`cwd` 仅作为 `execSync` 的 `cwd` 选项传参，不参与字符串拼接。已验证（line 55-70）。

### 测试覆盖提升

| 区域 | 原有 | 新增 | 当前 |
|------|------|------|------|
| 核心模块单元测试 | 11 文件 | — | 11 文件 |
| 命令处理器测试 | 2 文件（dispatch, ship） | 3 文件（commit, archive, milestone） | 5 文件 |
| FILL 验证测试 | 0 | 1 文件（3 用例） | 1 文件 |
| state-file 并发测试 | 0 | 1 用例 | 1 文件 |
| resolveStatus 测试 | 0 | 5 用例 | 1 文件 |
| 合计 | 25 文件 / 164 测试 | — | 29 文件 / 178 测试 |

所有测试全绿：`npx vitest run` → 29 files passed, 178 tests passed.
