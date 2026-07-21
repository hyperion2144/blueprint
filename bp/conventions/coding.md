# Coding Conventions

## Language

- Prose, comments, and documentation: English
- Variable names and function names: English

## TypeScript

- Strict mode: `strict: true`
- Module: ESM (`"type": "module"`)
- Target: ES2022
- Path aliases: `@/` → `src/`
- Import extensions: `.js` for ESM resolution (source uses `.js` even in `.ts` files)

## Naming

- Source files: kebab-case (`bp-init.ts`, `artifact-validator.ts`)
- **Markdown files: lowercase** (`proposal.md`, `design.md`, `roadmap.md`)
  - No uppercase filenames (no `PROJECT.md`, `README.md` except root)
  - Cross-references use lowercase
- Functions/variables: camelCase
- Classes/types/interfaces: PascalCase
- Constants: UPPER_SNAKE_CASE
- CLI commands: kebab-case (`bp init`, `bp plan`, `bp archive`)
- Template constants: UPPER_SNAKE_CASE (`PLANNER_PROMPT`, `DESIGN_TEMPLATE`)

## Architecture

- **Core modules** (`src/core/`): Pure logic, no I/O side effects where possible
- **Commands** (`src/commands/`): CLI handlers — gate + output workflow instructions
- **Templates** (`src/templates/`): String constants for workflow instructions, artifact templates, agent prompts
- **Parsers** (`src/parser/`): Markdown/YAML parsing primitives
- **Integrations** (`src/integrations/`): Platform-specific file generators (OMP, Claude Code, .agent)
- **Generators** (`src/generators/`): Multi-platform generation coordination

## Error Handling

- Zod schemas for ALL external input validation (config, schema, context.jsonl)
- Custom error classes: `MiValidationError`, `MiConfigError`, `MiDatabaseError`, `MiNotFoundError`
- `try/catch` with specific error handling — no bare catches
- CLI exit codes: 0 (success), 1 (validation/config/not-found), 2 (database/unknown)
- Gate functions return boolean; callers exit with appropriate code

## Testing

- Framework: Vitest v4+ (node environment)
- Test files: `*.test.ts`, co-located with source
- TDD: type:behavior tasks must follow RED→GREEN→REFACTOR
- Integration tests: temp dir + `execSync` + CLI invocation
- Snapshot tests for generated platform files (`.omp/`, `.claude/`, `.agent/`)
- Run `npx vitest run --update` to update snapshots after intentional generator changes

## Git

- Commit messages: Conventional Commits
- Branch strategy: develop on main unless configured otherwise
- **Commit scopes** (used with `bp commit --scope <scope>`):

| Scope | When to use |
|-------|-------------|
| `core` | Core logic: schema, artifact-validator, continue, config, delta-merge, spec-injector, context-builder, file-tree, brownfield, platform-registry |
| `cli` | CLI entry point (`cli.ts`), commander registration |
| `commands` | `bp-*.ts` command implementations |
| `templates` | Workflow instructions, artifact templates, agent prompts, spec-stacks |
| `parser` | frontmatter, heading-tree, spec-parser, yaml parsers |
| `integrations` | OMP, Claude Code, .agent platform generators |
| `generators` | Multi-platform generation coordination |
| `test` | Test files, test infrastructure, test utilities |
| `docs` | Documentation, `bp/` planning files, specs, summaries |
| `config` | `config.yaml`, `tsconfig`, build config, CI/CD |

- If unsure, pick the closest or omit `--scope` entirely (Conventional Commits allows scopeless commits).

## Workflow Patterns

- **Artifact-based progress**: File existence in `bp/changes/<name>/` is the source of truth — no `state.md`
- **Enablers not gates**: Artifacts enable next steps; `bp continue` recommends, doesn't force
- **Fresh-context sub-agents**: planner/executor/reviewer dispatched via `task` tool with fresh context
- **Delta specs**: ADDED/MODIFIED/REMOVED requirements merge into global specs on archive
- **Context injection**: `context.jsonl` provides per-wave file reference list; OMP Extension auto-injects

## Injection Rule

This file is auto-injected by `bp context` into all step agent contexts.
