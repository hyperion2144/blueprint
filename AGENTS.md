# Repository Guidelines

## Project Overview

Blueprint (`@hyperion2144/blueprint` v0.5.0) is a **spec-driven development workflow CLI for AI coding agents**. It structures software projects into a nested state machine (Project → Milestone → Phase → Change) with PEG-validated artifacts, fresh-context sub-agents, and a CLI auto-advancer (`bp continue`).

The project dogfoods its own workflow — the `bp/` directory in this repo is an active blueprint project.

---

## Architecture & Data Flow

### High-level structure

```
src/cli.ts (Commander entry)
  → src/commands/bp-*.ts (15 subcommands)
  → src/core/*.ts (state machine, validation, continue engine)
  → src/templates/ (workflow instructions, artifact definitions, agent prompts)
  → src/integrations/*/ (platform-specific generators: OMP, Claude Code, .agent)
  → src/generators/index.ts (multi-platform dispatcher)
```

### Core modules

| Module | Purpose |
|--------|---------|
| `src/core/state-file.ts` | `state.md` read/write with Zod validation + file-based locking (`.state.lock`, spin-wait 3s) |
| `src/core/state-machine.ts` | Pure-function state machine: `canTransition`/`getTransition`/`getNextSteps` from `STATE_TRANSITIONS` table |
| `src/core/continue.ts` | Auto-advance engine — determines next step from state, maps workflow templates, expands template variables |
| `src/core/state-validator.ts` | Exit condition validation per step — PEG-validates documents, checks task completion, artifact presence |
| `src/core/config.ts` | `project.yml` read/write with Zod validation + model resolution (profile → ModelMap) |
| `src/core/validate/index.ts` | Document validation engine — 5 dimensions (FORM/FILL/ENUM/REFS/COVERAGE), per-type validators |
| `src/core/validate/grammar/` | 15 PEG grammar files (`.peggy` → `.cjs`): requirements, context, proposal, design, tasks, 3 reviews, etc. |
| `src/core/file-tree.ts` | `bp/` directory operations — create skeleton, milestone/phase/change dirs, archive, list |
| `src/core/delta-merge.ts` | Three-way spec merge: heading-tree + SHA-256 fingerprints + semantic merge (ADDED/MODIFIED/REMOVED) |
| `src/core/spec-injector.ts` | Context injection per step — determines which specs/conventions/artifacts to inject into agent prompts |
| `src/core/code-extract.ts` | Git diff analysis → behavior/constraint extraction → AUTO-EXTRACTED section backfill |
| `src/core/brownfield.ts` | Existing project detection — detect language/framework/test framework, generate codebase report |
| `src/core/platform-registry.ts` | Plugin system — `PlatformProvider` interface + singleton `PlatformRegistry` for platform file generators |

### State machine transitions

```
init → grill → research → roadmap → discuss → research-phase → split
  → proposal → plan → apply → review → archive → [next change or next phase]
  → ship (milestone complete)
```

Feedback loops: `review → fix-plan → fix-apply → review` (reapply) and `review → replan` (redesign).

---

## Key Directories

| Directory | Contents |
|-----------|---------|
| `src/core/` | State machine, validation engine, config, file operations |
| `src/commands/` | 15 CLI subcommand implementations |
| `src/types/` | TypeScript interfaces (`state.ts`, `project.ts`, `config.ts`, `spec.ts`) |
| `src/templates/artifacts/` | 27 output document templates (proposal, design, tasks, reviews, specs, etc.) |
| `src/templates/workflows/` | Step instruction templates (apply, archive, discuss, plan, review, etc.) |
| `src/templates/agents/` | Sub-agent system prompts (researcher, planner, executor, reviewer, etc.) |
| `src/templates/spec-stacks/` | Tech-stack-specific spec templates (typescript-cli, react-web, python-api, etc.) |
| `src/integrations/omp/` | OMP platform generator (commands, skills, agents, hooks) |
| `src/integrations/claude-code/` | Claude Code platform generator (commands, agents) |
| `src/integrations/agent/` | Generic .agent platform generator (skills, agents) |
| `src/generators/` | Multi-platform file generation dispatcher |
| `src/prompts/` | Interactive init wizard (`@clack/prompts`) |
| `tests/core/` | Unit tests for core modules |
| `tests/integration/` | Integration tests (lifecycle.test.ts, e2e.test.ts, bp.test.ts) |
| `tests/commands/` | CLI subcommand tests |
| `tests/e2e/` | OMP RPC E2E test protocol (Python driver) |

---

## Development Commands

```bash
npm run build       # Compile PEG grammars → tsup bundle → bin/cli.js + declarations
npm test            # Vitest: all tests (unit + integration + e2e)
npx vitest run      # Same as npm test
npx vitest          # Watch mode
npx vitest run --update  # Update snapshots
node bin/cli.js     # Run CLI in dev mode (no install needed)
```

---

## Code Conventions & Common Patterns

