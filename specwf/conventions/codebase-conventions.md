# Codebase Conventions: specwf

Conventions observed from source code patterns. Supplements `conventions/coding.md` with empirical evidence.

## Module System

- **ESM only** — all imports use `import`/`export`, no `require()` or `module.exports`
- **`.js` extensions on relative imports** — `'../core/config.js'`, `'../types/index.js'` (resolved by `bundler` module resolution at compile time)
- **`node:` prefix for built-ins** — `import { readFileSync } from 'node:fs'`
- **No default exports** — every module uses named exports exclusively

## Function Patterns

- **`export function`** — functions are declared and exported at top level, not assigned to `export const`
- **ZF (Zero-Function) pattern absent** — arrow functions are used only for callbacks/lambdas, not for exported functions
- **Pure functions preferred** — state-machine, parser, and merge logic is stateless; I/O happens at command boundaries

## Validation Pattern

- **Zod schema → parse** — every external input (YAML, frontmatter) is validated with a Zod schema before use
- **`z.object({…}).parse()`** — schemas defined as `const SchemaName = z.object({…})` then called via `.parse(raw)`
- **Optional fields use `.optional().default(…)`** — absent-means-enabled convention for workflow toggles

## Type Patterns

- **Interfaces over type aliases** — `interface` used for object shapes (`StateFile`, `ProjectConfig`); `type` used for unions (`Profile`, `EntityType`, `ChangeStatus`)
- **Barrel re-exports** — `src/types/index.ts` collects and re-exports all public types
- **`import type`** — type-only imports always use `import type { … }` or `import type { … } from '…'`

## File Naming

- **kebab-case** — all `.ts` files: `state-machine.ts`, `spec-injector.ts`, `heading-tree.ts`
- **`specwf-` prefix for commands** — `specwf-init.ts`, `specwf-archive.ts`
- **`_utils.ts`** — underscore prefix for internal shared modules within a directory

## Directory Conventions

- **Flat module directories** — `src/core/` has 10 files with no subdirectories; same for `src/commands/`, `src/parser/`
- **Domain grouping** — `src/types/`, `src/parser/`, `src/core/`, `src/commands/` — each directory is a conceptual layer
- **Tests mirror source structure** — `tests/core/` maps to `src/core/`, `tests/parser/` maps to `src/parser/`
- **Templates are data** — `src/templates/` contains content (strings), not logic

## Error Handling

- **`try {…} catch {…}` with empty catch** — non-critical failures (generator errors, git operations) are silently swallowed (e.g., `specwf-init.ts:89-91`)
- **`process.exit(1)` on critical failures** — init command exits on duplicate initialization
- **`console.error()` + `process.exit(1)`** — standard error reporting pattern for CLI

## Imports Organization

- **Node built-ins first** — `node:fs`, `node:path`, `node:child_process` imports precede project imports
- **Third-party next** — `commander`, `zod`, `gray-matter`, `yaml`
- **Project imports last** — `'../core/…'`, `'../types/…'`, `'../parser/…'`
- **No blank lines between import groups** — all imports in one contiguous block

## Comment Style

- **JSDoc on public functions** — `/** 读取并验证 state.md */`, `/** 计算 SHA-256 指纹 */`
- **Chinese JSDoc** — descriptive comments in Chinese, matching the project's primary language
- **Inline `//` comments** — English or Chinese, used sparingly for non-obvious logic
- **Section dividers** — `/* ================================================================ */` in integration modules

## Constant Patterns

- **`UPPER_SNAKE_CASE` for module-level constants** — `STATE_TRANSITIONS`, `SPECWF_DIRS`, `STEP_INFO`
- **`as const` for readonly tuples** — `ALL_WORKFLOW_STEPS = […] as const`
- **Inline constant definitions** — `const CONFIG_FILE = 'project.yml'` at module top

## Testing Patterns

- **`describe`/`it`/`expect`** — standard Vitest BDD style
- **`beforeEach`/`afterEach` for temp dirs** — create in `beforeEach`, rm with `{ recursive: true, force: true }` in `afterEach`
- **Relative imports from `../../src/`** — test files import from `../../src/core/config.js`
- **No `src/**/*.test.ts` files exist** — all tests in `tests/` despite convention stating co-location

## Generator Pattern

- **`{ path: string, content: string }[]`** — generators return arrays of file descriptors, not write directly
- **`writeGeneratedFiles()` in `_utils.ts`** — shared utility for writing generator output to disk
- **Platform isolation** — OMP generators live in `src/integrations/omp/`, not interleaved with CLI logic

## Dependency Direction

```
Prompt modules → none
Types          → none
Parser         → types
Core           → types, parser
Templates      → types (types.ts only)
Generators     → types, templates, integrations
Integrations   → types, templates, core
Commands       → core, generators, prompts, templates
CLI            → commands
```

No circular dependencies observed. All arrows point upward (lower-level to higher-level).
