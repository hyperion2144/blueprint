# Templates — Delta Spec

## SHALL

### SHALL generate commands and skills from single source

- SHALL each workflow step: a single TypeScript module exports both `getXxxSkillTemplate()` and `getXxxCommandTemplate()` sharing the same `instructions` string.
  - GIVEN the `apply` workflow step
  - WHEN `getApplySkillTemplate()` is called
  - THEN it returns a `SkillTemplate` with `instructions` equal to the English workflow body
  - AND `getApplyCommandTemplate()` returns a `CommandTemplate` with `content` equal to the same `instructions` string

### SHALL follow Input/Steps/Output format

- SHALL every `instructions` string: structured with `## Input`, `## Steps` (numbered), `## Output`, and `## Guardrails` sections.
  - GIVEN any workflow template's `instructions`
  - WHEN parsed for section headers
  - THEN headers `## Input`, `## Steps`, `## Output`, `## Guardrails` are all present in order

### SHALL use English for all template content

- SHALL every generated command file (`.omp/commands/blueprint-*.md`): contain only English prose (no Chinese characters).
  - GIVEN a regenerated command file
  - WHEN scanned for CJK Unicode range (U+4E00–U+9FFF)
  - THEN zero matches found
- SHALL every generated skill file (`.omp/skills/blueprint-*/SKILL.md`): contain only English prose.
- SHALL every generated agent file (`.omp/agents/blueprint-*.md`): contain only English prose.
- SHALL every output artifact template (proposal, design, tasks, etc.): contain only English prose.

### SHALL `blueprint continue` output inline instructions

- SHALL `blueprint continue`: the output includes the full `instructions` text of the next workflow step, not just a file path reference.
  - GIVEN current state routes to `plan` step
  - WHEN `blueprint continue` is executed
  - THEN stdout contains the complete plan workflow instructions (Input, Steps, Output sections)
  - AND no file path reference like `.omp/commands/blueprint-plan.md` appears as the primary action

### SHALL templates be TypeScript modules, not markdown files

- SHALL all workflow templates: defined as TypeScript functions in `src/templates/workflows/`, not as `.md` files under `src/public/templates/`.
- SHALL all artifact templates: defined as TypeScript constants in `src/templates/artifacts/index.ts`.
- SHALL all agent prompts: defined as TypeScript constants in `src/templates/agents/index.ts`.
- SHALL `src/public/templates/` directory: not exist after this change.

### SHALL `blueprint template` read from TS registry

- SHALL `blueprint template <type>`: resolve template content from the in-memory TypeScript template registry, not from disk files.
  - GIVEN `blueprint template proposal --name test`
  - WHEN executed
  - THEN a `proposal.md` is created with English content matching the artifact template definition
  - AND no `readFileSync` call accesses `src/public/templates/`

### SHALL `blueprint update` regenerate correctly

- SHALL `blueprint update`: produce output files identical to the current format (frontmatter + body) but with English content and Input/Steps/Output structure.
  - GIVEN a clean blueprint project
  - WHEN `blueprint update` is executed
  - THEN all `.omp/commands/blueprint-*.md` files exist with English content
  - AND all `.omp/skills/blueprint-*/SKILL.md` files exist with English content
  - AND all `.omp/agents/blueprint-*.md` files exist with English content

## MUST

### MUST preserve existing file paths

- MUST all generated files: written to the same paths as before (`.omp/commands/blueprint-<step>.md`, `.omp/skills/blueprint-<step>/SKILL.md`, `.omp/agents/blueprint-<role>.md`).
  - GIVEN the refactored generator
  - WHEN `blueprint update` runs
  - THEN output files land at the same paths as before the refactor

### MUST preserve frontmatter format

- MUST command files: retain YAML frontmatter with `name` and `description` fields.
- MUST skill files: retain YAML frontmatter with `name`, `description`, `hide` fields.
- MUST agent files: retain YAML frontmatter with `name`, `description`, `model`, `thinkingLevel` fields.

### MUST pass existing integration tests

- MUST all existing tests in `tests/`: pass after `blueprint update` regeneration.
  - GIVEN the refactored codebase
  - WHEN `npm test` is executed
  - THEN all test suites pass