### TypeScript
- **Strict mode**: `strict: true`
- **Module**: ESM (`"type": "module"`, imports with `.js` extensions)
- **Target**: ES2022
- **Path alias**: `@/` → `src/`

### Naming
- Source files: `kebab-case.ts`
- Markdown files: **lowercase** (`state.md`, `roadmap.md`, not `STATE.md`)
- Functions/variables: `camelCase`
- Classes/types/interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- CLI commands: `bp-kebab-case`

### Error handling
- Zod schemas for ALL external input validation
- Custom error classes: `MiValidationError`, `MiConfigError`, `MiDatabaseError`, `MiNotFoundError`
- CLI exits: 0 (success), 1 (validation/config/not-found), 2 (database/unknown)
- `try/catch` with specific error handling — no bare catches

### Sub-agent patterns
- System prompts in `src/templates/agents/index.ts` exported as template literals
- Each agent has: role, description, tools, execution flow, deviation rules, verification criteria
- Shared constraints (`AGENT_CONSTRAINTS`, `READONLY_CONSTRAINTS`) injected via template variables
- Executor follows strict TDD: RED test → GREEN implementation → REFACTOR (3 commits per behavior task)
- Parallel waves dispatched via `task` tool batch, each wave is one sub-agent

### Validation
- PEG grammars (`.peggy`) compiled to `.cjs` via Peggy
- Validation pipeline: FORM (syntax) → FILL (no placeholders) → ENUM (allowed values) → REFS (cross-doc refs) → COVERAGE (PR→DS→T chain)
- `error()` in PEG actions for specific error messages (avoids silent `?`/`*` fallthrough)
- Semantic checks in `src/core/validate/index.ts` per document type

### State management
- `state.md` is the single source of truth — Zod-validated YAML-like markdown
- `flock`-based file locking (`.state.lock`) prevents concurrent-process corruption
- State transitions are pure functions — no side effects in `canTransition`/`getTransition`
- `bp continue` reads state, validates exit conditions, advances, outputs step instructions

---

## Important Files

| File | Purpose |
|------|---------|
| `src/cli.ts` | CLI entry point — Commander.js, registers all subcommands |
| `src/core/state-file.ts` | State persistence + locking |
| `src/core/state-machine.ts` | State transition logic |
| `src/core/continue.ts` | Auto-advance engine |
| `src/core/validate/index.ts` | Document validation dispatcher |
| `src/core/config.ts` | Config management |
| `src/templates/agents/index.ts` | All 7 sub-agent system prompts |
| `src/templates/workflows/` | Step-by-step instructions for each workflow stage |
| `src/templates/artifacts/index.ts` | All 27 output document templates |
| `src/commands/bp-continue.ts` | Most complex command — orchestrates advancement + phase transitions |
| `src/commands/bp-archive.ts` | Change archiving + delta-merge + code backfill |
| `src/types/state.ts` | `STATE_TRANSITIONS` table — defines all legal state changes |
| `bp/project.yml` | Project configuration (profile, platform, workflow toggles) |
| `bp/conventions/coding.md` | Official coding conventions (auto-injected into sub-agent context) |
| `bp/state.md` | Current state file (auto-managed) |

---

## Runtime/Tooling Preferences

- **Runtime**: Node.js ≥ 20 (ESM)
- **Package manager**: npm
- **Build**: `tsup` (ESM bundle with shebang + declarations)
- **Test**: Vitest v4+ (node environment)
- **Validation**: Peggy (PEG grammar compiler)
- **CLI**: Commander.js
- **Prompts**: `@clack/prompts` (interactive wizard)
- **Lint**: biome (format + lint)
- **Platform targets**: OMP (primary), Claude Code, .agent

---

## Testing & QA

### Test framework
- **Vitest v4+** with node environment
- Test config: `vitest.config.ts`

### Test locations
```
tests/core/           — Unit tests (pure logic, minimal disk I/O)
tests/integration/    — Integration tests (temp dir + execSync + bp CLI)
tests/commands/       — Single-command tests
tests/e2e/            — OMP RPC E2E (Python driver + fixtures)
tests/parser/         — Parser unit tests (no file I/O)
```

### Test patterns
- Integration tests create temp dirs, `git init`, run `execSync('node bin/cli.js ...')`
- Helper functions: `cli()`, `expectBlocked()`, `expectAdvanced()`, `expectState()`
- `VALID_*` constants define valid input files
- Snapshot tests for generated platform files (`.omp/`, `.claude/`, `.agent/`)
- Run `npx vitest run --update` to update snapshots after intentional generator changes

### Running tests
```bash
npm test              # Full suite
npx vitest run        # Full suite (same)
npx vitest run tests/integration/lifecycle.test.ts  # Single test file
npx vitest run --update  # Update snapshots
```

### Coverage
- Full test suite: 155+ tests, 24 test files (v0.5.0)
- Integration lifecycle test covers the full init→archive→ship flow
- Snapshot tests cover all 3 platform generators
- No official coverage threshold enforced
