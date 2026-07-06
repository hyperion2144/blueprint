# Tasks: refactor-generator-dispatch

> Lightweight change — all tasks type:refactor, no type:behavior.

---

## TDD Type Annotations

| type | Meaning | TDD Protocol |
|------|---------|-------------|
| `refactor` | Refactoring — improve internal structure without changing behavior | Verify tests pass → refactor → verify again |

---

## Wave 1: OMP Provider Registration

- [x] task-register-omp: [type:refactor] Add registerOmpProvider() to OMP integration <!-- commit: 40d3df1 -->
  - **description**: In `src/integrations/omp/index.ts`, add `registerOmpProvider()` that creates a `PlatformProvider` wrapping `generateAllCommands`, `generateAllAgents`, `generateAllSkills` and registers it as `'omp'` via `PlatformRegistry.register()`. The provider includes `capabilities: { supportsCommands: true }`. Keep the existing `supportsCommands` export for backward compatibility.
  - **files**: src/integrations/omp/index.ts
  - **acceptance**: After calling registerOmpProvider(), PlatformRegistry.resolve('omp') returns the OMP provider

- [x] task-refactor-dispatch: [type:refactor] Refactor generators/index.ts to dispatch mode <!-- commit: 40d3df1 -->
  - **description**: Call `registerOmpProvider()` at module scope in `src/generators/index.ts`. Change `generateAll(config)` to: read `config.platform` (default `['omp']`), iterate, resolve each provider via `PlatformRegistry.resolve(id)`, call `provider.generate(config)`, return flattened. Keep `GeneratedFile` export.
  - **files**: src/generators/index.ts
  - **acceptance**: `generateAll(config)` with `config.platform: ['omp']` produces identical output to pre-refactor

- [x] task-fix-bp-update: [type:refactor] Update bp-update.ts to use OMP provider capability <!-- commit: 40d3df1 -->
  - **description**: In `src/commands/bp-update.ts`, change `import { supportsCommands }` → get it from `PlatformRegistry.resolve('omp').capabilities?.supportsCommands ?? true`. Remove the direct import from `../integrations/omp/index.js`.
  - **files**: src/commands/bp-update.ts
  - **acceptance**: `bp update` still works, stale skills cleanup behavior unchanged

- [x] task-test-dispatch: [type:refactor] Add dispatch integration tests <!-- commit: 40d3df1 -->
  - **description**: In `src/core/platform-registry.test.ts`, add tests: register OMP mock provider, call generateAll with platform list, verify correct provider dispatch, verify empty platform defaults to omp.
  - **files**: src/core/platform-registry.test.ts
  - **acceptance**: All existing + new tests pass

---

## Implementation Verification

- [x] `tsc --noEmit` passes (ignoring pre-existing omp/commands.ts error)
- [x] `vitest run` — all tests pass
- [x] Existing test suite passes
