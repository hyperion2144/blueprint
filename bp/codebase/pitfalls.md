# Pitfalls: specwf

Risks, anti-patterns, technical debt, and fragility hotspots identified during brownfield analysis.

## P1 — Mixed Language in Source

**Severity:** Low | **Impact:** Maintainability

Source files mix Chinese and English inconsistently:
- JSDoc comments: predominantly Chinese (`/** specwf 状态机类型 */`)
- Type/interface field names: English (`ChangeStatus`, `dependsOn`)
- CLI descriptions: Chinese (`规格驱动开发工作流`)
- Template bodies: English
- Developer prose in issues/state.md: Chinese

This creates a split-brain for contributors. No lint rule enforces consistency.

**Mitigation:** The coding convention file states "Prose, comments, and documentation: English" but this is not enforced.

## P2 — Generated Files at Risk of Silent Overwrite

**Severity:** Medium | **Impact:** Data loss

`specwf update` regenerates all `.omp/commands/`, `.omp/agents/`, and `.omp/skills/` files from TypeScript templates. If a user manually edits a generated file (e.g., tuning a skill prompt), running `specwf update` overwrites it without warning. The roadmap mentions "已修改的生成文件检测 + warning (pitfalls T18 缓解)" but this is not yet implemented.

**Current behavior:** The same `writeFileSync` path used for both init and update — no hash comparison, no backup.

## P3 — `bin/` Directory Is Gitignored But Published

**Severity:** Low | **Impact:** Confusion

`.gitignore` excludes `bin/`, but `package.json` `files` includes `bin/`, and `bin/specwf.js` is the published CLI entry point. The `bin/` contents come from `tsup`'s `publicDir: 'src/public'` which copies files to dist, which then get moved/copied to `bin/`. This indirection is not documented and could break if the build pipeline changes.

## P4 — Vitest v4 Beta

**Severity:** Low | **Impact:** Stability

`vitest` ^4.0.0 is used. Vitest 4.x is a major version released in early 2025 and may have breaking changes or instability relative to the well-established Vitest 1.x/2.x.

## P5 — No Integration Tests for Generators or Commands

**Severity:** Medium | **Impact:** Regression risk

`tests/integration/` has only 2 files (`e2e.test.ts` and `specwf.test.ts`). Most commands are only tested indirectly through core module tests. Generator output correctness (command/skill/agent file formatting) has no test coverage.

The test directory structure (`tests/core/`, `tests/parser/`, `tests/integration/`) is separate from source (`src/`), contradicting the coding convention of "co-located with source."

**Severity:** Medium | **Impact:** Accumulating tech debt

`src/templates/agents/index.ts` is 12.6KB with 8 full agent system prompts inline. `src/templates/artifacts/index.ts` is 16.7KB with 15+ artifact templates inline. These are hard to diff, hard to review, and easy to introduce typos in. They grew from inline generators to template files — but the templates are still TypeScript strings rather than separate `.md` files.

## P7 — Hard-Coded State Transitions

**Severity:** Low | **Impact:** Flexibility

`STATE_TRANSITIONS` in `src/types/state.ts` is a `const` array. Adding a new workflow step requires editing this array, the continue logic, the step registry, templates, generators, and CLI commands — in 5+ files. There's no plugin or configuration mechanism for custom workflow steps.

## P8 — `process.exit(1)` in Command Handlers

**Severity:** Low | **Impact:** Testability

Several command handlers call `process.exit(1)` on error conditions (e.g., `specwf-init.ts` line 34 when already initialized). This makes these code paths untestable — the test process terminates. Commands should throw errors or return exit codes that the caller handles.

## P9 — `src/integrations/**/hook.ts` Excluded from TypeScript

**Severity:** Low | **Impact:** Type safety

`tsconfig.json` excludes `src/integrations/**/hook.ts`. This means OMP hook files are not type-checked during `tsc --noEmit`. A type error in hooks would only surface at runtime.

## P10 — Brownfield Detection Limited to 4 Languages

**Severity:** Low | **Impact:** Feature completeness

`src/core/brownfield.ts:detectProjectInfo()` only detects JS/TS (`package.json`), Rust (`Cargo.toml`), Go (`go.mod`), and generic source directories (`src`, `app`, `lib`, `pkg`, `cmd`). Python, Ruby, Java, C#, Elixir, and other ecosystems are not supported.

## P11 — Command Handler Uses `any` for `program` Parameter

**Severity:** Low | **Impact:** Type safety

All command handler `register(program: any)` functions type the Commander program instance as `any`. This loses type safety on `.command()`, `.option()`, and `.action()` calls. Commander v15 has full TypeScript support — this is unnecessary.

## P12 — No Dedicated CLI Error Handling

**Severity:** Low | **Impact:** UX

Errors bubble up as unhandled exceptions. There's no centralized error handler that formats errors consistently, no `--debug` flag for verbose output, and no exit code convention (always `1` on failure, `0` on success — no differentiated codes).

## P13 — Template `{{placeholder}}` Detection Is Fragile

**Severity:** Low | **Impact:** False positives

`state-validator.ts:isTemplateFile()` checks for `{{placeholder}}` to detect unfilled templates. This regex pattern would also match legitimate documentation that references template syntax. The check does not know which placeholders are valid for a given template type.

## P14 — Delta Merge Has No Dry-Run Mode

**Severity:** Low | **Impact:** Operational safety

`mergeAndWrite()` always writes to disk. There's no dry-run or preview mode that shows what would change before committing. If a merge produces unexpected results, the only recovery path is git revert.

## P15 — `specwf continue` Does Not Verify Prerequisites

**Severity:** Medium | **Impact:** Workflow integrity

`specwf continue` returns the next slash command based solely on state machine position. It does not check whether the current step's artifacts actually exist before suggesting advancement. The `state-validator.ts` exit criteria logic exists but is not called by `continue`.

## P16 — Chinese-Only CLI Output

**Severity:** Low | **Impact:** Internationalization

CLI output strings are hard-coded in Chinese (`'specwf 初始化完成。'`, `'✓ 创建 specwf/ 目录结构'`). There's no i18n abstraction or translation support. A non-Chinese-speaking user cannot use the CLI effectively.
