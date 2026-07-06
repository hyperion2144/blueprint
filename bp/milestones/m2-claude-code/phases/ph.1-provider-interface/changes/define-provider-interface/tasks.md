# Tasks: define-provider-interface

> Lightweight change — all tasks type:scaffolding/refactor, no type:behavior.

---

## TDD Type Annotations

| type | Meaning | TDD Protocol |
|------|---------|-------------|
| `scaffolding` | Skeleton code — new module shells, directory structure, templates | Direct implementation, no TDD |
| `refactor` | Refactoring — improve internal structure without changing behavior | Verify tests pass → refactor → verify again |

---

## Wave 1: Provider Interface + Registry

- [ ] task-define-interface: [type:scaffolding] Define PlatformProvider interface and PlatformRegistry class
  - **description**: Create `src/core/platform-registry.ts` with `PlatformProvider` interface (id, name, capabilities?, generate()) and `PlatformRegistry` class (Map-based, register/resolve/list/has/generateAll methods). Singleton via `createDefaultRegistry()` factory, test override via `setPlatformRegistry()`.
  - **files**: src/core/platform-registry.ts
  - **acceptance**: PlatformProvider interface compiles, PlatformRegistry.register/resolve/list/has/generateAll methods all work

- [ ] task-registry-tests: [type:scaffolding] Write PlatformRegistry unit tests
  - **description**: Create `src/core/platform-registry.test.ts` covering: register + resolve, duplicate id throws, unknown id throws, has() true/false, list() returns all, generateAll() iterates all, capabilities defaults, setPlatformRegistry() test isolation.
  - **files**: src/core/platform-registry.test.ts
  - **acceptance**: All 8 test scenarios pass, no state leakage between tests

---

## Implementation Verification

- [ ] `tsc --noEmit` passes
- [ ] `vitest run` all test suites pass
- [ ] New code passes lint check
