# Design: add-claude-code-hooks

## Design Items

### DS-1: Claude Code Hook Configuration and Provider Surface
- **Refs**: PR-1
- **Source**: PR-1 (proposal.md)
- **Responsibility**: Extend the existing Claude Code provider with deterministic five-event settings and handler descriptors.
- **Key Interfaces**: `registerClaudeCodeProvider()`, `generateClaudeHooks(config)`, `buildClaudeHookConfig()`, `generateClaudeHandler(config)`.

#### Detailed Design
`src/integrations/claude-code/hooks.ts` SHALL define the ordered event set `SessionStart`, `SessionStop`, `UserPromptSubmit`, `PreToolUse`, and `PostToolUse`. It SHALL render `.claude/settings.json` as a stable two-space JSON document with a top-level `hooks` object. Each event has one hook group containing `{ type: "command", command: "node .claude/hooks/bp-claude-handler.mjs <EventName>" }`; only `PreToolUse` and `PostToolUse` include `matcher: "Bash"`. The renderer appends one newline and does not read the environment or clock. `generateClaudeHandler` returns a second descriptor at `.claude/hooks/bp-claude-handler.mjs`, sourced solely from the independent Claude Code `HANDLER_SOURCE` template.

`src/integrations/claude-code/index.ts` keeps existing commands and agents and appends hook and handler descriptors. Registration remains idempotent through the existing `PlatformRegistry.has` guard. Invalid platform ids continue to fail before any write through the existing registry resolution path.

### DS-2: Claude Code Deterministic Handler Runtime
- **Refs**: PR-1
- **Source**: PR-1 (proposal.md)
- **Responsibility**: Implement the Claude Code hook runtime and testable dispatch helpers with Codex-parity semantics.
- **Key Interfaces**: `isDisabled()`, `hasBpConfig(cwd)`, `generateContextBlock(cwd, execBpContext?)`, `generateWorkflowState(cwd)`, `dispatchHandler(event, cwd, execBpContext?)`, `generateClaudeHandler(config)`.

#### Detailed Design
`handler.ts` mirrors the Codex helper contract without importing or sharing Codex modules. `isDisabled` returns true for `BP_HOOKS=0` or `BP_DISABLE_HOOKS=1`; `hasBpConfig` checks `<cwd>/bp/config.yaml` and treats missing cwd as false. `generateContextBlock` returns an empty `<bp-context>\\n</bp-context>` block when config is absent, when `bp context apply --format=compact` fails, or when its output is not wrapped by the expected tags. When configured, it invokes `bp` with `execFileSync`, cwd, UTF-8 output, and ignored stdin/stderr. The optional `execBpContext` argument is the dependency-injection seam for deterministic unit tests.

`generateWorkflowState` reads and trims `<cwd>/bp/state.md`, returning `_no state available_` for missing, empty, or unreadable state. `dispatchHandler` returns `{ kind: 'bypass' }` for disabled/missing-config; `SessionStart` returns context; `UserPromptSubmit`, `PreToolUse`, and `PostToolUse` return workflow state; `SessionStop` and unknown events return `{ kind: 'noop' }`.

The generated `.mjs` source is a self-contained near-duplicate of the Codex runtime with Claude-specific comments/path only. It parses the event from `argv[2]`, uses `process.cwd()`, always emits valid Claude hook JSON, and never includes time/randomness or generator-time environment values. Success payloads are exactly `{ continue: true, hookSpecificOutput: { hookEventName: event, additionalContext: payload } }`; bypass/no-op emits `{ continue: true }`. Runtime failures are converted to the deterministic empty context block, not thrown to Claude Code.

### DS-3: Update Cleanup and Regression Coverage
- **Refs**: PR-2
- **Source**: PR-2 (proposal.md)
- **Responsibility**: Remove stale Claude-owned hook outputs while preserving user files and prove four-platform lifecycle compatibility.
- **Key Interfaces**: `cleanupStaleFiles` behavior within `bp update`; lifecycle generation through `generateAll`.

