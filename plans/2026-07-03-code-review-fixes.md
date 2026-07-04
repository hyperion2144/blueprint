# 修复计划：代码审查发现问题

审查日期：2026-07-03
审查范围：`src/` (72 文件) + `tests/` (17 文件)

---

## Phase 1: 运行时 Bug（HIGH）

### 1.1 修复 bp-ship.ts 模板字符串转义

**文件**：`src/commands/bp-ship.ts`

**问题**：`markPublished()` 中 `\${count}` 和 `\${err...}` 因 `\$` 转义导致不插值，字面输出 `${count}` 字符串。

**位置**：
- 第 227 行：`` return `Marked \${count} changes as [published].`; ``
- 第 231 行：`` return `Failed: \${err instanceof Error ? err.message : String(err)}`; ``

**修复**：删除 `$` 前的 `\` 转义符

```typescript
// 修复前
return `Marked \${count} changes as [published].`;
return `Failed: \${err instanceof Error ? err.message : String(err)}`;

// 修复后
return `Marked ${count} changes as [published].`;
return `Failed: ${err instanceof Error ? err.message : String(err)}`;
```

**验证**：单元测试注入已知 state.md，调用 markPublished 断言返回值含实际数字。

---

### 1.2 修复 file-tree.ts 重复的命名空间 import

**文件**：`src/core/file-tree.ts`

**问题**：第 8 行已有 `import { ... } from 'node:fs'`，第 115 行又独立导入 `renameSync`，且位置在函数体之间。

**修复**：将 `renameSync` 合并到顶部 import 语句，删除第 115 行。

```typescript
// 修复前 (第 8 行)
import { mkdirSync, existsSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync } from 'node:fs';
// ... (第 115 行)
import { renameSync } from 'node:fs';

// 修复后 (第 8 行)
import { mkdirSync, existsSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync, renameSync } from 'node:fs';
```

**验证**：`npm run build` 确认编译通过。

---

### 1.3 修复 bp-commit.ts git commit 命令拼接

**文件**：`src/commands/bp-commit.ts`

**问题**：`execSync('git commit ' + amendFlag + ' -F "' + msgFile + '"')` 字符串拼接执行 shell 命令，脆弱且不符合最佳实践。

**修复**：使用 `execFileSync` 传参数数组。

```typescript
// 修复前
const amendFlag = options.amend ? '--amend --no-edit' : '';
execSync('git commit ' + amendFlag + ' -F "' + msgFile + '"', { ... });

// 修复后
const args = ['commit', '-F', msgFile];
if (options.amend) args.push('--amend', '--no-edit');
execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: 'pipe' });
```

同时检查 `scope` 参数——当前 `fullMessage = (message + scopeStr).trim()` 结果只写入了 msgFile，逻辑意图应是 `scopeStr` 括在括号内作为 Conventional Commit scope（如 `feat(cli): add ship`），但当前实现将 scope 直接拼接到 message 末尾。

**修复**：将 scope 正确放入括号中：
```typescript
const fullMessage = options.scope ? `${message}(${options.scope})` : message;
```

**验证**：`npm test -- --run` 确认测试通过。

---

## Phase 2: 健壮性改进（MEDIUM）

### 2.1 修复 bp-archive.ts 静默错误吞没

**文件**：`src/commands/bp-archive.ts`

**问题**：两处空 catch 静默吞错，可能导致状态不一致。

**位置**：
- 第 60 行：`git rm` 失败
- 第 103 行：state 更新失败

**修复**：至少 `console.warn` 输出错误原因；state 更新失败应标记为关键。

```typescript
// 修复前
} catch {
  // git rm is non-critical
}

