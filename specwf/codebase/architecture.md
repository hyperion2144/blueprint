# Architecture: specwf

## Overview

specwf is a **spec-driven development workflow CLI** for AI coding agents. It manages a state machine over a 4-layer entity hierarchy (Project → Milestone → Phase → Change) and generates platform-specific agent files (slash commands, agent definitions, skills).

The architecture follows a **layered, bottom-up dependency graph**:

```
types/  →  parser/  →  core/  →  commands/ + generators/ + integrations/
```

No layer depends on a higher layer. `src/cli.ts` is the composition root.

## Layer Map

### Layer 1: `src/types/` — Type definitions (zero deps on other src modules)

| File | Contents |
|------|----------|
| `config.ts` | `ProjectConfig`, `Profile`, `ModelRole`, `ModelMap`, `WorkflowToggles`, `ReviewConfig`, `ChangeConfig`, `GitConfig`, `PROFILE_MODEL_MAP` |
| `project.ts` | `EntityType`, `ChangeStatus`, `Milestone`, `Phase`, `Change`, `ChangeMeta` |
| `state.ts` | `ChangeState`, `StateFile`, `StateTransition`, `STATE_TRANSITIONS` (the full transfer table) |
| `spec.ts` | `HeadingNode`, `ScenarioStep`, `Scenario`, `Requirement`, `SpecSection`, `DeltaSpec`, `MergedSpec` |
| `index.ts` | Barrel re-exports |

### Layer 2: `src/parser/` — Content parsing (depends on types/)

| File | Purpose |
|------|---------|
| `heading-tree.ts` | Parse Markdown into `HeadingNode[]` tree. Stack-based algorithm, supports `#` through `######`. |
| `spec-parser.ts` | Extract structured `SpecSection` from heading tree: `## Purpose` → `### Requirement:` → `#### Scenario:` with RFC 2119 keyword detection |
| `frontmatter.ts` | Wrap `gray-matter` — parse/stringify YAML frontmatter with body |
| `yaml.ts` | Wrap `yaml` (eemeli) Document API — read/write YAML with comment preservation |

### Layer 3: `src/core/` — Core engines (depends on types/ + parser/)

| File | Purpose |
|------|---------|
| `config.ts` | `project.yml` CRUD — load with Zod validation, save with comment preservation, `resolveModels()` for profile → model mapping |
| `state-file.ts` | `state.md` CRUD — frontmatter read/write via gray-matter + Zod schema |
| `state-machine.ts` | Pure-function state machine — `canTransition()`, `getTransition()`, `getNextSteps()`, `getSlashCommand()`, `isValidStatus()` |
| `state-validator.ts` | Exit criteria validation — checks that required artifacts exist before allowing state advance |
| `continue.ts` | Auto-advance logic — reads `state.md`, determines next step, maps to slash command + hint text |
| `spec-injector.ts` | Context injection engine — reads state.md to determine scope (project/phase/change), outputs file manifest with paths and line ranges |
| `delta-merge.ts` | Delta-spec merge engine — heading-tree three-way merge with SHA-256 content fingerprinting and conflict detection |
| `code-extract.ts` | Code cognition extraction — parses `git diff` for behavioral changes, writes AUTO-EXTRACTED sections to spec files |
| `file-tree.ts` | Directory operations — creates `specwf/` skeleton, manages milestone/phase/change/archive directories |
| `brownfield.ts` | Brownfield init — detects project type (JS/TS/Rust/Go/Cargo), generates codebase report, bootstraps specs from source |

### Layer 4a: `src/commands/` — CLI command handlers (depends on core/ + generators/ + prompts/)

Each command file exports a `register(program)` function. 11 commands total:

| File | CLI Command | Key Dependencies |
|------|-------------|------------------|
| `specwf-init.ts` | `specwf init` | `core/config`, `core/file-tree`, `core/state-file`, `core/brownfield`, `prompts/init-wizard`, `generators/index` |
| `specwf-update.ts` | `specwf update` | `core/config`, `generators/index` |
| `specwf-config.ts` | `specwf config` | `core/config` |
| `specwf-state.ts` | `specwf state` | `core/state-file` |
| `specwf-context.ts` | `specwf context <step>` | `core/spec-injector` |
| `specwf-continue.ts` | `specwf continue` | `core/continue` |
| `specwf-archive.ts` | `specwf archive <change>` | `core/delta-merge`, `core/code-extract`, `core/file-tree`, `core/state-file` |
| `specwf-list.ts` | `specwf list` | `core/file-tree` |
| `specwf-template.ts` | `specwf template <id>` | `templates/artifacts` |
| `specwf-change.ts` | `specwf change` | State + file-tree operations |
| `specwf-dispatch.ts` | `specwf dispatch` | Agent dispatch |
| `_utils.ts` | (shared) | `writeGeneratedFiles()` |

