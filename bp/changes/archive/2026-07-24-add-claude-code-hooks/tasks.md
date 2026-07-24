# Tasks: add-claude-code-hooks

## TDD Type Annotations

| type | Meaning | TDD Protocol | Commit type |
|------|---------|-------------|-------------|
| `behavior` | Business behavior - observable, testable feature | RED -> GREEN -> REFACTOR | test + feat + refactor |
| `config` | Configuration - env vars, CI/CD, lint, tsconfig | Direct implementation | chore |
| `refactor` | Improve structure without changing behavior | Verify tests -> refactor -> verify | refactor |
| `docs` | Documentation - README, API docs, comments | Direct implementation | docs |
| `scaffolding` | Skeleton code - module shells, directory structure | Direct implementation | chore |

## Wave 1: Claude Code provider and hook runtime

- [x] T-1: [type:behavior] Generate deterministic five-event Claude settings <!-- commit: f4caced -->
  - **refs**: DS-1
  - **spec_ref**: specs/platform-gen/spec.md#claude-code-hook-runtime
  - **files**: `src/integrations/claude-code/hooks.ts`, `src/integrations/claude-code/hooks.test.ts`, `src/integrations/claude-code/__snapshots__/hooks.test.ts.snap`
  - **acceptance**: parsed `.claude/settings.json` contains exactly `SessionStart`, `SessionStop`, `UserPromptSubmit`, `PreToolUse`, and `PostToolUse`; only the two tool events have matcher `Bash`; every command invokes `.claude/hooks/bp-claude-handler.mjs` with its event; two invocations are byte-identical.
  - **RED**: GIVEN a valid ProjectConfig
    WHEN `generateClaudeHooks(config)` renders settings
    THEN the output contains the five ordered event keys, required command arguments, and Bash matchers only for PreToolUse/PostToolUse
    AND the same config renders identical bytes twice.

- [x] T-2: [type:behavior] Implement Claude handler dispatch and bypass semantics <!-- commit: 95c8605 -->
  - **refs**: DS-2
  - **spec_ref**: specs/platform-gen/spec.md#claude-code-hook-runtime
  - **files**: `src/integrations/claude-code/handler.ts`, `src/integrations/claude-code/handler.test.ts`
  - **acceptance**: SessionStart uses injected context execution and validates wrapper tags; UserPromptSubmit/PreToolUse/PostToolUse return trimmed state; SessionStop is no-op; both disable env vars and missing config bypass; state/context failures use deterministic fallbacks; generated descriptor content is byte-identical.
  - **RED**: GIVEN a configured temporary project and each supported event
    WHEN `dispatchHandler(event, cwd, injectedExecutor)` runs
    THEN SessionStart returns context, prompt/tool events return workflow state, and SessionStop returns no-op
    AND disabled or missing-config projects return bypass without invoking runtime work.

- [x] T-3: [type:behavior] Add independent Claude handler template and provider outputs <!-- commit: 28cd81a -->
  - **refs**: DS-1, DS-2
  - **spec_ref**: specs/platform-gen/spec.md#claude-code-hook-runtime
  - **files**: `src/templates/claude-code/handler.tmpl.ts`, `src/integrations/claude-code/index.ts`, `src/integrations/claude-code/handler.test.ts`, `src/integrations/claude-code/__snapshots__/handler.test.ts.snap`
  - **acceptance**: `generateAll({platform:['claude-code']})` returns existing Claude commands and agents plus settings and handler descriptors; template is independent from Codex; generated handler emits valid `continue`/`hookSpecificOutput` JSON for all five events and exits successfully on bypass.
  - **RED**: GIVEN `claude-code` is the sole configured platform
    WHEN the provider is resolved and generated
    THEN all existing Claude files plus `.claude/settings.json` and `.claude/hooks/bp-claude-handler.mjs` are returned
    AND the generated handler's event output matches the Claude hook JSON contract.
  - **depends_on**: T-1, T-2

## Wave 2: Update cleanup and lifecycle regression

- [x] T-4: [type:behavior] Conservatively clean stale Claude hook files <!-- commit: bf9f41b -->
- [x] T-5: [type:behavior] Preserve four-platform lifecycle generation <!-- commit: bf9f41b -->
- [x] T-6: [type:docs] Add Claude Code hooks integration documentation <!-- commit: bf9f41b -->
- [x] T-7: [type:docs] Write archive-ready Claude platform delta spec <!-- commit: a267906 -->

## Pre-Archive Checklist

- [x] type-check/build passes with no errors
- [x] test suite passes (per project test command)
- [x] Every task in every wave is marked `[x]` with a commit hash
- [x] No `{{` template placeholders remaining in any artifact
- [x] All wave acceptance criteria confirmed