// 修复后
} catch (e: unknown) {
  console.warn(`⚠ git rm failed: ${e instanceof Error ? e.message : String(e)}`);
}
```

对于 state 更新失败（第 ~103 行），应提升为错误：
```typescript
} catch (e: unknown) {
  console.error(`✗ Failed to update state.md: ${e instanceof Error ? e.message : String(e)}`);
  console.error('  Please manually update state.md to remove the archived change.');
}
```

**验证**：手动测试 archive 流程，确认错误信息可见。

---

### 2.2 修复 state-validator.ts 模板检测阈值

**文件**：`src/core/state-validator.ts`

**问题**：`isTemplateFile()` 用 `> 4` 判定，边界值不可靠。

**修复**：改为检测 frontmatter 中的显式标记，或使用更精确的占位符模式。当前模板产生的文件都有明确占位符如 `{{name}}`、`{{date}}`、`{{intent}}`——改用已知占位符名单匹配：

```typescript
const KNOWN_PLACEHOLDERS = ['{{name}}', '{{date}}', '{{intent}}', '{{scope}}'];
function isTemplateFile(filePath: string): boolean {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return KNOWN_PLACEHOLDERS.some(p => content.includes(p));
  } catch {
    return false;
  }
}
```

**验证**：现有 `state-validator` 测试仍然通过，且新增模板文件边界用例。

---

### 2.3 修复 bp-config.ts set 操作缺少校验

**文件**：`src/commands/bp-config.ts`

**问题**：`configSet` 直接写 `target[lastKey] = typedValue`，绕过 Zod 校验。

**修复**：写回后用 `loadConfig` 触发的 Zod 解析做二次校验。

```typescript
function configSet(key: string, value: string) {
  const bpDir = findBlueprintDir();
  updateConfig(bpDir, (config) => { ... });
  // 立即验证写入结果
  try {
    loadConfig(bpDir);
    console.log(`✓ ${key} = ${value}`);
  } catch (e) {
    console.error(`✗ Invalid config value: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}
```

**验证**：`bp config set profile invalid_value` 应输出错误并退出。

---

### 2.4 修复 bp-state.ts 重复的有效步骤值

**文件**：`src/commands/bp-state.ts`

**问题**：`validProjectSteps` 数组中 `'grill'` 出现两次。

**位置**：第 173 行

**修复**：删除重复项，核实是否缺少 'roadmap-defined' 之前的状态：

```typescript
const validProjectSteps = ['init', 'grill', 'researching', 'researched', 'roadmap-defined', 'milestone-active', 'milestone-shipped'];
```

**验证**：确认不影响 `setStep` 行为。

---

### 2.5 补充 continue.ts 状态转移缺失

**文件**：`src/types/state.ts`

**问题**：`milestone-shipped` 状态在 `STATE_TRANSITIONS` 中无对应的 `from`，导致 `bp continue` 无可用下一步。

**修复**：添加转移条目：

```typescript
{ from: 'milestone-shipped', command: 'new-milestone', to: 'milestone-active', slashCommand: '/bp:state set-milestone' },
```

**验证**：`bp continue` 在 milestone-shipped 状态下应输出 hint 引导用户切换 milestone。

---

## Phase 3: 代码质量（LOW）

### 3.1 增加缺失的单元测试

优先补充：
- `src/core/brownfield.ts` → `tests/core/brownfield.test.ts`
- `src/core/code-extract.ts` → `tests/core/code-extract.test.ts`
- `src/core/state-validator.ts` → `tests/core/state-validator.test.ts`
- `src/commands/bp-ship.ts` → `tests/commands/bp-ship.test.ts`（关键：验证 markPublished 插值修复）

### 3.2 统一注释语言

全局替换中文注释为英文，或反过来统一为中文（取决于项目受众）。

### 3.3 修复 delta-merge 冲突传播逻辑

**文件**：`src/core/delta-merge.ts`

`mergeTrees` 中子节点冲突会向上传播但父节点仍可能 push 自己的冲突，导致同内容被多次报告。添加去重逻辑或限制冲突只报告一次。

---

## 执行顺序

```
Phase 1 (HIGH) → Phase 2 (MEDIUM) → Phase 3 (LOW)
每个 Phase 内按编号顺序执行
Phase 1 每项修复完成后独立 commit
Phase 2-3 可合并为一个 commit
```

### 建议 Commit 拆分

| Commit | 内容 |
|--------|------|
| `fix: bp-ship escaped template literal prevents interpolation` | Phase 1.1 |
| `fix: duplicate import of renameSync in file-tree` | Phase 1.2 |
| `fix: safe git commit via execFileSync in bp-commit` | Phase 1.3 |
| `fix: improve error handling and validation robustness` | Phase 2.1–2.5 |
| `test: add unit tests for brownfield, code-extract, state-validator, bp-ship` | Phase 3.1 |