### Layer 4b: `src/generators/` + `src/integrations/` — Platform file generation

```
generators/index.ts
  → integrations/omp/commands.ts   (16 slash command .md files)
  → integrations/omp/agents.ts     (8 agent .md files)
  → integrations/omp/skills.ts     (16 skill SKILL.md files)
```

Generators read `ProjectConfig` (from `project.yml`) and produce `{ path, content }[]` arrays. Integration modules handle platform-specific formatting (OMP frontmatter vs Claude Code frontmatter).

### Layer 5: `src/templates/` — Template content (data, not logic)

| Directory | Contents |
|-----------|----------|
| `workflows/` | 16 TypeScript modules, each exporting `getXxxSkillTemplate()` and `getXxxCommandTemplate()` — full workflow instructions |
| `agents/` | `AGENT_PROMPTS` registry — 8 agent system prompt strings |
| `artifacts/` | `ARTIFACT_TEMPLATES` registry — 15+ output document templates (proposal, design, tasks, context, research, verification, reviews, change-summary, codebase-* reports) |
| `workflows/registry.ts` | `WORKFLOW_REGISTRY` — maps `WorkflowStep` → `{ skill, command }` getters, `ALL_WORKFLOW_STEPS` constant |

### Composition Root: `src/cli.ts`

- Creates Commander `program` instance
- Reads `package.json` for version
- Registers all 11 subcommands via `register*()` calls
- Calls `program.parse(process.argv)`

## Entity Model

```
Project
  ├── Milestone (version cycle, e.g., "m1-core")
  │     ├── Phase (work unit, e.g., "Phase 1: 项目骨架")
  │     │     └── Change (unit of work, e.g., "scaffold-project")
  │     │           ├── proposal.md
  │     │           ├── design.md
  │     │           ├── tasks.md
  │     │           ├── change-summary.md
  │     │           └── specs/<domain>/spec.md   (delta-specs)
  │     └── Phase ...
  └── Milestone ...
  └── adhoc/ (temporary changes, no milestone/phase binding)
```

Archived changes move to `specwf/archive/changes/<name>/`.

## State Machine

The state machine is a **finite state transition table** defined in `src/types/state.ts` (`STATE_TRANSITIONS`). Core transitions:

```
Init flow:     initialized → requirements-defined → researching → researched → roadmap-defined → phase-discuss
Phase flow:    phase-discuss → phase-research → phase-split → [change loop]
Change loop:   change-planning → change-applying → change-reviewing → change-verifying → change-archiving → change-archived
Rollback:      change-verifying → change-planning (replan)
               change-verifying → change-applying (reapply)
               change-reviewing → change-applying (fix)
Ship:          change-archived → phase-shipped → milestone-shipped / phase-discuss
Adhoc:         adhoc-proposal → change-planning → ... → adhoc-archived
```

The `state.md` file tracks: project status, active context (entity type + step), all changes with statuses and dependency arrays, and adhoc changes.

## Data Flow: `specwf archive`

```
1. User runs: specwf archive <change-path>
2. archiveHandler() in specwf-archive.ts:
   a. Finds delta-specs in <change>/specs/
   b. mergeDeltaSpecs() → mergeAndWrite() → heading-tree merge with fingerprint check
   c. extractFromGitDiff() → keyword extraction from git diff → writeExtractionToSpec()
   d. archiveChangeDir() → moves directory to specwf/archive/changes/
   e. updateState() → sets change status to "archived" in state.md
```

## Data Flow: `specwf context`

```
1. Agent runs: specwf context <step>
2. contextHandler() in specwf-context.ts:
   a. Calls generateContext(specwfDir, step)
   b. spec-injector.ts reads state.md to determine scope (project/phase/change)
   c. Returns ContextResult with file refs (path + line ranges + optional content)
   d. Terminal output: "Load the following files:" formatted as bullet list
3. Agent reads listed files as context before executing the step
```

## Integration Points

- **OMP:** `.omp/commands/` (slash commands), `.omp/agents/` (agent definitions), `.omp/skills/` (skill guides), `.omp/hooks/`
- **specwf conventions injection:** `conventions/coding.md` is auto-injected by `specwf context` into all step agent contexts
- **Agent delegation:** Step definitions specify whether a step uses sub-agents and which roles to spawn
