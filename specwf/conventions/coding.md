# Coding Conventions

## Language

- Prose, comments, and documentation: English
- Variable names and function names: English

## TypeScript

- Strict mode: `strict: true`
- Module: ESM (`"type": "module"`)
- Target: ES2022
- Path aliases: `@/` → `src/`

## Naming

- Source files: kebab-case (`specwf-init.ts`)
- **Markdown files: lowercase** (`project.md`, `requirements.md`, `state.md`, `roadmap.md`)
  - No uppercase filenames (no `PROJECT.md`, `README.md` except root)
  - Cross-references use lowercase: `see [state.md](state.md)`
- Functions/variables: camelCase
- Classes/types/interfaces: PascalCase
- Constants: UPPER_SNAKE_CASE
- CLI commands: kebab-case (`specwf init`, `specwf update`)

## Testing

- Framework: Vitest
- Test files: `*.test.ts`, co-located with source
- TDD: type:behavior tasks must follow RED→GREEN→REFACTOR

## Git

- Commit messages: Conventional Commits
- Branch strategy: none (develop on main unless configured for phase/milestone branches)

## Injection Rule

This file is auto-injected by `specwf context` into all step agent contexts.
