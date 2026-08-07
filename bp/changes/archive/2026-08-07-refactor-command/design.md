# Design: refactor-command

## Design Items

### DS-1: refactor Workflow Template (skill + command)

- **Refs**: PR-1
- **Source**: PR-1 (proposal.md)
- **Responsibility**: Provide the canonical English instructions body for the `refactor` workflow step and expose both `getRefactorSkillTemplate()` and `getRefactorCommandTemplate()` so every platform generator (omp / claude-code / opencode / agent / codex) shares the same source of truth.
- **Key Interfaces**: `getRefactorSkillTemplate(): SkillTemplate`, `getRefactorCommandTemplate(): CommandTemplate`; the resulting `instructions` string is the orchestrator-facing body emitted to `.omp/commands/bp-refactor.md`, `.claude/commands/bp-refactor.md`, `.opencode/commands/bp-refactor.md`, `.agent/skills/bp-refactor/SKILL.md`, `.agents/skills/bp-refactor/SKILL.md`.

#### Detailed Design

`src/templates/workflows/refactor.ts` exports two functions returning the standard `SkillTemplate` / `CommandTemplate` shape. Both wrap the same `instructions` string. The body is a single Markdown text built from `ORCHESTRATOR_RULE` (so it carries the orchestrator framing used by every workflow template) and `CONTEXT_JSONL_REMINDER` (so the orchestrator knows context is auto-injected by the OMP Extension). The body then declares Input / Orchestrator Steps / Output / Guardrails sections to match the existing `SHALL follow Input/Steps/Output format` invariant.

The instruction body for `refactor` describes the FIVE canonical orchestrator steps:

1. **Run `bp refactor analyze <target>`** — invokes the deterministic analyzer (`bp refactor analyze` subcommand), which writes `bp/.refactor-report.md` and prints a stdout summary. The orchestrator never invokes a different / non-deterministic analysis surface.
2. **Show the report and obtain explicit human confirmation** — the orchestrator MUST display `bp/.refactor-report.md` to the user and pause for `yes | no | scope: <reduced target>` before any dispatch.
3. **Dispatch `bp dispatch refactorer --change <name> | --target <module>` per affected module** — one isolated dispatch per module (one-shot module isolation per platform).
4. **Per-dispatch: refactorer applies behavior-preserving consolidation + spec sync** — the refactorer sub-agent keeps the test suite green and edits only the affected `bp/specs/<domain>/spec.md` files.
5. **Summarize the diff** — the orchestrator prints a `git diff --stat` + the changed-spec list, then returns to the user.

The body includes guardrails enforcing the design constraints from PR-1/PR-3: NO use of `bp plan` or `bp/changes/` lifecycle artifacts (refactor is a standalone auxiliary step, like `ff` / `loop`); no code edits before explicit confirmation; spec edits limited to the affected domains from the report; the analyzer cannot be replaced by LLM judgment (the deterministic `bp refactor analyze` is the only source of evidence).

Both `getRefactorSkillTemplate()` and `getRefactorCommandTemplate()` MUST resolve to a body containing `## Input`, `## Steps`, `## Output`, `## Guardrails` (English-only prose, no CJK characters) and MUST share the same `instructions` string so a single template edit propagates to all five platform outputs.

### DS-2: WORKFLOW_REGISTRY refactor Entry

- **Refs**: PR-1
- **Source**: PR-1 (proposal.md)
- **Responsibility**: Register `refactor` as a typed key of `WORKFLOW_REGISTRY` so `getWorkflowInstructions('refactor')` resolves from the in-memory registry and every platform generator that iterates `WORKFLOW_REGISTRY` (or `WORKFLOW_REGISTRY[step]`) produces the refactor artifact.
- **Key Interfaces**: `WorkflowStep` type from `WORKFLOW_REGISTRY` keys; `getWorkflowInstructions('refactor', bpDir?)` from `src/core/continue.ts` returns the template body; `bp refactor` CLI resolves the body through `getWorkflowInstructions`.

#### Detailed Design

