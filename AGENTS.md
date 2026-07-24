# Repository Guidelines

## Project Overview

Blueprint (`@hyperion2144/blueprint` v2) is a **spec-driven development workflow CLI for AI coding agents**. It structures software changes into a 2-layer architecture (Roadmap + Change) with artifact-based progress detection, YAML schema validation, and fresh-context sub-agents (planner, executor, reviewer).

No state machine — progress is derived from file existence in change directories. Delta specs (ADDED/MODIFIED/REMOVED) capture behavioral contracts at the change level and merge into global specs on archive.

The project dogfoods its own workflow — the `bp/` directory in this repo is an active blueprint project.

---

## Architecture & Data Flow

### High-level structure

```
src/cli.ts (Commander entry)
  → src/commands/bp-*.ts (13 subcommands; 8 core)
  → src/core/*.ts (schema, artifact validation, config, continue engine)
  → src/templates/ (workflow instructions, artifact definitions, agent prompts)
  → src/integrations/*/ (platform-specific generators: OMP, Claude Code, .agent)
```

### Core modules

| Module | Purpose |
|--------|---------|
| `src/core/schema.ts` | YAML schema loading — artifact dependency graph, built-in "spec-driven" schema |
| `src/core/artifact-validator.ts` | Lightweight regex-based validation — checks sections, placeholders, IDs per artifact type |
| `src/core/continue.ts` | Auto-advance engine — artifact-based progress detection, determines next step from file existence |
| `src/core/config.ts` | `config.yaml` read/write with Zod validation + model resolution (profile → ModelMap) |
| `src/core/file-tree.ts` | `bp/` directory operations — create skeleton, change/archive dirs, list active/changes |
| `src/core/delta-merge.ts` | Three-way spec merge: heading-tree + SHA-256 fingerprints + semantic merge (ADDED/MODIFIED/REMOVED) — reused from v1 |
| `src/core/spec-injector.ts` | Context injection per step — determines which specs/conventions/artifacts to inject into agent prompts |
| `src/core/code-extract.ts` | Git diff analysis → behavior/constraint extraction → AUTO-EXTRACTED section backfill |
| `src/core/brownfield.ts` | Existing project detection — detect language/framework/test framework, generate codebase report |
| `src/core/platform-registry.ts` | Plugin system — `PlatformProvider` interface + singleton `PlatformRegistry` for platform file generators |

### Artifact-based progress

Progress is derived from file existence in the change directory — no state machine, no `state.md`:

```
proposal.md  →  design.md + tasks.md  →  code  →  review.md  →  archive
```

Each artifact becomes available when all its prerequisites exist. The schema defines the artifact dependency graph:

