# Design: bp-auto-context-injection

## Design Items

### DS-1: spec-injector CompactContext surface

- **Refs**: PR-1
- **Key Interfaces**:
  - `generateCompactContext(bpDir, opts)` returning `CompactContext`
  - `formatContextCompact(result)` → `<bp-context>...</bp-context>` markdown string
  - `formatContextCompactJson(result)` → `JSON.stringify` of the same object
  - Types `CompactSpecRef`, `CompactConventionRef`, `ActiveChangeRef`, `CompactRuleRef` in `src/types/spec-injector.ts`

### DS-2: bp context CLI surface

- **Refs**: PR-2
- **Key Interfaces**:
  - `bp context <step> [--format=full|compact|json] [--change <name>]`
  - Default format remains `full` for back-compat
  - Exit non-zero on unresolved `--change`, missing config

### Core Data Structures

```typescript
// src/types/spec-injector.ts (NEW)
export interface CompactSpecRef {
  path: string;
  title: string;
  lineCount: number;
}

export interface CompactConventionRef {
  path: string;
  title: string;
  lineCount: number;
}

export interface ActiveChangeRef {
  name: string;
  status: 'proposed' | 'in_progress' | 'reviewed' | 'archived';
  proposalPath: string;
  designPath: string | null;
  tasksPath: string | null;
  specsPath: string | null;
  contextJsonlPath: string | null;
}

export interface CompactRuleRef {
  artifact: string;
  text: string;
}

export interface CompactContext {
  specs: CompactSpecRef[];
  conventions: CompactConventionRef[];
  activeChange: ActiveChangeRef | null;
  rules: CompactRuleRef[];
  generatedAt: string;
}
```

### Architecture Decisions

- D-1: Compact (paths-only) context over full-file injection for session_start
- D-2: context.jsonl stored per change, archived with the change
- D-3: Sub-agent type detection via OMP runtime template-name query
- D-4: OMP Extension API over legacy hook API
- D-5: Bundled runtime payload, dev-only @oh-my-pi/pi-coding-agent dep
- D-6: Inline HOOK_TEMPLATE constant removed; generator is single source of truth
- D-7: Legacy .omp/hooks/pre/bp.ts retained as 5-line shim
- D-10: Refresh stale blueprint update SHALs to bp update vocabulary

### DS-3: OMP Extension generator surface (PR-4)

- **Refs**: PR-4
- **Files**: `src/integrations/omp/extension.ts`, `src/integrations/omp/legacy-shim.ts`, `src/integrations/omp/extension-runtime.ts`
- **Key Interfaces**:
  - `generateExtension(_config) => { path: '.omp/extensions/bp/index.ts', content: string }` — byte-deterministic
  - `generateLegacyShim(_config) => { path: '.omp/hooks/pre/bp.ts', content: string }` — 5-line re-export shim
  - `EXTENSION_SOURCE: string` exported from `src/integrations/omp/extension-runtime.ts` — the self-contained Extension source
  - `SHIM_SOURCE: string` exported from `src/integrations/omp/extension-runtime.ts` — the 5-line shim source

### DS-4: OMP Extension runtime surface (PR-4)

- **Refs**: PR-4
- **Files**: `src/integrations/omp/extension-runtime.ts`
- **Key Interfaces**:
  - `handleSessionStart(event, ctx, api) => Promise<void>` — emits the `<bp-context>` block
  - `handleBeforeAgentStart(event, ctx, api) => Promise<{ message: BpMessage } | undefined>` — returns workflow-state custom message
  - `handleContext(event, ctx, api) => Promise<{ message: BpMessage } | undefined>` — post-compaction recovery
  - `isDisabled() => boolean` — env bypass check (`BP_HOOKS=0` or `BP_DISABLE_HOOKS=1`)
  - `hasBpConfig(cwd: string) => boolean` — config-existence check
  - `detectAgentType(ctx) => 'planner' | 'executor' | 'reviewer' | 'default'` — sub-agent discrimination
  - `renderCompactBlock(cwd, agentType, contextJsonl?, tasks?) => string` — payload rendering
  - `BpMessage = { role: 'custom', customType: string, content: Array<{ type: 'text', text: string }>, timestamp: number }`

### DS-5: Sub-agent discrimination rules

| Agent template match | Augmentation appended to the `<bp-context>` block |
|---|---|
| default (no match) | none — paths-only compact |
| planner | `## Roadmap State` block (milestone, phase, next step) |
| executor | inline content of every `context.jsonl` row; `tag: guard-rail` rows prefixed with `> GUARD-RAIL: ` |
| reviewer | each row's `reason:` rendered as `- <text>` under `## Invariants`; `tasks.md` acceptance-criteria text appended verbatim |