#### Detailed Design
Add exact-path cleanup for `.claude/settings.json` and `.claude/hooks/bp-claude-handler.mjs`: remove each only when it exists and is absent from the current generated path set. Do not remove `.claude/notes.txt`, arbitrary `.claude` entries, or command/agent files that remain current. Cleanup must work when the containing hooks directory is absent and must not throw on already-removed files. Extend update tests with stale and preservation cases; extend lifecycle tests to assert `platform: [omp, claude-code, agent, codex]` remains valid and Claude’s existing commands/agents plus the two hook files are present. No init wizard, dispatch table, config enum, or Codex files are changed.

### DS-4: Documentation and Platform Contract Delta
- **Refs**: PR-3
- **Source**: PR-3 (proposal.md)
- **Responsibility**: Publish Claude Code hook behavior and archive-ready delta requirements.
- **Key Interfaces**: Claude Code section in `docs/platform-integration.md`, platform notes in `README.md` and `AGENTS.md`, `specs/platform-gen/spec.md` delta.

#### Detailed Design
The documentation SHALL describe `.claude/settings.json`, the five event mapping, Bash matchers, handler location, bypass rules, deterministic generation, and conservative cleanup. The delta spec SHALL add `claude-code-hook-runtime` with generation, event, handler, bypass, determinism, and cleanup scenarios, and SHALL modify `SHALL support three platforms: omp, claude-code, agent` to the four-platform wording while preserving existing output behavior. The global spec is listed as the archive target but is not modified in this planning change.

## Architecture Decisions

### D-1: Use Claude Code project settings as the hook contract
- **Status**: ACCEPTED
- **Decision**: Generate `.claude/settings.json` with a top-level `hooks` map and command hook groups.
- **Reason**: This is Claude Code’s project-scoped configuration surface and keeps hook ownership within the existing Claude integration.
- **Alternatives**: Reusing `.codex/hooks.json` would not be discovered by Claude Code; a shared `.bp/hooks` directory would break platform isolation and require additional configuration.

### D-2: Keep an independent handler template
- **Status**: ACCEPTED
- **Decision**: Add `src/templates/claude-code/handler.tmpl.ts` as an independent near-duplicate of the Codex source.
- **Reason**: The proposal explicitly requires platform independence; a separate source keeps generated runtime changes and review ownership isolated while preserving byte determinism.
- **Alternatives**: Parametrizing the Codex template introduces cross-platform coupling; a shared generated handler violates the requested platform boundary. Consolidation is deferred to a future refactor.

### D-3: Preserve the Codex-parity five-event and payload contract
- **Status**: ACCEPTED
- **Decision**: Support only the five selected events and emit the established `continue` plus `hookSpecificOutput.additionalContext` JSON shape.
- **Reason**: It provides predictable parity with the recently shipped integration while explicitly deferring Notification, Stop, SubagentStop, and PreCompact.
- **Alternatives**: Implementing all nine Claude events expands scope and requires additional behavioral contracts; emitting plain text is not a valid Claude hook response.

### D-4: Exact-path conservative cleanup
- **Status**: ACCEPTED
- **Decision**: Delete only the two known generated Claude paths when stale.
- **Reason**: Users may place settings notes or other integrations under `.claude`; broad directory deletion is unsafe.
- **Alternatives**: Removing `.claude` wholesale risks data loss; prefix cleanup is unsuitable because `settings.json` has no bp prefix.

## Technical Approach

### Architecture Diagram
```text
[EXISTING] bp update / generateAll
              |
              v
[MODIFIED] ClaudeCodeProvider [MODIFIED]
       |                         |
       v                         v
[NEW] hooks.ts              [NEW] handler.ts
       |                         |
       v                         v
[NEW] .claude/settings.json [NEW] .claude/hooks/bp-claude-handler.mjs
                                   |
                                   v
                         [EXISTING] bp context / bp/state.md

[MODIFIED] bp-update cleanup ---> exact stale Claude paths
[EXISTING] omp, agent, codex providers remain unchanged
[MODIFIED] docs + platform-gen spec ---> user/archive contract
```