- **proposal.md**: captures WHY and WHAT (intent, scope, approach, deliverables)
- **design.md**: structured technical design (DS-N components, D-N decisions, file manifest)
- **tasks.md**: implementation checklist (T-N tasks, waves, TDD annotations)
- **specs/**: delta specs (ADDED/MODIFIED/REMOVED requirements per domain)
- **review.md**: triple review (spec + quality + goal) with verdict

`bp continue` checks which artifacts exist, calculates the next step, and outputs the appropriate workflow instructions.

```
Change loop: propose → plan → apply → review → archive
```

Feedback loop: `review` with `--fix` flag re-runs the affected step (plan or apply) with review findings injected.

---

## Key Directories

| Directory | Contents |
|-----------|---------|
| `src/core/` | Schema, artifact validation, config, file operations |
| `src/commands/` | 13 CLI subcommand implementations (8 core: init, roadmap, propose, plan, apply, review, archive, continue) |
| `src/types/` | TypeScript interfaces (`config.ts`, `spec.ts`, `project.ts`) |
| `src/templates/artifacts/` | 7 output document templates (proposal, design, tasks, spec, review, roadmap, config) |
| `src/templates/workflows/` | Step instruction templates (8 steps: init, roadmap, propose, plan, apply, review, archive, continue) |
| `src/templates/agents/` | Sub-agent system prompts (planner, executor, reviewer) |
| `src/templates/spec-stacks/` | Tech-stack-specific spec templates (typescript-cli, react-web, python-api, etc.) |
| `src/integrations/omp/` | OMP platform generator (commands, skills, agents, hooks) |
| `src/integrations/claude-code/` | Claude Code platform generator (commands, agents) |
| `src/integrations/agent/` | Generic .agent platform generator (skills, agents) |
| `src/integrations/codex/` | OpenAI Codex CLI platform generator (Skills, hooks.json, handler runtime) |
| `src/prompts/` | Interactive init wizard (`@clack/prompts`) |
| `tests/core/` | Unit tests for core modules |
| `tests/integration/` | Integration tests (lifecycle.test.ts, e2e.test.ts, bp.test.ts) |
| `tests/commands/` | CLI subcommand tests |
| `tests/parser/` | Parser unit tests (frontmatter, heading-tree, spec-parser, yaml) |

### bp/ structure

| Path | Contents |
|------|---------|
| `bp/specs/<domain>/spec.md` | Global behavioral specs (source of truth, merged from delta specs on archive) |
| `bp/changes/<name>/` | Active change directory — contains proposal.md, design.md, tasks.md, specs/, review.md |
| `bp/changes/archive/<date>-<name>/` | Completed changes archived by date |
| `bp/conventions/` | Coding conventions auto-injected into sub-agent context |
| `bp/schemas/` | Custom YAML schema definitions (optional, defaults to built-in "spec-driven") |

---

## Development Commands

```bash
npm run build       # tsup bundle → bin/cli.js + declarations
npm test            # Vitest: all tests (unit + integration)
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
- Markdown files: **lowercase** (`roadmap.md`, `proposal.md`, `design.md`, `tasks.md`)
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
- 3 agents: planner (design + tasks + delta specs), executor (TDD waves), reviewer (triple review)
- Each agent has: role, description, tools, execution flow, deviation rules, verification criteria
- Shared constraints (`AGENT_CONSTRAINTS`, `READONLY_CONSTRAINTS`) injected via template variables
- Executor follows strict TDD: RED test → GREEN implementation → REFACTOR (3 commits per behavior task)
- Parallel waves dispatched via `task` tool batch, each wave is one sub-agent

### Validation
- YAML schema (`bp/schemas/`) defines artifact dependency graph — optional, defaults to built-in "spec-driven"
- Artifact validator (`src/core/artifact-validator.ts`) uses lightweight regex checks:
  - Section presence (`## Intent`, `## Wave`, etc.)
  - Unreplaced template placeholders (`{{...}}`)
  - ID patterns (PR-N, DS-N, T-N)
  - Delta spec structure (ADDED/MODIFIED/REMOVED, SHALL/MUST keywords, Given/When/Then scenarios)
- No formal grammar (PEG) compilation — artifacts are validated structurally, not syntactically

### Progress management
- File existence in `bp/changes/<name>/` is the source of truth — no `state.md`, no state machine
- `bp continue` reads change directory, checks artifact presence, determines next step
- No concurrent-process locking (single-user CLI)
- Fix loops use `--fix` flag — `bp plan --fix` or `bp apply --fix` injects review findings

---

## Important Files

| File | Purpose |
|------|---------|
| `src/cli.ts` | CLI entry point — Commander.js, registers 13 subcommands (8 core) |
| `src/core/schema.ts` | YAML schema loading + artifact dependency graph |
| `src/core/artifact-validator.ts` | Lightweight regex validation for artifacts |
| `src/core/continue.ts` | Auto-advance engine — artifact-based progress detection |
| `src/core/config.ts` | Config management (`config.yaml`) |
| `src/templates/agents/index.ts` | All 3 sub-agent system prompts (planner, executor, reviewer) |
| `src/templates/workflows/registry.ts` | 8-step workflow registry (init, roadmap, propose, plan, apply, review, archive, continue) |
| `src/templates/artifacts/index.ts` | All 7 output document templates (proposal, design, tasks, spec, review, roadmap, config) |
| `src/commands/bp-continue.ts` | Artifact-based continue — determines next step without state machine |
| `src/commands/bp-archive.ts` | Change archiving + delta-merge + code backfill |
| `src/types/config.ts` | `Profile`, `ProjectConfig`, `ModelMap` types |
| `bp/config.yaml` | Project configuration (profile, schema, platform, rules) |
| `bp/roadmap.md` | Living document — defines milestones, phases, planned changes |
| `bp/conventions/coding.md` | Official coding conventions (auto-injected into sub-agent context) |

---

## Runtime/Tooling Preferences

- **Runtime**: Node.js ≥ 20 (ESM)
- **Package manager**: npm
- **Build**: `tsup` (ESM bundle with shebang + declarations)
- **Test**: Vitest v4+ (node environment)
- **Schema**: YAML (custom schemas in `bp/schemas/`, built-in default)
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
tests/parser/         — Parser unit tests (frontmatter, heading-tree, spec-parser, yaml)
```

### Test patterns
- Integration tests create temp dirs, `git init`, run `execSync('node bin/cli.js ...')`
- Helper functions: `cli()`, `expectBlocked()`, `expectAdvanced()`, `expectState()`
- `VALID_*` constants define valid input files
- Snapshot tests for generated platform files (`.omp/`, `.claude/`, `.agent/`, `.codex/`, `.agents/`)
- Run `npx vitest run --update` to update snapshots after intentional generator changes

### Running tests
```bash
npm test              # Full suite
npx vitest run        # Full suite (same)
npx vitest run tests/integration/lifecycle.test.ts  # Single test file
npx vitest run --update  # Update snapshots
```

### Coverage
- Full test suite: 16 test files
- Integration lifecycle test covers the full init→archive flow
- Snapshot tests cover all 3 platform generators
- No official coverage threshold enforced

## Context Injection (OMP Extension)

The OMP platform ships a generated Extension at `.omp/extensions/bp/index.ts`
and a legacy shim at `.omp/hooks/pre/bp.ts`. The Extension is regenerated by
`bp update` from the byte-deterministic template in
`src/templates/omp/extension.tmpl.ts`.

### Contract

- `session_start` emits a `<bp-context>...</bp-context>` custom message. The
  block is a paths-only compact payload; sub-agent discrimination (planner /
  executor / reviewer) appends `## Roadmap State`, inline `context.jsonl`
  rows (with `> GUARD-RAIL:` prefix), or `## Invariants` + `tasks.md`
  acceptance, respectively.
- `before_agent_start` returns a `bp-workflow-state` custom message derived
  from `bp/state.md`.
- `context` re-injects the workflow-state message after compaction when no
  recent `bp-workflow-state` exists.
- Sub-agents (planner/executor/reviewer) **never call** `bp context <step>`
  themselves — the Extension injects the context automatically. The
  `bp-auto-context-injection` change (PR-1..PR-4) locks this contract.
### Disabling

Set either environment variable before starting OMP to short-circuit every
handler (no messages sent, no side effects):

```bash
BP_HOOKS=0           # preferred
BP_DISABLE_HOOKS=1   # alias
```

Handlers also no-op when `bp/config.yaml` is missing at the session cwd.