### DS-6: Post-compaction recovery (D-8)

When the OMP runtime reports `lastCompactionTs > lastInjectionTs`, the `context` handler reverse-scans the recent message list for any `customType: bp-workflow-state` entry. If none is found, it re-injects the workflow state. Otherwise (no compaction, or a `bp-workflow-state` already in the recent list) the handler returns `undefined` — the no-op fast path.

### DS-7: Env bypass (D-9) and config-skip

- `BP_HOOKS=0` and `BP_DISABLE_HOOKS=1` short-circuit all three handlers (session_start, before_agent_start, context) — they return immediately and call neither `api.sendMessage` nor return a message.
- A missing `bp/config.yaml` short-circuits all three handlers for the same reason.

### DS-8: Generator pipeline byte-determinism (D-6)

The `extension.ts` and `legacy-shim.ts` generators emit string constants that depend only on their own source code (no `Date.now()`, no `Math.random()`, no environment lookups). Two consecutive invocations of `generateExtension(config)` and `generateLegacyShim(config)` produce byte-identical output.

### DS-9: Legacy shim (D-7)

`.omp/hooks/pre/bp.ts` is a 5-line re-export of the Extension default for OMP runtimes that do not yet support the Extension API:
```ts
// Generated by bp update. Do not edit manually.
// Legacy hook shim for OMP runtimes without Extension support.
export { default } from '../extensions/bp/index.js';
```
(The file content may include a leading `/** ... */` docblock and the `export` line — total non-empty lines ≤ 6.)

### PR-4 Verify cases (11 total)

1. `session_start` with no agent-name match → paths-only compact block emitted via `bp context --format=compact`; no augmentation.
2. `session_start` with `agentTemplate` matching `planner` → emitted body contains `## Roadmap State` plus milestone, phase, and next step.
3. `session_start` with `agentTemplate` matching `executor` → emitted body contains every context.jsonl row's `file:` and `reason:`; `tag: guard-rail` rows prefixed `> GUARD-RAIL: `.
4. `session_start` with `agentTemplate` matching `reviewer` → emitted body contains `- <reason text>` for each row and the literal tasks.md acceptance string.
5. `before_agent_start` returns `{ message: { role: 'custom', customType: 'bp-workflow-state', content: [...], timestamp: <number> } }` derived from `bp continue` output.
6. `context` with `lastCompactionTs > lastInjectionTs` and no `bp-workflow-state` in recent messages → returns `{ message: { customType: 'bp-workflow-state', ... } }` re-injecting workflow state.
7. `context` with `lastCompactionTs <= lastInjectionTs` (or both undefined) → returns `undefined` (fast path).
8. `BP_HOOKS=0` (or `BP_DISABLE_HOOKS=1`) → all three handlers return immediately without side effects.
9. Missing `bp/config.yaml` → all three handlers return immediately without side effects.
10. `generateExtension` called twice with the same `ProjectConfig` → byte-identical output for both runs.
11. `generateLegacyShim` returns `.omp/hooks/pre/bp.ts` with the 5-line re-export content.

### File Manifest (Wave 3)

| Path | Status | Purpose |
|---|---|---|
| `src/integrations/omp/extension-runtime.ts` | NEW | EXTENSION_SOURCE + SHIM_SOURCE constants + handler helpers |
| `src/integrations/omp/extension.ts` | NEW | generator: produces `.omp/extensions/bp/index.ts` |
| `src/integrations/omp/legacy-shim.ts` | NEW | generator: produces `.omp/hooks/pre/bp.ts` |
| `src/templates/omp/extension.ts.tmpl` | NEW | string-constant module re-exporting EXTENSION_SOURCE |
| `src/templates/omp/legacy-shim.ts.tmpl` | NEW | string-constant module re-exporting SHIM_SOURCE |
| `src/integrations/omp/index.ts` | MODIFIED | register Extension + shim generators; drop legacy hook export |
| `src/integrations/omp/hook.ts` | DELETED (T-40) | replaced by Extension generator |
| `src/commands/bp-update.ts` | MODIFIED | drop inline `HOOK_TEMPLATE`; rely on OMP provider's `generate()` |
| `src/commands/bp-init.ts` | MODIFIED | drop `HOOK_TEMPLATE` import |
| `package.json` | MODIFIED | add `@oh-my-pi/pi-coding-agent` devDep |
| `tests/integration/omp-extension.test.ts` | NEW | all 11 Verify cases |
| `tests/integration/__snapshots__/omp-extension.test.ts.snap` | NEW | pinned EXTENSION_SOURCE |
| `src/generators/__snapshots__/multi-platform.test.ts.snap` | REGENERATED | now includes `.omp/extensions/bp/index.ts` |