### Core Data Structures
```typescript
interface GeneratedFile {
  path: string;
  content: string;
}

type ClaudeHookEvent =
  | 'SessionStart'
  | 'SessionStop'
  | 'UserPromptSubmit'
  | 'PreToolUse'
  | 'PostToolUse';

interface ClaudeHookConfig {
  hooks: Record<ClaudeHookEvent, Array<{
    matcher?: 'Bash';
    hooks: Array<{ type: 'command'; command: string }>;
  }>>;
}

type HandlerResult =
  | { kind: 'bypass' }
  | { kind: 'context'; payload: string }
  | { kind: 'state'; payload: string }
  | { kind: 'noop' };
```

### Data Flow
1. `generateAll` resolves the existing `claude-code` provider and passes `ProjectConfig` to its generator.
2. The provider emits unchanged commands/agents, then deterministic settings JSON and handler descriptors.
3. `bp update` writes all descriptors and passes their paths to conservative stale cleanup.
4. Claude Code invokes `node .claude/hooks/bp-claude-handler.mjs <event>`; the handler checks bypass/config guards.
5. SessionStart executes `bp context apply --format=compact`; prompt/tool events read `bp/state.md`; SessionStop is a no-op.
6. The handler serializes a valid JSON response on stdout; failures use the empty context block and do not crash the hook process.

### Interface Design

#### `generateClaudeHooks(config)`
- **Request**: `ProjectConfig`.
- **Response 200**: one deterministic descriptor for `.claude/settings.json` with exactly five event keys and Bash matchers on the two tool events.
- **Error**: invalid configuration is rejected by the existing generation/config path with exit code 1 before file writes; no partial Claude output is written.
- **Source**: `specs/platform-gen/spec.md#claude-code-hook-runtime`

#### `generateClaudeHandler(config)`
- **Request**: `ProjectConfig` (content is intentionally independent of runtime environment).
- **Response 200**: one descriptor at `.claude/hooks/bp-claude-handler.mjs`, byte-identical for equal inputs.
- **Error**: malformed config fails generation with exit code 1; runtime subprocess failures are converted to an empty context payload and exit-success JSON.
- **Source**: `specs/platform-gen/spec.md#claude-code-hook-runtime`

#### `dispatchHandler(event, cwd, execBpContext?)`
- **Request**: supported event string, cwd, optional injected context executor.
- **Response 200**: discriminated context/state/no-op result as described in DS-2.
- **Error**: missing cwd/config or disabled environment returns `kind: 'bypass'`; context command failure never escapes the helper.
- **Source**: `specs/platform-gen/spec.md#claude-code-hook-runtime`

#### `bp update --dir <path>`
- **Request**: project directory containing `bp/config.yaml`.
- **Response 200**: generated Claude descriptors are written and stale exact paths are removed.
- **Error**: missing/invalid config follows existing `loadConfig` exit behavior; unrelated `.claude` files are not removed.
- **Source**: `specs/platform-gen/spec.md#claude-code-hook-runtime`

## External Dependencies

| Service | Base URL | Auth | Used For | Source |
|---|---|---|---|---|
| Claude Code hooks protocol | `https://docs.anthropic.com/en/docs/claude-code/hooks` | Local CLI; no credentials in generated files | Project settings schema and command hook event contract | DS-1, DS-2 |

## Impact Analysis

### Direct Impacts
- `src/integrations/claude-code/hooks.ts`: new five-event settings generator.
- `src/integrations/claude-code/handler.ts`: new testable Claude runtime helpers and descriptor.
- `src/integrations/claude-code/index.ts`: include hooks and handler in provider output.
- `src/templates/claude-code/handler.tmpl.ts`: new independent generated runtime source.
- `src/commands/bp-update.ts`: exact stale settings/handler cleanup.
- `tests/commands/bp-update.test.ts`, `tests/integration/lifecycle.test.ts`: cleanup and four-platform regression coverage.
- `src/integrations/claude-code/hooks.test.ts`, `handler.test.ts`, snapshots: new generator/runtime tests.
- `docs/platform-integration.md`, `README.md`, `AGENTS.md`: user-facing parity documentation.
- `bp/changes/add-claude-code-hooks/specs/platform-gen/spec.md`: archive-ready behavior delta.