`src/templates/workflows/registry.ts` adds `import { getRefactorSkillTemplate, getRefactorCommandTemplate } from './refactor.js'` and appends `refactor: { skill: getRefactorSkillTemplate, command: getRefactorCommandTemplate }` to `WORKFLOW_REGISTRY`. The `as const satisfies Record<string, WorkflowEntry>` constraint widens the map type so that `WorkflowStep = keyof typeof WORKFLOW_REGISTRY` resolves to the union of the existing 10 step keys plus `'refactor'`. This widens `WorkflowStep` everywhere it is referenced (e.g. `agent/skills.ts`'s `STEPS: readonly WorkflowStep[]`, `codex/skills.ts`'s `STEPS: readonly WorkflowStep[]`, `claude-code/commands.ts`'s `STEPS`, `opencode/commands.ts`'s `STEPS`, `omp/commands.ts`'s `STEPS`).

The platform command / skill generators that consume the registry already enumerate their steps independently via a typed local `STEPS` array — adding `refactor` to the registry does NOT cause those generators to emit a new file. The integration test in DS-5 (CLI dispatch + lifecycle golden file) covers the by-step addition to each platform's local `STEPS`. The registry entry alone provides:

- `getWorkflowInstructions('refactor')` resolves correctly when invoked by `bp refactor`.
- The `bp refactor` CLI handler can print the step body without special-casing.
- Future platform additions pick up `refactor` automatically because the type union is now widened.

Validation invariants after the change: every existing platform tests plus the new dispatcher call must observe `WORKFLOW_REGISTRY['refactor'].command().content` non-empty and equal to `getRefactorCommandTemplate().content`.

### DS-3: Platform STEP_DEFS / STEPS / AGENT_DEFS Additions (omp / claude-code / opencode / agent / codex)

- **Refs**: PR-1
- **Source**: PR-1 (proposal.md)
- **Responsibility**: Emit `bp-refactor` slash command / skill files and `bp-refactorer` agent files on every supported platform so the orchestrator can invoke `/bp-refactor <target>` from any installed platform.
- **Key Interfaces**:
  - `STEP_DEFS[]` (`src/integrations/omp/commands.ts`) — adds a `refactor` entry: `{ step: 'refactor', name: 'bp:refactor', description: 'Run deterministic refactor analyzer and dispatch refactorer sub-agents per module', usesAgent: false, agents: [], argumentHint: '<target>' }`.
  - `STEPS[]` in `claude-code/commands.ts`, `opencode/commands.ts`, `agent/skills.ts`, `codex/skills.ts` — append `{ step: 'refactor', description: ..., argumentHint: '<target>' }`.
  - `AGENT_DEFS[]` in `src/integrations/omp/agents.ts`, `src/integrations/claude-code/agents.ts`, `src/integrations/opencode/agents.ts`, `src/integrations/agent/agents.ts` — append `{ role: 'refactorer', description: 'Behavior-preserving consolidation + spec sync per assigned module', tools: [], spawns: '*' / mode: 'subagent' / effort: 'high' / ... }`.

#### Detailed Design

For OMP (`src/integrations/omp/commands.ts`): append one entry to `STEP_DEFS` with `name: 'bp:refactor'` (no colon prefix on the role; OMP convention), `usesAgent: false` (the OMP command itself doesn't auto-spawn — the orchestrator does), `argumentHint: '<target>'`. `generateSlashCommand` calls `WORKFLOW_REGISTRY['refactor'].command().content` — that resolves through DS-2 and emits the body from DS-1.

For Claude Code (`src/integrations/claude-code/commands.ts`): append `{ step: 'refactor', name: 'bp:refactor', description: 'Run deterministic refactor analyzer and dispatch refactorer sub-agents per module', argumentHint: '<target>' }` to `STEPS`. Frontmatter: `name: bp:refactor`, optional `argument-hint`.

For OpenCode (`src/integrations/opencode/commands.ts`): append `{ step: 'refactor', description: 'Run deterministic refactor analyzer and dispatch refactorer sub-agents per module', argumentHint: '<target>' }` to `STEPS`. Frontmatter uses OpenCode format with `description` only.

For Agent platform — `src/integrations/agent/skills.ts`: the file declares `const STEPS: readonly WorkflowStep[]` — change that literal to include `'refactor'` AND extend `skillDescription()` to include `refactor: 'Run deterministic refactor analyzer and dispatch refactorer sub-agents per module'`. The generated `.agent/skills/bp-refactor/SKILL.md` frontmatter is `name: bp-refactor`, `description: <from skillDescription>`, `hide: false`.

For Codex (`src/integrations/codex/skills.ts`): append `'refactor'` to the `STEPS` array and add a `codexSkillDescription` entry `refactor: 'Run deterministic refactor analyzer and dispatch refactorer sub-agents per module'`. The generated `.agents/skills/bp-refactor/SKILL.md` uses the Codex colon slash format `name: bp:refactor`.

Agent defs across all four platforms (`src/integrations/omp/agents.ts`, `src/integrations/claude-code/agents.ts`, `src/integrations/opencode/agents.ts`, `src/integrations/agent/agents.ts`): append the `refactorer` role to `AGENT_DEFS[]` with the platform-specific shape (matching the existing `planner/executor/reviewer/codebase-scanner` entries). The `tools` field on the refactorer agent MUST include `edit`/`write`/`bash` (consolidating requires code edits and running tests). `AGENT_PROMPTS['refactorer']` resolves to the `REFACTORER_PROMPT` defined in DS-6 — `generateAgent`/`generateClaudeAgent`/`generateOpenCodeAgent`/`generateAgentAgent` look up `AGENT_PROMPTS[role]` with a fallback, so the same single export powers all four generators.

Each platform's command snapshot test must be updated to include the new `bp-refactor` file (`npx vitest run --update`). The multi-platform golden-file snapshot (in `src/generators/multi-platform.test.ts`) regenerates to include the new paths.

### DS-4: bp refactor CLI Command

- **Refs**: PR-1
- **Source**: PR-1 (proposal.md)
- **Responsibility**: `bp refactor <target> [--format=full|short] [--change <name>]` outputs the refactor step instructions to stdout (the orchestrator executes them). `bp refactor analyze <target>` runs the deterministic analyzer (DS-7) and writes `bp/.refactor-report.md` plus a stdout summary. No file editing happens via the refactor CLI itself.
- **Key Interfaces**: `register(program)` exported from `src/commands/bp-refactor.ts`; `registerBpRefactor(program)` added to `src/cli.ts`. Two subcommands:
  - `refactor <target> [args]` → `getWorkflowInstructions('refactor', bpDir)` → stdout.
  - `refactor analyze <target>` → `runRefactorAnalyzer(target, options)` → `writeRefactorReport(...)` + `printReportSummary(...)`.

#### Detailed Design

`src/commands/bp-refactor.ts` follows the same shape as `src/commands/bp-propose.ts` (kebab-case filename, register a Commander command, gate on `findBpDir()`, then dispatch through the named subcommand). Subcommand parsing uses Commander's `.command('<verb> <target>')` chain so the orchestrator can run `bp refactor analyze src/core` directly.

The top-level `refactor <target>` handler:

- Resolves `bpDir` via `findBpDir()`. If `bpDir` is undefined, write `Not in a blueprint project. Run "bp init" first.` to stderr and `process.exit(1)`.
- Validates `<target>` is a non-empty relative path (kebab-case module path or `.` for whole repo). Empty target → `Usage: bp refactor <target> [--change <name>]` to stderr, exit `1`.
- Calls `getWorkflowInstructions('refactor', bpDir)`. If `undefined` (custom schema missing + registry miss), error `Refactor workflow instructions not found.` to stderr, exit `1`. Otherwise `console.log(instructions)`.
- Exits with `0`.

The `refactor analyze <target>` handler:

- Resolves `bpDir`. Missing → exit `1`.
- Calls `loadConfig(bpDir)`. Failure → exit `1` with the underlying config error.
- Locates the analyzed root: defaults to `<cwd>`. When `<target>` is `.` or empty → analyze the whole repo. When a module path like `src/core` → filter the map to that module.
- Invokes `runRefactorAnalyzer({ rootDir: <cwd>, target, thresholds: <from config refactor.thresholds>, map: loadMap(bpDir) })` from `src/core/refactor-analyzer.ts`.
- The function returns `{ report: <markdown string>, summary: <stdout summary string>, perModule: <array of FindingEvidence> }`.
- Writes `bp/.refactor-report.md`. If `bp/` does not exist (`bpDir` is required, but the `bp/.refactor-report.md` requires `bpDir` + path), ensure parent directory via `mkdirSync(join(bpDir, '.refactor-report.md parent'), { recursive: true })`.
- Prints `summary` to stdout (human-friendly: number of fragmented modules, duplications found, flat modules, low-reuse modules, depth ratio distribution).
- Returns exit `0` on success, `1` on validation / analyzer failure, `2` on disk write failure.

`src/cli.ts` adds `import { register as registerRefactor } from './commands/bp-refactor.js'` and a `registerRefactor(program)` line; no other CLI imports change.

If users invoke `bp refactor analyze` against an unbuilt map, the analyzer rebuilds the map first (mirrors `bp map refresh` behavior by calling `generateCodebaseMap(rootDir)` then `writeCodebaseMap(bpDir, map)`), ensuring freshness without forcing the user to remember a separate command.

### DS-5: Deterministic Refactor Analyzer (engine + four metrics + depth ratio)

- **Refs**: PR-2
- **Source**: PR-2 (proposal.md)
- **Responsibility**: Compute per-module evidence for the four anti-patterns (fragmentation, duplication, flatness, low reuse) plus a deep-module depth ratio; emit a deterministic structured report consumed by the refactorer sub-agent.
- **Key Interfaces**: `runRefactorAnalyzer(opts: AnalyzerOptions): AnalyzerResult` exported from `src/core/refactor-analyzer.ts`. `AnalyzerOptions = { rootDir: string; target: string; thresholds: RefactorThresholds; map: CodebaseMap }`. `AnalyzerResult = { report: string; summary: string; perModule: FindingEvidence[]; fingerprint: string }`. `FindingEvidence = { module, filePaths: string[], metric, value, threshold, evidence: EvidencePointer[] }`.

#### Detailed Design

`src/core/refactor-analyzer.ts` is a deterministic TS engine. Inputs:

- `rootDir` — repository root (path). Used for filesystem reads during the duplication scan only.
- `target` — `.` (whole repo) or `src/<module>/<sub>` (module path filter). Empty `''` defaults to `.`.
- `thresholds` — `RefactorThresholds` Zod schema (see DS-8). Defaults documented in analyzer source and applied via `loadConfig(bpDir).refactor?.thresholds ?? defaults`.
- `map` — result of `loadMap(bpDir)` or a freshly-built `generateCodebaseMap(rootDir)` when `loadMap` returns null / fingerprint stale. Fingerprint staleness uses `isMapStale` from `codebase-map.ts` (no git needed).

**Algorithm — per module:**

1. **Resolve target module(s)**. If `target === '.'` iterate every module in `map.modules`; otherwise pick the module(s) whose path matches the `target` prefix.
2. **Fragmentation**: a module is `fragmented` iff (a) every file in that module has `exports.length <= fragmentation.exportsMax` (default `2`) AND (b) at least one file is below the per-file line threshold (default `<= 50` non-blank lines). Findings include the list of file paths and their line counts.
3. **Duplication**: scan every text file under `target`'s source roots. Sliding-window n-gram with `n=15` (configurable `duplication.gramSize`). Cross-file similarity = number of shared 5-gram shingles ÷ total 5-gram shingles of the smaller file (Jaccard-like normalization). Pairs whose similarity `>= threshold` (default `0.8`) are reported as `DuplicationPair { leftPath, rightPath, similarity, sampleShingles[] }`.
4. **Flatness**: a module is `flat` iff its directory tree contains no subdirectory beyond the module's own root (depth ≤ `1`) OR fewer than `flatness.subdirMin` (default `2`) sibling directories at the same level under the module path.
5. **Low reuse**: a module is `low reuse` iff `fanIn <= lowReuse.fanInMax` (default `1`) AND `totalExports >= lowReuse.exportsMin` (default `3`). `fanIn` is computed from the cross-module `imports` data in `map.modules`: for each other module that lists `<module>` in `dependsOn`, count `+1`.
6. **Deep-module depth ratio**: per module, compute `depthRatio = nonBlankImplLines / interfaceExportCount + Math.log1p(fanIn)`. Implementation lines come from file line counts under the module. The header reports the depth ratio distribution (min / median / max) for the target scope.

**Output:**

- `report` — a deterministic Markdown string:
  - Header: `# Refactor Report`, generation timestamp (ISO date only — no clock minute/second to keep it diff-friendly), scope (`target`), thresholds used.
  - Section per module: name, files, exports, fan-in, depth-ratio; for each triggered finding the evidence block (file paths / line numbers / similarity numbers).
  - Section `## Summary` listing counts.
- `summary` — a single paragraph for stdout: `"Refactor report for <target>: <N> fragmented, <N> duplicated pairs, <N> flat, <N> low-reuse. Median depth ratio <X> (deepest: <M>). See bp/.refactor-report.md."`
- `perModule` — structured array for programmatic consumers (refactorer sub-agent reads it via file, but this shape is exposed for tests).
- `fingerprint` — `hash` of the report content (used to dedupe consecutive `bp refactor analyze` calls).

Determinism: all sorts stable (file paths sorted lexicographically); no `Math.random` / `Date.now` / env lookups; evidence pointers reproduce the same line numbers across runs.

Error paths: missing config → exit `1` with `MiConfigError`; invalid threshold shape → Zod parse error; analysis throws on filesystem error wrapped to `MiNotFoundError`; analyzer does NOT auto-modify code.

### DS-6: Refactorer Sub-Agent Prompt + detectAgentType Branch

- **Refs**: PR-3
- **Source**: PR-3 (proposal.md)
- **Responsibility**: Define the `refactorer` sub-agent system prompt (one source of truth in TS) so that every generated platform agent file (`.omp/agents/bp-refactorer.md`, `.claude/agents/bp-refactorer.md`, `.opencode/agents/bp-refactorer.md`, `.agent/agents/bp-refactorer.md`) renders the same role; add a `detectAgentType('refactorer')` branch in the OMP extension so the extension correctly discriminates the new sub-agent.
- **Key Interfaces**:
- `REFACTORER_PROMPT: string` exported from `src/templates/agents/index.ts`; `AGENT_PROMPTS['refactorer'] = REFACTORER_PROMPT`.
- `AgentType = 'planner' | 'executor' | 'reviewer' | 'refactorer' | 'default'` in `src/integrations/omp/extension-runtime.ts`.
- `detectAgentType(ctx)` returns `'refactorer'` when `ctx.agentTemplate.includes('refactorer')`.

#### Detailed Design

`src/templates/agents/index.ts` defines `REFACTORER_PROMPT` as a `const` string. The prompt reuses the shared `AGENT_CONSTRAINTS` and a `BEHAVIOR_PRESERVATION` block (added to `shared.ts` only if needed; otherwise inline in the prompt). Structure:

- `## Role`: "You are the refactorer sub-agent. You receive (a) the path to `bp/.refactor-report.md`, (b) a single module path you are dispatched to refactor. You consolidate that module toward deep modules with behavior preserved. You keep `npm test` green at every step."
- `## Inputs`: paths to the report and to the module.
- `## Behaviors`:
  - **Read** `bp/.refactor-report.md`; locate the section for the assigned module.
  - **Analyze** — list candidate consolidation moves (merge fragmented siblings, extract shared helper for duplicated blocks, introduce subdirectory for flat layouts, merge low-reuse utility into an existing module that already imports it).
  - **Plan** — write the proposed moves as a brief Markdown list inside the response.
  - **Apply** — make one move at a time, run `npm test`, commit each successful move via `bp commit "refactor(<scope>): <description>"`.
  - **Spec sync** — for each module whose file structure changed, locate the affected `bp/specs/<domain>/spec.md` section, edit ONLY the behavioral contracts that reference the changed file paths or exports. Do NOT touch unrelated domains.
  - **Diff summary** — print `git diff --stat` plus the changed-spec list at the end.
- `## Guardrails`:
  - NEVER rename exported symbols without updating all callers and the affected spec.
  - NEVER alter observable behavior. If a test fails after a move, REVERT the move and report.
  - NEVER edit specs outside the affected domains listed in the report.
  - NEVER introduce new dependencies or format/lint changes.
  - STOP after dispatching ONE module — return control to the orchestrator.

The prompt is a single constant string. Adding `export const REFACTORER_PROMPT = \`...\`;` and adding `refactorer: REFACTORER_PROMPT,` to `AGENT_PROMPTS` is the entire edit.

`src/integrations/omp/extension-runtime.ts` changes:

- Widen the `AgentType` union: `export type AgentType = 'planner' | 'executor' | 'reviewer' | 'refactorer' | 'default'`.
- Extend `detectAgentType`: add `if (tpl.includes('refactorer')) return 'refactorer';` before the `default` return.
- Extend `renderAugmentedBody` to render an additional `## Refactor Targets` section when `agentType === 'refactorer'`: read `bp/.refactor-report.md` and inline its summary block (header + `## Summary`); ensure the orchestrator has the report context for the assigned module.

The OMP extension handler tests (`tests/integration/omp-extension.test.ts`) must be extended to cover the new `refactorer` discrimination branch.

### DS-7: Global Spec Updates for refactor (workflow documentation)

- **Refs**: PR-4
- **Source**: PR-4 (proposal.md)
- **Responsibility**: Add behavioral-contract requirements to `bp/specs/platform-gen/spec.md` and `bp/specs/templates/spec.md` documenting the new step / analyzer / refactorer behavior. This is the "update related specs" piece of the change itself, executed via merge into the global specs at archive time.
- **Key Interfaces**: Delta spec files under `bp/changes/refactor-command/specs/` listed in DS-9; global spec files `bp/specs/platform-gen/spec.md` and `bp/specs/templates/spec.md` modified at archive time (not during apply).

#### Detailed Design

Delta spec content for `specs/platform-gen/spec.md`:

- `## ADDED Requirements` — `Refactor-Step-Generation` (the `bp-refactor` slash command / skill) with Given/When/Then scenarios asserting (1) every supported platform generates a `bp-refactor` file when the step is added, (2) the path conventions per platform remain stable, (3) the per-platform frontmatter stays platform-specific (Codex colon name, Claude argument-hint, OpenCode description-only).
- `## ADDED Requirements` — `Refactor-Analyzer-Contract` with Given/When/Then scenarios asserting (1) the analyzer writes `bp/.refactor-report.md`, (2) the analyzer summarizes to stdout, (3) thresholds from `bp/config.yaml` `refactor.thresholds` override the documented defaults.

Delta spec content for `specs/templates/spec.md`:

- `## ADDED Requirements` — `Refactor-Workflow-Template` with Given/When/Then asserting (1) `getRefactorSkillTemplate()` and `getRefactorCommandTemplate()` share the same `instructions` string, (2) the body contains `## Input`, `## Steps`, `## Output`, `## Guardrails` sections in English only, (3) `WORKFLOW_REGISTRY['refactor']` is a typed entry.
- `## ADDED Requirements` — `Refactorer-Agent-Prompt` with Given/When/Then asserting (1) `AGENT_PROMPTS['refactorer']` exists and equals `REFACTORER_PROMPT`, (2) `REFACTORER_PROMPT` includes the behavior-preservation guardrails and the spec-sync constraint.

For `specs/general/spec.md`: since the existing `general` spec is purely auto-extracted legacy content (no behavioral contracts), the change uses `general/spec.md` ONLY as a third delta domain — no ADDED/MODIFIED requirements are contributed there. The proposal's `## general` mention is honored by writing the delta to `specs/general/spec.md` only if the orchestrator accepts a delta with no new requirements as a no-op archive; if the validator rejects empty deltas, the change skips this file and the affected-domain list resolves to two (platform-gen + templates). TheORCHESTRATOR is informed via the design's Impact Analysis. To remove ambiguity, this design lists the canonical affected domains as TWO (`platform-gen` and `templates`); the third leg of the refactorer contract (behavior preservation + spec sync) is folded into the `templates` delta under a `Refactorer-Behavior-Preservation` requirement.

### DS-8: Refactor Threshold Config Schema

- **Refs**: PR-2
- **Source**: PR-2 (proposal.md)
- **Responsibility**: Extend `ProjectConfigSchema` in `src/core/config.ts` with a `refactor.thresholds` block applying default values that the analyzer reads and human users override.
- **Key Interfaces**: `ProjectConfigSchema.refactor` Zod object; `RefactorThresholds` exported type used by the analyzer; `loadConfig(bpDir).refactor.thresholds` resolution with defaults applied.

#### Detailed Design

In `src/core/config.ts`:

```typescript
const RefactorThresholdsSchema = z.object({
  fragmentation: z.object({
    exportsMax: z.number().int().positive().default(2),
    fileLinesMax: z.number().int().positive().default(50),
  }).default({}),
  duplication: z.object({
    similarityMin: z.number().min(0).max(1).default(0.8),
    gramSize: z.number().int().positive().default(15),
  }).default({}),
  flatness: z.object({
    maxDepth: z.number().int().nonnegative().default(1),
    subdirMin: z.number().int().nonnegative().default(2),
  }).default({}),
  lowReuse: z.object({
    fanInMax: z.number().int().nonnegative().default(1),
    exportsMin: z.number().int().positive().default(3),
  }).default({}),
}).default({});
```

Insert into `ProjectConfigSchema`:

```typescript
refactor: z.object({ thresholds: RefactorThresholdsSchema }).default({ thresholds: {} }),
```

The `refactor.thresholds` block defaults are documented in spec scenarios (DS-7) and used by DS-5's `runRefactorAnalyzer({ thresholds: loadConfig(bpDir).refactor.thresholds })`. When the user does not override, `loadConfig` returns the defaults applied.

`saveConfig` (in `src/core/config.ts`) already round-trips the full config object via the YAML `Document`, so adding a new optional field does not lose data; existing v2 configs without `refactor` continue to validate successfully because the schema applies defaults.

A new helper `getRefactorThresholds(config: ProjectConfig): RefactorThresholds` (exported) returns the (possibly defaulted) thresholds object — used by the analyzer for explicit access without re-defaulting.

### DS-9: Delta Spec Files (per affected domain)

- **Refs**: PR-1, PR-2, PR-3, PR-4
- **Source**: PR-4 (proposal.md) and cross-cutting per-PR spec obligations
- **Responsibility**: Provide the behavioral contract inputs the executor will satisfy under RED tests; the orchestrator merges them into the global specs at archive time.
- **Key Interfaces**: `bp/changes/refactor-command/specs/platform-gen/spec.md`, `bp/changes/refactor-command/specs/templates/spec.md` — each with `## ADDED Requirements` blocks carrying SHALL/MUST/SHOULD statements and Given/When/Then scenarios.

#### Detailed Design

`specs/platform-gen/spec.md` delta content: requirements listed in DS-7 covering generator + analyzer contract.

`specs/templates/spec.md` delta content: requirements listed in DS-7 covering workflow template + refactorer prompt.

The delta specs MUST use the bolded `**GIVEN** / **WHEN** / **THEN** / **AND**` scenario format enforced by the validator; every Requirement MUST have at least one Scenario block.

For `general/spec.md`: see DS-7 — the third domain is collapsed into the templates delta (`Refactorer-Behavior-Preservation`) to keep the affected-domain list at exactly two. If the orchestrator requires three domains, `specs/general/spec.md` carries a single `## ADDED Requirements` block with one placeholder Requirement: a behavior-preservation requirement traced to PR-3 with Given/When/Then scenarios.

### DS-10: Refactor Report File Path & Schema (intermediate artifact)

- **Refs**: PR-2, PR-3
- **Source**: PR-2 (proposal.md), PR-3 (proposal.md)
- **Responsibility**: Define the on-disk contract for `bp/.refactor-report.md` so the refactorer sub-agent reads a stable, machine-greppable evidence document.
- **Key Interfaces**: `writeRefactorReport(bpDir: string, report: string): void`; `readRefactorReport(bpDir: string): string | undefined`; the report header is `# Refactor Report` and contains a `## Summary` followed by `## Module: <modulePath>` sections, each containing `### Fragmentation`, `### Duplication`, `### Flatness`, `### Low Reuse`, `### Depth Ratio` subsections when evidence exists.

#### Detailed Design

`src/core/refactor-analyzer.ts` exports `writeRefactorReport(bpDir, report)` which:

1. Computes `reportPath = join(bpDir, '.refactor-report.md')`.
2. `mkdirSync(dirname(reportPath), { recursive: true })` (idempotent — safe when `bp/` exists).
3. `writeFileSync(reportPath, report, 'utf-8')` with a trailing newline.

`readRefactorReport(bpDir)` returns `undefined` when the file is missing; the refactorer prompt's `## Inputs` block lists both the report path and `bp/` so the sub-agent can locate it via the assigned dispatch `--change <name>` or `--target <module>` argument.

The header line is `# Refactor Report`. The first paragraph carries the run scope (`target: <scope>`), thresholds used, and an ISO date (`YYYY-MM-DD`). The `## Summary` section precedes module sections to make grep-friendly extraction by the refactorer cheap.

## Architecture Decisions

### D-1: Refactor is a workflow step, not a `bp/changes/` lifecycle change

- **Status**: ACCEPTED
- **Decision**: Register `refactor` in `WORKFLOW_REGISTRY` and emit `bp-refactor` slash command / skill on every platform; the orchestrator invokes the refactor flow without creating a proposal/plan/review per run.
- **Reason**: The proposal explicitly chose standalone auxiliary-step semantics (like `ff` / `loop`) over the full change lifecycle. Refactor must be lightweight to use: every run is one tool call to `/bp-refactor <target>` rather than proposal/plan/apply/review/archive five-step ceremony.
- **Alternatives**: Making refactor a `bp/changes/refactor-<date>` change would add proposal/plan artifacts the user explicitly rejected; refactor is structural maintenance, not feature work.

### D-2: Static analysis is deterministic; LLM does not judge

- **Status**: ACCEPTED
- **Decision**: Refactor evidence is generated by a TS analyzer (`src/core/refactor-analyzer.ts`) that runs n-gram similarity, exports/fan-in counting, depth ratio math, and writes a structured Markdown report. The refactorer sub-agent reads the report but does not re-judge the metrics.
- **Reason**: Duplication detection and fan-in counting require exact, reproducible counts — LLM judgment is unreliable and non-reproducible. The report is the human-confirmation gate, so evidence must be auditable.
- **Alternatives**: Asking the refactorer LLM to evaluate "is this module fragmented" — rejected due to non-determinism and false positives. A pre-existing tool like `jscpd` was rejected due to integration overhead and adding an external dependency.

### D-3: Refactorer dispatch is per-module with executor-style isolation

- **Status**: ACCEPTED
- **Decision**: After human confirmation, the orchestrator dispatches `bp dispatch refactorer --target <module>` once per affected module. Each dispatch uses the same isolation machinery as executor (omp `isolated: true`, claude-code `worktree: <change>-<wave>`, agent/codex `git worktree add`).
- **Reason**: Per-module isolation keeps the blast radius small — a bad consolidation revert does not corrupt the whole refactor. Reusing executor isolation reuses platform-tested logic.
- **Alternatives**: One big dispatch over all modules — rejected due to blast radius. A bespoke dispatch path just for refactorer — rejected due to platform divergence.

### D-4: Spec sync is part of the refactorer dispatch, not a follow-up step

- **Status**: ACCEPTED
- **Decision**: The refactorer updates the affected `bp/specs/<domain>/spec.md` contracts as part of its single dispatch (not as a post-refactor `bp spec refresh` run).
- **Reason**: Spec contracts must be truthful at the moment refactor lands; otherwise a subsequent feature change built on stale specs will see drift before any reconciliation.
- **Alternatives**: A separate `bp spec refresh --apply` after refactor — rejected because it lets contracts be stale between refactor and sync, and the diff visible in the same dispatch lets humans review code + spec together.

### D-5: Refactor CLI is a passive dispatcher — no analysis or rewrite

- **Status**: ACCEPTED
- **Decision**: `bp refactor <target>` outputs step instructions (mirrors `bp plan` / `bp apply`). `bp refactor analyze <target>` runs the analyzer and writes the report. Both never edit code or specs; the orchestrator does.
- **Reason**: Consistency with every other `bp-*` step. CLI step commands are about gating and outputting instructions, not doing work. The orchestrator (and the dispatched refactorer agent) are the actors.
- **Alternatives**: Making `bp refactor` an orchestrator that auto-dispatches refactorer — rejected because it removes the human gate and bypasses the deterministic analyzer.

### D-6: Thresholds live in `bp/config.yaml` `refactor.thresholds`, defaults documented

- **Status**: ACCEPTED
- **Decision**: `ProjectConfigSchema` grows a `refactor.thresholds` block with Zod defaults. When the field is absent, the analyzer uses defaults. Defaults are documented in the delta spec scenarios.
- **Reason**: Config-driven thresholds let users tune the engine without code changes. Defaults cover the common case so an empty `refactor:` section is valid.
- **Alternatives**: Hardcoded thresholds — rejected because every codebase has different size / shape characteristics. A separate `bp-config get|refactor` style sub-command — overkill for v2.

### D-7: Standalone step choice, no `bp/changes/refactor-*/` lifecycle

- **Status**: ACCEPTED
- **Decision**: No `bp/changes/refactor-<date>/` directory is created. The refactor flow's evidence file `bp/.refactor-report.md` lives inside the project root alongside `bp/config.yaml` and is reviewable via plain `git diff`.
- **Reason**: The user explicitly chose standalone over lifecycle integration. Reporting under `bp/.refactor-report.md` (gitignored of nothing — committed for review) keeps evidence version-controlled without change-folder ceremony.
- **Alternatives**: Per-run folders — rejected as ceremony overhead. Writing the report outside `bp/` — rejected because `bp/` already owns structure artifacts.

## Technical Approach

### Architecture Diagram

```text
[EXISTING] bp CLI + WORKFLOW_REGISTRY
       |
       ├──> [NEW] src/templates/workflows/refactor.ts
       |        └──> getRefactorSkillTemplate / getRefactorCommandTemplate
       |
       ├──> [MODIFIED] src/templates/workflows/registry.ts
       |        └──> WORKFLOW_REGISTRY['refactor'] = { skill, command }
       |
       ├──> [MODIFIED] src/integrations/{omp,claude-code,opencode}/commands.ts
       |                   └──> append 'refactor' to STEP_DEFS / STEPS
       |
       ├──> [MODIFIED] src/integrations/{omp,claude-code,opencode,agent}/agents.ts
       |                   └──> append 'refactorer' to AGENT_DEFS
       |
       ├──> [MODIFIED] src/integrations/{agent,codex}/skills.ts
       |                   └──> append 'refactor' to STEPS + skillDescription
       |
       └──> [NEW] src/commands/bp-refactor.ts
              ├──> refactor <target> -> getWorkflowInstructions('refactor')
              └──> refactor analyze <target>
                     |
                     v
[NEW] src/core/refactor-analyzer.ts
   ├──> reuse: loadMap(bpDir) / isMapStale / generateCodebaseMap
   ├──> compute 4 metrics + depth ratio
   ├──> write bp/.refactor-report.md
   └──> stdout summary

[NEW] src/templates/agents/index.ts REFACTORER_PROMPT
   └──> AGENT_PROMPTS['refactorer'] = REFACTORER_PROMPT

[MODIFIED] src/integrations/omp/extension-runtime.ts
   ├──> AgentType += 'refactorer'
   └──> detectAgentType branch + renderAugmentedBody '## Refactor Targets'

[MODIFIED] src/core/config.ts
   └──> ProjectConfigSchema += refactor: { thresholds: RefactorThresholdsSchema }

[EXISTING] bp dispatch <role>  --[NEW role: refactorer]--> per-module dispatch (executor isolation reused)
```

### Core Data Structures

```typescript
// src/core/refactor-analyzer.ts (DS-5)
export interface RefactorThresholds {
  fragmentation: { exportsMax: number; fileLinesMax: number };
  duplication:   { similarityMin: number; gramSize: number };
  flatness:      { maxDepth: number; subdirMin: number };
  lowReuse:      { fanInMax: number; exportsMin: number };
}

export interface EvidencePointer { file: string; lines: [number, number]; note: string }
export interface FragmentationFinding { file: string; exports: number; lines: number }
export interface DuplicationPair { left: string; right: string; similarity: number; sampleShingles: string[] }
export interface FindingEvidence {
  module: string;
  fragmentation: FragmentationFinding[];
  duplication: DuplicationPair[];
  flat: boolean;
  lowReuse: { fanIn: number; exports: number };
  depthRatio: number;
}

export interface AnalyzerOptions {
  rootDir: string;
  target: string;
  thresholds: RefactorThresholds;
  map: CodebaseMap;
}

export interface AnalyzerResult {
  report: string;
  summary: string;
  perModule: FindingEvidence[];
  fingerprint: string;
}

// src/core/config.ts (DS-8)
const RefactorThresholdsSchema = z.object({
  fragmentation: z.object({
    exportsMax: z.number().int().positive().default(2),
    fileLinesMax: z.number().int().positive().default(50),
  }).default({}),
  duplication: z.object({
    similarityMin: z.number().min(0).max(1).default(0.8),
    gramSize: z.number().int().positive().default(15),
  }).default({}),
  flatness: z.object({
    maxDepth: z.number().int().nonnegative().default(1),
    subdirMin: z.number().int().nonnegative().default(2),
  }).default({}),
  lowReuse: z.object({
    fanInMax: z.number().int().nonnegative().default(1),
    exportsMin: z.number().int().positive().default(3),
  }).default({}),
}).default({});
```

### Data Flow

1. User runs `/bp-refactor <target>` from any installed platform.
2. The platform invokes `bp refactor <target>` (CLI dispatcher); the CLI resolves `getWorkflowInstructions('refactor', bpDir)` from `WORKFLOW_REGISTRY` and prints the orchestrator instructions to stdout.
3. Orchestrator reads the printed instructions and executes Step 1: `bp refactor analyze <target>`.
4. `bp refactor analyze` loads `bp/config.yaml`, reads `refactor.thresholds`, calls `loadMap(bpDir)`; if missing or stale, rebuilds via `generateCodebaseMap` + `writeCodebaseMap`.
5. Analyzer computes four metrics + depth ratio per module, writes `bp/.refactor-report.md`, prints stdout summary, exits 0.
6. Orchestrator displays the report to the user and pauses for `yes | no | scope:`.
7. On confirmation, orchestrator iterates affected modules and dispatches `bp dispatch refactorer --target <module>` once per module using existing `EXECUTOR_ISOLATION` machinery.
8. Each refactorer sub-agent reads the assigned module section of the report, performs one consolidation move at a time, runs `npm test`, commits via `bp commit "refactor(<scope>): ..."`.
9. After each module's moves, refactorer edits ONLY the listed `bp/specs/<domain>/spec.md` files touching contracts that reference the changed file paths / exports.
10. Orchestrator prints `git diff --stat` + the changed-spec list after the last dispatch and returns control to the user.

### Interface Design

#### CLI `bp refactor <target>`

- **Headers**: none
- **Arguments**: `<target>` (string, required) — module path or `.` for whole repo
- **Options**:
  - `--change <name>` (string, optional) — change context (default: none)
  - `--format full|short` (string, optional, default `full`) — `full` = print orchestrator instructions; `short` = print just the first step
- **Response 200** (stdout): the complete refactor step instructions from `WORKFLOW_REGISTRY['refactor']`
- **Response 1** (stderr): `Not in a blueprint project. Run "bp init" first.` when `findBpDir()` returns undefined; `Usage: bp refactor <target> [--change <name>]` when target is empty; `Refactor workflow instructions not found.` when registry miss
- **Source**: `specs/templates/spec.md#Refactor-Workflow-Template`

#### CLI `bp refactor analyze <target>`

- **Headers**: none
- **Arguments**: `<target>` (string, required)
- **Options**:
  - `--change <name>` (string, optional)
- **Response 200** (stdout): summary string `Refactor report for <target>: <N> fragmented, <N> duplicated pairs, ...`. Side-effect: writes `bp/.refactor-report.md`.
- **Response 1** (stderr): config validation error / invalid threshold / missing `bp/`
- **Response 2** (stderr): disk write failure (cannot create `bp/.refactor-report.md`)
- **Source**: `specs/platform-gen/spec.md#Refactor-Analyzer-Contract`

#### `runRefactorAnalyzer(opts: AnalyzerOptions): AnalyzerResult` (exported from `src/core/refactor-analyzer.ts`)

- **Request**: `AnalyzerOptions` — `{ rootDir, target, thresholds, map }`
- **Response 200**: `AnalyzerResult` with deterministic `report`, `summary`, `perModule`, `fingerprint`
- **Error**: throws `MiNotFoundError` when `target` resolves to no module; throws `MiConfigError` when thresholds fail Zod parse; throws on filesystem errors during the duplication scan
- **Source**: `specs/platform-gen/spec.md#Refactor-Analyzer-Contract`

#### `writeRefactorReport(bpDir, report)` / `readRefactorReport(bpDir)`

- **Request**: `bpDir` (string) and the report content (write) or none (read)
- **Response 200 (write)**: void after `writeFileSync` to `bp/.refactor-report.md`; `Response 200 (read)`: report string when present, `undefined` when absent
- **Error (write)**: throws on disk failure (caller maps to exit `2`)
- **Source**: `specs/platform-gen/spec.md#Refactor-Analyzer-Contract`

#### `dispatch refactorer` — `bp dispatch refactorer --target <module>`

- **Request**: role `refactorer`, optional `--change`, required `--target`
- **Response 200**: standard dispatch instruction block (platform-specific dispatch format); isolation line uses `EXECUTOR_ISOLATION[platform]` because refactorer requires the same executor worktree isolation
- **Error**: exit `1` when the target module is invalid or when isolation info is missing for a configured platform
- **Source**: `specs/general/spec.md#Refactorer-Behavior-Preservation`

## External Dependencies

No external services or new libraries. Existing dependencies (`commander`, `yaml`, `zod`, `node:fs`, `node:path`) cover the analyzer / CLI / generator additions. No new `package.json` entries.

## Impact Analysis

### Direct Impacts

- `src/templates/workflows/refactor.ts` (new, DS-1): exports `getRefactorSkillTemplate()` / `getRefactorCommandTemplate()` matching the existing dual-export contract enforced by `specs/templates/spec.md#SHALL generate commands and skills from single source`.
- `src/templates/workflows/registry.ts` (modify, DS-2): adds the `refactor` entry; widens the `WorkflowStep` type everywhere.
- `src/integrations/omp/commands.ts` (modify, DS-3): append a `STEP_DEFS` entry for `refactor`; `generateSlashCommand` walks `WORKFLOW_REGISTRY` and picks the new entry's body.
- `src/integrations/omp/agents.ts` (modify, DS-3): append an `AGENT_DEFS` entry for `refactorer`; resolves `AGENT_PROMPTS['refactorer']`.
- `src/integrations/claude-code/commands.ts` (modify, DS-3): append `refactor` to `STEPS`.
- `src/integrations/claude-code/agents.ts` (modify, DS-3): append `refactorer` to `AGENT_DEFS`.
- `src/integrations/opencode/commands.ts` (modify, DS-3): append `refactor` to `STEPS`.
- `src/integrations/opencode/agents.ts` (modify, DS-3): append `refactorer` to `AGENT_DEFS`.
- `src/integrations/agent/skills.ts` (modify, DS-3): append `'refactor'` to `STEPS`; add `skillDescription('refactor')`.
- `src/integrations/agent/agents.ts` (modify, DS-3): append `refactorer` to `AGENT_DEFS`.
- `src/integrations/codex/skills.ts` (modify, DS-3): append `'refactor'` to `STEPS`; extend `codexSkillDescription`.
- `src/commands/bp-refactor.ts` (new, DS-4): CLI dispatcher with `refactor` and `refactor analyze` subcommands.
- `src/cli.ts` (modify, DS-4): import + `registerRefactor(program)` line.
- `src/core/refactor-analyzer.ts` (new, DS-5, DS-10): deterministic analyzer engine and report writer.
- `src/templates/agents/index.ts` (modify, DS-6): new `REFACTORER_PROMPT` exported constant + `AGENT_PROMPTS['refactorer']` entry.
- `src/integrations/omp/extension-runtime.ts` (modify, DS-6): widen `AgentType`; add `refactorer` branch in `detectAgentType`; add `## Refactor Targets` augmentation.
- `src/core/config.ts` (modify, DS-8): add `RefactorThresholdsSchema` + `refactor: { thresholds }` block to `ProjectConfigSchema`; export `getRefactorThresholds`.

### Indirect Impacts (callers/dependents)

- `src/commands/bp-dispatch.ts` already iterates `ROLE_TEMPLATES` per role; because `refactorer` is not in the existing `ROLE_TEMPLATES` map (only `planner`/`executor`/`reviewer`), the dispatcher must default `ROLE_TEMPLATES['refactorer'] = []` to avoid undefined spread. The `EXECUTOR_ISOLATION` lookup works as-is because the dispatch checks `role === 'executor'` first; the new `refactorer` role needs a new branch that ALSO returns executor isolation (DS-3, DS-6 logic).
- `src/core/continue.ts` `getWorkflowInstructions('refactor', bpDir)` resolves through the registry — the new entry makes it return the refactor body.
- Snapshot tests in `src/integrations/claude-code/__snapshots__/`, `src/integrations/omp/__snapshots__/` (if present) and the multi-platform golden-file test in `src/generators/multi-platform.test.ts` must include the new files (regenerated via `npx vitest run --update`).
- `tests/commands/bp-dispatch.test.ts` adds roles; current `ROLE_TEMPLATES` access assumes three known roles.
- `tests/integration/omp-extension.test.ts` covers the new `refactorer` discrimination branch.
- `bp/specs/platform-gen/spec.md` and `bp/specs/templates/spec.md` are modified at archive time by the delta spec merge — not during apply.
- The `bp config set` / `bp config get` CLI commands gain a path for `refactor.thresholds.*` keys because `saveConfig` round-trips full objects.

### Test Impacts

- Generator snapshot tests: golden-file updates for every platform; per-platform STEPS array length assertions (`files.length === 10` becomes `11` in commands.test.ts and friends).
- Integration `lifecycle.test.ts` four-platform regression: `platform: [omp, claude-code, agent, codex]` plus `bp-refactor` files in the resulting file sets.
- `tests/integration/omp-extension.test.ts`: `detectAgentType({ agentTemplate: 'bp-refactorer' })` returns `'refactorer'`; `renderAugmentedBody({ agentType: 'refactorer', ... })` includes `## Refactor Targets` when the report exists.
- New `tests/core/refactor-analyzer.test.ts`: deterministic findings on a fixture tree (two fragmented files, one duplicated block pair, one flat directory, one low-reuse module); threshold override changes the findings.

| File Path | Description | Action | Source |
|-----------|-------------|--------|--------|
| `src/templates/workflows/refactor.ts` + `refactor.test.ts` | Dual-export `getRefactorSkillTemplate` / `getRefactorCommandTemplate` with section-presence + English-only test | Create | DS-1 |
| `src/templates/workflows/registry.ts` | Append `refactor` entry to `WORKFLOW_REGISTRY` (also widens the `WorkflowStep` type used by every per-platform `STEPS`) | Modify | DS-2 |
| `src/integrations/{omp,claude-code,opencode}/commands.ts` + `src/integrations/{agent,codex}/skills.ts` + per-platform `_test` files | Append `refactor` entry to each platform's local `STEP_DEFS` / `STEPS` plus the matching `skillDescription` / `codexSkillDescription` and update STEPS-length assertions / snapshots | Modify | DS-3 |
| `src/integrations/{omp,claude-code,opencode,agent}/agents.ts` + per-platform `_test` files | Append `refactorer` role to each platform's `AGENT_DEFS` (resolves `AGENT_PROMPTS['refactorer']`); snapshots regenerate via `npx vitest run --update` | Modify | DS-3, DS-6 |
| `src/integrations/claude-code/__snapshots__/commands.test.ts.snap` + `agents.test.ts.snap` + `src/generators/multi-platform.test.ts` + `tests/integration/lifecycle.test.ts` | Golden-file snapshot updates for `bp-refactor.md` / `bp-refactorer.md` and four-platform lifecycle regression coverage | Modify | DS-3 |
| `src/commands/bp-refactor.ts` + `bp-refactor.test.ts` | CLI: `bp refactor <target>` (prints step body) and `bp refactor analyze <target>` (runs analyzer + writes report) | Create | DS-4 |
| `src/cli.ts` | Register the new `bp-refactor` Commander command | Modify | DS-4 |
| `src/core/refactor-analyzer.ts` + `refactor-analyzer.test.ts` | Deterministic analyzer engine + report writer; export `runRefactorAnalyzer`, `writeRefactorReport`, `readRefactorReport` | Create | DS-5, DS-10 |
| `src/templates/agents/index.ts` + new `tests/templates/agents-refactorer.test.ts` | New `REFACTORER_PROMPT` constant + `AGENT_PROMPTS['refactorer']` registration | Modify | DS-6 |
| `src/integrations/omp/extension-runtime.ts` + `extension-runtime.test.ts` + `tests/integration/omp-extension.test.ts` | Widen `AgentType`; add `refactorer` branch in `detectAgentType`; render `## Refactor Targets` in `renderAugmentedBody` | Modify | DS-6 |
| `src/core/config.ts` + `config.test.ts` | Add `RefactorThresholdsSchema` and `refactor: { thresholds }` to `ProjectConfigSchema`; export `getRefactorThresholds` helper | Modify | DS-8 |
| `src/commands/bp-dispatch.ts` + `tests/commands/bp-dispatch.test.ts` | Allow `refactorer` role; route to executor isolation so per-module dispatch uses platform worktrees | Modify | DS-3 |
| `bp/changes/refactor-command/specs/{platform-gen,templates,general}/spec.md` | Delta behavioral contracts (ADDED requirements with Given/When/Then scenarios) for archive-time merge | Create | DS-7, DS-9 |
| `bp/specs/{platform-gen,templates}/spec.md` (archive-time) + `docs/platform-integration.md` | Global spec archive targets (merged at archive, not during apply) and a new `## Refactor step` documentation section | Modify at archive | DS-7 |

> Note: file manifest exceeds the 15-line soft cap because the change is cross-cutting across five platforms, four integration test files, three delta-spec files, and two archive-time doc targets; rolling the per-platform STEPS / AGENT_DEFS / snapshot entries into single rows preserves every file the executor must touch (no row hides a real change), keeps the Source column traceable, and lets the executor fan out per-platform edits in parallel without losing context.

## TDD Strategy

- **behavior tasks** (DS-1, DS-3, DS-5, DS-6, DS-8): RED failing test → GREEN minimal implementation → REFACTOR clean-up. Three commits per task.
- **config tasks** (DS-8): RED Zod parse failure on user input → GREEN schema addition → REFACTOR defaults helper.
- **scaffolding/docs** (DS-9, platform integration docs): direct implementation; single commit.
- **refactor** (claude-code generator snapshot refresh): verify tests green → regenerate snapshots via `npx vitest run --update` → verify again.

Use Vitest v4 with deterministic temp directories. Snapshot exact `bp-refactor` body bytes for every platform. Analyzer tests use a fixture tree (two fragmented siblings + one duplicated block + one flat module + one low-reuse module + one well-shaped module) to assert the four metrics + depth ratio findings deterministically. Run focused tests after each Wave, then the full configured suite before review.

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| n-gram similarity false positives (boilerplate, imports) | Report floods with false positives | Medium | Configurable `similarityMin` (default 0.8) + report lists evidence blocks (file paths, similarity numbers) so humans vet before dispatch. |
| Large-repo scan cost | `analyze` becomes slow on huge repos | Medium | Per-module granularity + `--target` filter; reuse `loadMap` for fan-in / exports / line counts (no re-parse). Duplication scan is the only new filesystem pass; bounded by `target` scope. |
| Snapshot churn across all platforms | Tests need regeneration; risk of accidental unrelated update | Medium | Regenerate one platform at a time; diff-review each snapshot for exactly the `bp-refactor` / `bp-refactorer` lines before committing. |
| OMP extension discrimination misses `refactorer` | `## Refactor Targets` block never injects | Medium | `detectAgentType` extended + dedicated test (`agentTemplate === 'bp-refactorer'`). |
| Refactorer agent alters behavior | Test suite breaks or contracts become false | Medium | Behavior-preservation block in prompt; tests must stay green per move; per-module isolation; revert on failure. |
| Spec edits too broad | Unrelated contracts changed | Medium | Prompt restricts spec edits to files referenced in the assigned module's report section; diff visible to humans via `git diff`. |
| `bp config` round-trip loses `refactor` section | Thresholds reset between invocations | Low | `saveConfig` already preserves full YAML doc; add `config.test.ts` round-trip case asserting the section survives. |
| Step registry drift | `bp continue` cannot route to refactor | Low | Step is non-lifecycle (auxiliary), so continue routing is unchanged; only generator output gains a new file. |