### Indirect Impacts (callers/dependents)
- `src/generators/index.ts` and `PlatformRegistry.generateAll` consume the modified provider output without API changes.
- `bp update` file count and generated-path cleanup consume the additional descriptors.
- Existing Claude commands/agents snapshots and all OMP/Agent/Codex generation callers must remain byte-compatible.
- `bp/specs/platform-gen/spec.md` will consume the delta during archive; it is not changed during apply until archive merge.

### Test Impacts
- Existing Claude provider/lifecycle snapshots gain only the two explicitly new files; command and agent snapshots remain unchanged.
- Update cleanup tests must cover stale generated paths and preservation of arbitrary `.claude` files.
- Handler tests must cover all five events, both bypass env vars, missing config, malformed/failed context command, state fallback, DI, and byte equality.

## File Manifest

| File Path | Description | Action | Source |
|---|---|---|---|
| `src/integrations/claude-code/hooks.ts` | Claude settings hook config generator | Create | DS-1 |
| `src/integrations/claude-code/hooks.test.ts` | Five-event config shape and determinism tests | Create | DS-1 |
| `src/integrations/claude-code/handler.ts` | Claude runtime helpers and handler descriptor | Create | DS-2 |
| `src/integrations/claude-code/handler.test.ts` | Handler dispatch, bypass, DI, and determinism tests | Create | DS-2 |
| `src/integrations/claude-code/__snapshots__/hooks.test.ts.snap` | Settings JSON snapshot | Create | DS-1 |
| `src/integrations/claude-code/__snapshots__/handler.test.ts.snap` | Handler source snapshot | Create | DS-2 |
| `src/templates/claude-code/handler.tmpl.ts` | Independent byte-deterministic handler source | Create | DS-2 |
| `src/integrations/claude-code/index.ts` | Register hook and handler descriptors | Modify | DS-1 |
| `src/commands/bp-update.ts` | Remove stale exact Claude hook paths | Modify | DS-3 |
| `tests/commands/bp-update.test.ts` | Safe cleanup regression tests | Modify | DS-3 |
| `tests/integration/lifecycle.test.ts` | Four-platform lifecycle regression tests | Modify | DS-3 |
| `docs/platform-integration.md` | Claude Code settings/hooks guide | Modify | DS-4 |
| `README.md` | Claude Code hook parity note | Modify | DS-4 |
| `AGENTS.md` | Claude Code integration note | Modify | DS-4 |
| `bp/changes/add-claude-code-hooks/specs/platform-gen/spec.md` | Delta behavioral contract | Create | DS-4 |
| `bp/specs/platform-gen/spec.md` | Global contract archive target | Modify at archive | DS-4 |
| `bp/changes/add-claude-code-hooks/context.jsonl` | Context reference manifest | Create | DS-4 |

## TDD Strategy
- **behavior tasks**: RED -> GREEN -> REFACTOR (3 commits per task)
- **config/scaffolding/docs**: direct implementation (1 commit per task)
- **refactor**: verify tests pass -> refactor -> verify again

Use Vitest v4 with deterministic temp directories and injected `execBpContext` functions. Snapshot exact JSON and handler bytes. Execute focused Claude integration tests after Wave 1, update/lifecycle tests after Wave 2, then the full configured suite before review. Preserve all existing snapshots except the newly introduced Claude hook/handler snapshots.

## Risks
| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Claude settings schema differs across CLI versions | Hooks are ignored | Medium | Snapshot exact documented top-level `hooks` shape and keep event/matcher set explicit. |
| Handler source and test helper drift | Generated hooks behave differently from unit tests | Medium | Keep independent inline runtime and helper mapping adjacent; test every event and runtime bypass. |
| Cleanup removes user settings | User configuration loss | Low | Remove only exact generated settings/handler paths; test unrelated files remain. |
| Context command output is malformed or unavailable | SessionStart loses context | Medium | Validate wrapper tags and return deterministic empty context while exiting successfully. |
