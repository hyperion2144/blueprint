# Design: add-pi-platform

<!--
  Structured technical design. Produced by the planner agent.
  Adds a `pi` PlatformProvider (Pi Coding Agent) generating `.pi/skills/`,
  `.pi/agents/`, and `.pi/extensions/bp/index.ts` (OMP context-contract port
  + bp_subagent tool), plus registration, repo config, and stale cleanup.
-->

## Design Items

### DS-1: Pi Skills Generator

- **Refs**: PR-1, PR-5
- **Source**: PR-1 (proposal.md)
- **Responsibility**: Generate 11 Agent-Skills-standard skill files under `.pi/skills/bp-<step>/SKILL.md`, one per workflow step.
- **Requirements**:
  - `generatePiSkills(config)` returns exactly 11 descriptors (path + content), one per step in immutable order: init, roadmap, propose, plan, apply, check, archive, continue, ff, loop, refactor.
  - Each path is `.pi/skills/bp-<step>/SKILL.md` (step in kebab-case).
  - Each content has frontmatter `name: bp:<step>` and a `description:` line (pi-tuned wording, no `argument-hint`), followed by the workflow body sourced from `WORKFLOW_REGISTRY[step].skill().instructions`, with deterministic fallback `# bp-<step>\n\nWorkflow guide.` when the registry entry is missing.
  - Two invocations with the same config produce byte-identical output.
- **Constraints**: Must reuse the shared `WORKFLOW_REGISTRY` (no duplicated workflow prose). File naming mirrors the codex skills generator (colon name `bp:<step>` — Agent Skills standard). `.pi/skills/` is pi's project skill location (directories containing `SKILL.md` are discovered recursively).
- **Acceptance Criteria**: `generatePiSkills({} as ProjectConfig)` returns 11 descriptors whose paths all match `/^\.pi\/skills\/bp-[a-z-]+\/SKILL\.md$/`, each content starts with `---\nname: bp:<step>` and contains a non-empty body (>200 chars for `bp-plan`).
- **Key Interfaces**:
  - `export interface PiSkillDef { step: WorkflowStep; name: string; description: string }`
  - `export const PI_SKILL_DEFS: PiSkillDef[]` (11 entries, immutable)
  - `export function generatePiSkill(def: PiSkillDef): string`
  - `export function generatePiSkills(_config: ProjectConfig): { path: string; content: string }[]`

#### Detailed Design

Mirror `src/integrations/codex/skills.ts` exactly in structure (same 11-step list, same per-step description wording, same fallback), changing only:

- Path prefix: `.agents/skills/` → `.pi/skills/`.
- Export prefix: `CODEX_` → `PI_`; `CodexSkillDef` → `PiSkillDef`.

Implementation sketch (executor follows — no guessing):

```typescript
// src/integrations/pi/skills.ts
import type { ProjectConfig } from '../../types/index.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../../templates/workflows/registry.js';

export interface PiSkillDef { step: WorkflowStep; name: string; description: string }

const STEPS: readonly WorkflowStep[] = [
  'init', 'roadmap', 'propose', 'plan', 'apply', 'check',
  'archive', 'continue', 'ff', 'loop', 'refactor',
];

function piSkillDescription(step: WorkflowStep): string {
  // Same wording as codexSkillDescription() in src/integrations/codex/skills.ts
  // (copy the map verbatim: init/roadmap/propose/plan/apply/check/archive/continue/ff/loop/refactor)
}

export const PI_SKILL_DEFS: PiSkillDef[] = STEPS.map((step) => ({
  step, name: `bp:${step}`, description: piSkillDescription(step),
}));

export function generatePiSkill(def: PiSkillDef): string {
  const entry = WORKFLOW_REGISTRY[def.step];
  const body = entry ? entry.skill().instructions : `# bp-${def.step}\n\nWorkflow guide.`;
  return ['---', `name: ${def.name}`, `description: ${def.description}`, '---', '', body].join('\n');
}

export function generatePiSkills(_config: ProjectConfig): { path: string; content: string }[] {
  return PI_SKILL_DEFS.map((def) => ({
    path: `.pi/skills/bp-${def.step}/SKILL.md`,
    content: generatePiSkill(def),
  }));
}
```

Tests (`src/integrations/pi/skills.test.ts`, mirror of `codex/skills.test.ts`): 11 descriptors at the pi path; frontmatter `name: bp:<step>` without `argument-hint`; canonical step order; `bp-plan` body > 200 chars containing `name: bp:plan`; `bp-refactor` skill contains the refactor description; determinism; snapshot into `__snapshots__/skills.test.ts.snap`.

### DS-2: Pi PlatformProvider

- **Refs**: PR-1, PR-4
- **Source**: PR-1 (proposal.md)
- **Responsibility**: Register the `pi` platform (id `pi`, display name "Pi Coding Agent", `supportsCommands: false`) with PlatformRegistry and compose its `generate()` from the skills, agents, and extension generators.
- **Requirements**:
  - `registerPiProvider()` is idempotent (no-op when `pi` already registered; never throws on repeat calls).
  - The provider's `generate(config)` returns skills descriptors, then agents descriptors, then the extension descriptor — the full `.pi/` output set.
  - The provider is discoverable via `PlatformRegistry.resolve('pi')` and `PlatformRegistry.list()`.
- **Constraints**: Same shape as `src/integrations/codex/index.ts` (no commands — pi uses Agent Skills, not slash commands). Must NOT import the init wizard (out of scope).
- **Acceptance Criteria**: After `registerPiProvider()`, `PlatformRegistry.resolve('pi')` returns a provider whose `id === 'pi'`, `name === 'Pi Coding Agent'`, and `capabilities.supportsCommands === false`; calling `generate(config)` twice yields identical file lists; `registerPiProvider()` twice does not throw.
- **Key Interfaces**:
  - `export function registerPiProvider(): void`
  - re-exports: `generatePiSkills`, `PI_SKILL_DEFS`, `generatePiAgents`, `PI_AGENT_DEFS`, `generatePiExtension`, `PI_EXTENSION_PATH`

#### Detailed Design

`src/integrations/pi/index.ts` mirrors `src/integrations/codex/index.ts`:

```typescript
import type { PlatformProvider } from '../../core/platform-registry.js';
import { PlatformRegistry } from '../../core/platform-registry.js';
import { generatePiSkills } from './skills.js';
import { generatePiAgents } from './agents.js';
import { generatePiExtension } from './extension.js';

const PI_PROVIDER_ID = 'pi';

export function registerPiProvider(): void {
  if (PlatformRegistry.has(PI_PROVIDER_ID)) return;
  const provider: PlatformProvider = {
    id: PI_PROVIDER_ID,
    name: 'Pi Coding Agent',
    capabilities: { supportsCommands: false },
    generate(config) {
      return [
        ...generatePiSkills(config),
        ...generatePiAgents(config),
        ...generatePiExtension(config),
      ];
    },
  };
  PlatformRegistry.register(PI_PROVIDER_ID, provider);
}
```

Then export the named generator surfaces (same pattern as codex index.ts) for consumers and tests.

### DS-3: Pi Agents Generator

- **Refs**: PR-2, PR-5
- **Source**: PR-2 (proposal.md)
- **Responsibility**: Generate 6 sub-agent definition files at `.pi/agents/bp-<role>.md` in pi's project-agent format (frontmatter name/description/tools/model + body = system prompt).
- **Requirements**:
  - `generatePiAgents(config)` returns exactly 6 descriptors for roles planner, executor, reviewer, codebase-scanner, refactorer, fixer, in that order.
  - Each path is `.pi/agents/bp-<role>.md`; each content has YAML frontmatter with `name: bp-<role>` and `description:` (role descriptions matching the `.agent` generator); `tools:` list rendered as YAML array when non-empty (omitted when empty); `model:` emitted when `config.models[role]` is set.
  - Body is the corresponding `AGENT_PROMPTS[role]` prompt from `src/templates/agents/index.js`, pruned via `prunePrompt(body, profile)` when a `PromptProfile` is given.
  - Two invocations with the same config produce byte-identical output.
- **Constraints**: File format must match pi's shipped subagent-example agent format (frontmatter `name` + `description` required, `tools`/`model` optional, body = system prompt) so the bp extension's `bp_subagent` tool can parse it. Reuse `AGENT_DEFS` role/description/tools data — do not invent new roles or tools.
- **Acceptance Criteria**: `generatePiAgents({} as ProjectConfig)` returns 6 descriptors; every content parses via `parseFrontmatter()` with `data.name === 'bp-<role>'`, string `data.description`, and non-empty body containing the role's prompt marker text (e.g. refactorer content contains "behavior preservation is mandatory").
- **Key Interfaces**:
  - `export interface PiAgentDef { role: string; description: string; tools: string[]; model?: string }`
  - `export const PI_AGENT_DEFS: PiAgentDef[]`
  - `export function generatePiAgent(def: PiAgentDef, profile?: PromptProfile): string`
  - `export function generatePiAgents(config: ProjectConfig): { path: string; content: string }[]`

#### Detailed Design

Mirror `src/integrations/agent/agents.ts` (itself the canonical 6-role generator), swapping the path prefix:

- `PI_AGENT_DEFS` = same 6 entries as `AGENT_DEFS` in `src/integrations/agent/agents.ts` (planner "Change design", executor "Code implementation", reviewer "Triple review", codebase-scanner "Brownfield codebase scan - extract behavioral contracts into specs", refactorer "Behavior-preserving consolidation + spec sync per assigned module", fixer "Fix proposal/design/implementation per reviewer report"); `tools: []` for all.
- `generatePiAgent(def, profile?)`: frontmatter lines `---`, `name: bp-${role}`, `description: ${description}`, then `tools:` + `- <t>` lines when `def.tools.length > 0`, then `model: ${model}` when set, then `---`, `''`, body. Body = `AGENT_PROMPTS[role]`, pruned with `prunePrompt` when `profile` provided.
- `generatePiAgents(config)`: maps `PI_AGENT_DEFS` → `{ path: '.pi/agents/bp-<role>.md', content: generatePiAgent(model ? { ...def, model } : def, config.prompt_profile) }` where `model = config.models?.[def.role]`.

Tests (`src/integrations/pi/agents.test.ts`, mirror of `src/integrations/agent/agents.test.ts`): 6 files at `.pi/agents/`; frontmatter present, no OMP-specific fields (`modelRoles`, `thinkingLevel`); `bp-refactorer.md` contains `name: bp-refactorer` + the consolidation description + "behavior preservation is mandatory"; snapshot into `__snapshots__/agents.test.ts.snap`.

### DS-4: Pi Extension Template Source

- **Refs**: PR-3
- **Source**: PR-3 (proposal.md)
- **Responsibility**: Provide the byte-deterministic string constant `EXTENSION_SOURCE` — the full self-contained TypeScript source of the generated `.pi/extensions/bp/index.ts` (3 context handlers + `bp_subagent` tool) — with no inline duplicates elsewhere.
- **Requirements**:
  - `src/templates/pi/extension.tmpl.ts` exports `EXTENSION_SOURCE: string`; the exported string is static (no `Date.now()`, no `Math.random()`, no env lookups at module load).
  - The generated source implements, on pi's extension API:
    1. `session_start` — guard `isDisabled()` + `hasBpConfig(cwd)`; detect agent type from `ctx.getSystemPrompt()` text (substring markers `planner`/`executor`/`reviewer`/`refactorer`/`fixer`, else `default`); send custom message `{ customType: "bp-context", content: <augmented body>, display: false }` via `api.sendMessage`.
    2. `before_agent_start` — guard; once-per-session flag `_bpStateInjected`; return `{ message: { customType: "bp-workflow-state", content: <state summary>, display: false } }`.
    3. `context` — guard; scan `event.messages` for an existing `custom` message with `customType === "bp-workflow-state"`; when absent, push a `{ role: "custom", customType: "bp-workflow-state", content: <state summary>, display: false, timestamp }` message and return `{ messages: event.messages }`; when present, return `{ messages: event.messages }` unchanged.
    4. `bp_subagent` tool — `defineTool` with `parameters: Type.Object({ agent?, task?, tasks?, cwd? })`; exactly one mode (single `agent`+`task` XOR parallel `tasks` array) required; discovers agents from `<cwd>/.pi/agents/*.md` (frontmatter name/description/tools + body = system prompt, invalid files skipped); spawns isolated `pi --mode json -p --no-session` subprocesses with `--model`/`--tools`/`--append-system-prompt <temp file>` inheritance and returns assistant output text.
  - The generated source honors `BP_HOOKS=0` / `BP_DISABLE_HOOKS=1` bypass and no-ops when `bp/config.yaml` is missing at `ctx.cwd`.
- **Constraints**: The emitted file must run inside pi's extension runtime, so it may import `@earendil-works/pi-coding-agent` (`defineTool`, `parseFrontmatter`, `type ExtensionAPI`) and `@earendil-works/pi-ai` (`Type`) plus Node builtins — same dependency surface as pi's shipped `examples/extensions/subagent/`. No `pi-tui` imports (lean version — no TUI rendering). No `bp` package imports: bp data is fetched via `execSync("bp state --json")` / `execSync("bp context plan --format=compact")` (the bp CLI is on PATH for every bp-managed project). WARNING header comment must state the runtime counterpart (`src/integrations/pi/extension-runtime.ts`) is the testable source of truth and must be kept in lockstep.
- **Acceptance Criteria**: `EXTENSION_SOURCE` contains handler registrations for `"session_start"`, `"before_agent_start"`, `"context"`, the `"bp_subagent"` tool registration, the `BP_HOOKS`/`BP_DISABLE_HOOKS` bypass check, and a `"bp-workflow-state"` customType reference; the string is byte-identical across two imports.
- **Key Interfaces**:
  - `export const EXTENSION_SOURCE: string`

#### Detailed Design

`src/templates/pi/extension.tmpl.ts` — a single backtick template literal exporting `EXTENSION_SOURCE`, structured in this order (executor writes the inline source to match; escaping rules below):

1. **Header comment**: `/** bp Pi Extension - generated by bp update. Do not edit manually.` + sync warning: `logic mirrors src/integrations/pi/extension-runtime.ts; change both or the extension.test.ts snapshot will drift. */`
2. **Imports**:

   ```typescript
   import { existsSync, readFileSync, rmSync, mkdtempSync, writeFileSync } from "node:fs";
   import { spawn, execSync } from "node:child_process";
   import { join, resolve, sep } from "node:path";
   import { tmpdir } from "node:os";
   import { defineTool, parseFrontmatter, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
   import { Type } from "@earendil-works/pi-ai";
   ```

3. **Pure helpers** (function declarations):
   - `isDisabled()` → `process.env.BP_HOOKS === "0" || process.env.BP_DISABLE_HOOKS === "1"`.
   - `hasBpConfig(cwd)` → `existsSync(join(cwd, "bp", "config.yaml"))`.
   - `assertWithinChanges(bpDir, changeName)` — resolved-path prefix guard under `bp/changes/`, throws on traversal (ported from the OMP template).
   - `readBpState(cwd)` → `execSync("bp state --json", { cwd, encoding: "utf-8", timeout: 3000 })`, JSON.parse, builds the 4-line summary (milestone / phase / activeChange / nextAction), fallback `"_no state available_"` on any failure; also returns `activeChangeName` (see `readBpStateWithChange`).
   - `generateCompactBlock(cwd)` → `execSync("bp context plan --format=compact", { cwd, encoding: "utf-8", timeout: 5000 })`, `.trim()`, fallback `"<bp-context>\n</bp-context>"` on failure or missing config.
   - `detectAgentType(prompt)` → substring markers `planner` → `"planner"`, `executor` → `"executor"`, `reviewer` → `"reviewer"`, `refactorer` → `"refactorer"`, `fixer` → `"fixer"`, else `"default"` (marker order matters: `refactorer` check before `executor`/`reviewer` is not needed since markers are disjoint, but keep the OMP ordering).
   - `readContextRows(bpDir, changeName)` → JSON-parse each non-empty line of `bp/changes/<name>/context.jsonl` (guard via `assertWithinChanges`), filter parse failures, `[]` on any error.
   - `readTasksContent(bpDir, changeName)` → `readFileSync` of `tasks.md` (guarded), `""` on error/missing.
   - `extractSummaryBlock(report)` → `## Summary` section up to next `##` heading, else `null`.
   - `augmentBody(agentType, cwd, activeChangeName)` → compact block; then:
     - `planner`: append `\n\n## Roadmap State\n` + state summary;
     - `executor` / `fixer`: append `\n\n` + rows rendered as `[> GUARD-RAIL: ]file: <path>[ <phase>] | reason: <reason>` (guard-rail rows prefixed `> GUARD-RAIL:`); `_no context.jsonl rows_` when empty;
     - `reviewer`: append `\n\n## Invariants\n` + `- <reason>` bullets (or `_no context.jsonl rows_`) and, when `tasks.md` exists, `\n\n## tasks.md acceptance\n` + tasks content verbatim;
     - `refactorer`: when `bp/.refactor-report.md` exists and has a `## Summary`, append `\n\n## Refactor Targets\n` + summary block;
     - `default`: no augmentation.
   - `buildStateMessage(customType, content)` → `{ role: "custom", customType, content, display: false, timestamp: Date.now() }`.
4. **Agent discovery helpers for the tool** (ported from pi's `examples/extensions/subagent/agents.ts`, project scope only):
   - `loadPiAgents(agentsDir)` → for each `*.md` file: `parseFrontmatter(content)`; require `typeof data.name === "string"` and `typeof data.description === "string"`, else skip; `tools` from string (comma-split) or array; body = `systemPrompt`; return `{ name, description, tools, model, systemPrompt, filePath }`.
   - `findPiAgentsDir(cwd)` → walk up from `cwd` looking for `.pi/agents/` directory (stop at fs root); return first hit or `null`.
5. **Subprocess helper**:
   - `getPiInvocation(args)` — pi's example logic: when running from a real script file, `{ command: process.execPath, args: [currentScript, ...args] }`; when execPath basename is `node`/`bun`, `{ command: "pi", args }`; else `{ command: process.execPath, args }`.
   - `writePromptToTempFile(systemPrompt)` → `mkdtempSync(join(tmpdir(), "bp-subagent-"))` + temp `.md` file containing the system prompt; returns `{ dir, filePath }`.
   - `runPiSubagent(agent, task, cwd, opts, onLine)` → build args `["--mode", "json", "-p", "--no-session"]`, append `--model <model>` when agent.model or ctx.model, `--thinking <level>` when ctx.thinkingLevel, `--tools <comma-list>` when agent.tools non-empty, `--append-system-prompt <filePath>` when systemPrompt non-empty, then `"Task: " + task`; `spawn(command, args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] })`; split stdout on `\n`, JSON-parse each line, collect `message_end` events (assistant messages), accumulate stderr; resolve `{ exitCode, messages, stderr }` on `close`; cleanup temp files in `finally`.
   - `mapWithConcurrencyLimit(items, limit, fn)` — run at most 4 in parallel (port of the example's helper).
6. **Tool definition**:

   ```typescript
   const bpSubagentTool = defineTool({
     name: "bp_subagent",
     label: "BP Subagent",
     description: "Delegate bp workflow tasks (plan/apply/check/archive/refactor) to isolated bp subagents from .pi/agents/. Modes: single (agent + task) or parallel (tasks array).",
     parameters: Type.Object({
       agent: Type.Optional(Type.String()),
       task: Type.Optional(Type.String()),
       tasks: Type.Optional(Type.Array(Type.Object({ agent: Type.String(), task: Type.String() }))),
       cwd: Type.Optional(Type.String()),
     }),
     async execute(_toolCallId, params, signal, _onUpdate, ctx) {
       // exactly one mode; single = Boolean(params.agent && params.task),
       // parallel = (params.tasks?.length ?? 0) > 0; modeCount !== 1 →
       // text error result listing available agents
       // discover agents from findPiAgentsDir(ctx.cwd); unknown agent →
       // error text result with available agent names
       // single: runPiSubagent(...); parallel: mapWithConcurrencyLimit(..., 4, ...)
       // abort: kill SIGTERM then SIGKILL after 5s (port of example)
       // return { content: [{ type: "text", text: <assistant outputs joined> }], details: { results } }
     },
   });
   ```

7. **Default export**:

   ```typescript
   export default function bpExtension(api: ExtensionAPI) {
     var _bpStateInjected = false;
     api.on("session_start", ...);
     api.on("before_agent_start", ...);
     api.on("context", ...);
     api.registerTool(bpSubagentTool);
   }
   ```

**Escaping rules for the template literal** (executor): any backtick inside the generated source must be written `\``; any`${` must be written `\${`; the string is otherwise literal. Prefer double-quoted strings and`\n` escapes inside the generated source (OMP template convention) to minimize escaping hazards. The generated source targets pi's modern runtime — modern TS syntax (arrow functions, `const`) is fine.

The inline source's logic mirrors `src/integrations/pi/extension-runtime.ts` (DS-5) — the WARNING header says so, and `extension.test.ts` pins both (T-3) so drift fails CI.

### DS-5: Pi Extension Runtime Counterpart

- **Refs**: PR-3, PR-5
- **Source**: PR-3 (proposal.md)
- **Responsibility**: Provide the testable TypeScript counterparts of the generated extension's handlers and subagent helpers, plus the `EXTENSION_SOURCE` re-export — the bp-side source of truth for the pi extension behavior.
- **Requirements**:
  - `src/integrations/pi/extension-runtime.ts` re-exports `EXTENSION_SOURCE` from `../../templates/pi/extension.tmpl.js`.
  - Exports testable handler helpers matching the template's behavior: `isDisabled`, `hasBpConfig`, `detectAgentTypeFromPrompt`, `generateCompactBlock`, `formatStateSummary`, `resolveActiveChangeName`, `renderAugmentedBody`, and a `createPiExtension()` factory returning `{ handleSessionStart, handleBeforeAgentStart, handleContext }` with a shared once-per-session `bpStateInjected` flag.
  - Exports subagent helpers: `discoverPiAgents(cwd)`, `buildSubagentArgs(agent, task, opts)`, `parseJsonLine(line)`.
  - Handler semantics equal the template's: `session_start` sends one `bp-context` custom message (augmented per detected agent type, `default` = paths-only); `before_agent_start` returns a `bp-workflow-state` message only once per session; `context` re-injects `bp-workflow-state` into `event.messages` when no `custom` message with that `customType` exists; all handlers no-op under env bypass or missing `bp/config.yaml`.
  - Runtime helpers use bp's internal modules (`generateCompactContext`/`formatContextCompact` from `src/core/spec-injector.js`, `parseContextJsonl` from `src/core/context-jsonl-io.js`, `deriveState` from `src/commands/bp-state.js`, `parseFrontmatter` from `src/parser/frontmatter.js`) — no `execSync` in the runtime.
- **Constraints**: Lockstep with DS-4 (WARNING header in both files, mirrored by `extension.test.ts` content-marker assertions). No side effects at import time. The runtime must compile inside bp's own tree (its imports are bp-internal only — it never imports the pi package).
- **Acceptance Criteria**: With a temp fixture project, `handleSessionStart` emits a `bp-context` message whose body contains `## Roadmap State` for planner prompts, `> GUARD-RAIL:`-prefixed rows for executor/fixer prompts, `## Invariants` + `## tasks.md acceptance` for reviewer prompts, `## Refactor Targets` for refactorer prompts, and no augmentation for `default`; `handleBeforeAgentStart` returns a message on first call and `undefined` on second; `handleContext` pushes a workflow-state message only when absent; `discoverPiAgents` returns configs for valid `.pi/agents/*.md` files and skips invalid ones; `buildSubagentArgs` returns the expected argv for a given model/tools/prompt-file combo.
- **Key Interfaces**:
  - `export type AgentType = 'planner' | 'executor' | 'reviewer' | 'refactorer' | 'fixer' | 'default'`
  - `export interface PiExtensionContext { cwd?: string; getSystemPrompt?: () => string | undefined; activeChangeName?: string; recentMessages?: Array<{ role?: string; customType?: string }> }`
  - `export interface PiMessage { role: 'custom'; customType: string; content: string; display: boolean; timestamp: number }`
  - `export interface PiAPI { on(event: string, handler: (event: unknown, ctx: PiExtensionContext) => unknown): void; sendMessage(msg: PiMessage, opts?: unknown): void }`
  - `export interface PiAgentConfig { name: string; description: string; tools?: string[]; model?: string; systemPrompt: string; filePath: string }`

#### Detailed Design

Structure mirrors `src/integrations/omp/extension-runtime.ts`:

- **Predicates**: `isDisabled()` (env check) and `hasBpConfig(cwd)` (existsSync on `join(cwd, 'bp', 'config.yaml')`) — ported verbatim from the OMP runtime.
- **`detectAgentTypeFromPrompt(prompt: string | undefined): AgentType`** — substring markers on the prompt text (this replaces OMP's `detectAgentType(ctx)` which used `agentTemplate`; pi has no agentTemplate). Marker order: planner → executor → reviewer → refactorer → fixer → default (markers are disjoint substrings, order-safe, keep OMP order for parity).
- **`generateCompactBlock(cwd)`** — same as OMP runtime: missing config or error → `'<bp-context>\n</bp-context>'`; else `formatContextCompact(generateCompactContext(join(cwd, 'bp')))`.
- **`formatStateSummary(bpDir)`** — same 4-line deriveState summary as OMP runtime, `'_no state available_'` on failure.
- **`resolveActiveChangeName(cwd)`** — `deriveState(join(cwd, 'bp')).activeChange?.name ?? undefined` (no execSync — the template derives it from `bp state --json` instead).
- **`readContextRows(bpDir, changeName)`** — `assertWithinChanges` guard + `parseContextJsonl` (copy the OMP runtime helpers `assertWithinChanges` and `readContextRows`).
- **`renderAugmentedBody(cwd, agentType, activeChangeName)`** — identical augmentation branches to the OMP runtime (planner Roadmap State / executor+fixer inline rows / reviewer Invariants+tasks.md / refactorer Refactor Targets / default paths-only).
- **`createPiExtension()`** — returns `{ handleSessionStart, handleBeforeAgentStart, handleContext }` sharing a closure `let bpStateInjected = false`:
  - `handleSessionStart(event, ctx, api): Promise<void>` — bypass/config guards; `detectAgentTypeFromPrompt(ctx.getSystemPrompt?.());` body = `renderAugmentedBody(cwd, agentType, ctx.activeChangeName ?? resolveActiveChangeName(cwd));` `api.sendMessage({ role: 'custom', customType: 'bp-context', content: body, display: false, timestamp: Date.now() })`.
  - `handleBeforeAgentStart(event, ctx, api): Promise<HandlerResult | undefined>` — guards; `if (bpStateInjected) return undefined; bpStateInjected = true;` return `{ message: buildStateMessage('bp-workflow-state', formatStateSummary(bpDir)) }`.
  - `handleContext(event: { messages?: PiMessage[] }, ctx, api): Promise<{ messages: PiMessage[] } | undefined>` — guards; `const msgs = event.messages ?? [];` if any `m.role === 'custom' && m.customType === 'bp-workflow-state'` → `return { messages: msgs };` else push `buildStateMessage(...)` and return `{ messages: msgs }`.
- **Subagent helpers**:
  - `discoverPiAgents(cwd)` — `join(cwd, '.pi', 'agents')` (single-level lookup, no ancestor walk — the extension template walks up; the runtime keeps the simple case testable); `readdirSync` with `withFileTypes`, `*.md` regular files only; `parseFrontmatter(content)` from `src/parser/frontmatter.js`; skip files whose `data.name` or `data.description` is not a string; `tools` from string (comma-split, trimmed, non-empty) or array of strings; body → `systemPrompt`; return `PiAgentConfig[]` (empty on missing/unreadable dir).
  - `buildSubagentArgs(agent: PiAgentConfig, task: string, opts: { model?: string; thinkingLevel?: string; systemPromptFile?: string }): string[]` — `['--mode', 'json', '-p', '--no-session']`, then `--model <opts.model ?? agent.model>` when present, `--thinking <opts.thinkingLevel>` when present, `--tools <agent.tools.join(',')>` when non-empty, `--append-system-prompt <opts.systemPromptFile>` when present, then `Task: ${task}`. Pure function — fully unit-testable.
  - `parseJsonLine(line: string): unknown` — `JSON.parse` with `null` on failure (used by tests to simulate message_end events).

Tests (`src/integrations/pi/extension-runtime.test.ts`): temp-dir fixture (mirror `omp/extension-runtime.test.ts` beforeAll/afterAll pattern) covering handler behaviors listed in Acceptance Criteria + bypass/config-skip + subagent discovery/args/line-parse.

### DS-6: Pi Extension Generator

- **Refs**: PR-3
- **Source**: PR-3 (proposal.md)
- **Responsibility**: Emit the byte-deterministic `.pi/extensions/bp/index.ts` file descriptor from the template constant.
- **Requirements**:
  - `generatePiExtension(config)` returns exactly one descriptor `{ path: '.pi/extensions/bp/index.ts', content: EXTENSION_SOURCE }`.
  - Two invocations produce byte-identical `path` and `content` (no `Date.now()`, no `Math.random()` in the generator).
- **Constraints**: Content must come from `EXTENSION_SOURCE` re-exported via `extension-runtime.js` (OMP pattern — no inline string literal in the generator). Path constant exported for cleanup/test use.
- **Acceptance Criteria**: `generatePiExtension({} as ProjectConfig)` returns the single descriptor; `content === EXTENSION_SOURCE`; `PI_EXTENSION_PATH === '.pi/extensions/bp/index.ts'`.
- **Key Interfaces**:
  - `export const PI_EXTENSION_PATH = '.pi/extensions/bp/index.ts'`
  - `export function generatePiExtension(_config: ProjectConfig): { path: string; content: string }[]`

#### Detailed Design

`src/integrations/pi/extension.ts` — 20-line mirror of `src/integrations/omp/extension.ts`:

```typescript
import type { ProjectConfig } from '../../types/index.js';
import { EXTENSION_SOURCE } from './extension-runtime.js';

export const PI_EXTENSION_PATH = '.pi/extensions/bp/index.ts';

export function generatePiExtension(_config: ProjectConfig): { path: string; content: string }[] {
  return [{ path: PI_EXTENSION_PATH, content: EXTENSION_SOURCE }];
}
```

`extension.test.ts` (T-3) asserts byte-stability via snapshot of the emitted content + content-marker assertions; T-6's RED asserts the descriptor shape via `generatePiExtension`.

### DS-7: Registration, Repo Config, and Update Cleanup

- **Refs**: PR-4
- **Source**: PR-4 (proposal.md)
- **Responsibility**: Wire `pi` into the repo: integration barrel export, generator startup registration, this repo's `bp/config.yaml` platform list, and `bp update` stale-file cleanup for `.pi/`.
- **Requirements**:
  - `src/integrations/index.ts` exports the pi integration namespace (`export * as pi from './pi/index.js'`).
  - `src/generators/index.ts` imports and calls `registerPiProvider()` during module load (alongside the other providers).
  - `bp/config.yaml` platform list includes `pi` (dogfood — this repo runs in pi).
  - `cleanupStaleFiles` in `src/commands/bp-update.ts` removes stale bp-owned `.pi/` artifacts when pi is no longer configured:
    - `.pi/skills/bp-<step>/` directories whose `bp-<step>` dir is not in the current generation set (mirror of the `.agents/skills/` block);
    - `.pi/agents/bp-*.md` files not in the generated set (bp- prefix guard);
    - `.pi/extensions/bp/` directory when `.pi/extensions/bp/index.ts` is not in the generated set.
  - Non-bp-owned files under `.pi/` (e.g. `.pi/settings.json`, user extensions, non-`bp-` skills/agents) are never touched.
- **Constraints**: Follow the exact structure/style of the existing cleanup blocks in `bp-update.ts` (console `✓ Removed stale:` logs, `rmSync` recursive for directories). Registration must be idempotent. Do NOT touch the init wizard (`src/prompts/init-wizard.ts`) — pi selection there is out of scope per proposal.
- **Acceptance Criteria**: With a temp project configured without pi, `bp update` removes seeded stale `.pi/skills/bp-plan/`, `.pi/agents/bp-fixer.md`, and `.pi/extensions/bp/` while preserving `.pi/settings.json` and `.pi/skills/user-skill/`; with `platform: [pi]` the provider resolves and generates all 18 files.
- **Key Interfaces**:
  - `src/generators/index.ts`: `registerPiProvider()` call site
  - `src/commands/bp-update.ts`: `cleanupStaleFiles(baseDir, generatedPaths)` extended (private function — no new public surface)

#### Detailed Design

**`src/generators/index.ts`** — add after the opencode registration:

```typescript
import { registerPiProvider } from '../integrations/pi/index.js';
// ...
registerPiProvider();
```

**`src/integrations/index.ts`** — add `export * as pi from './pi/index.js';` and extend the header comment's platform list.

**`bp/config.yaml`** — platform list becomes `omp, claude-code, agent, codex, pi`.

**`src/commands/bp-update.ts`** — append three blocks inside `cleanupStaleFiles`, after the `.agents/skills/` block (before the `.claude/settings.json` block), mirroring existing style:

```typescript
// .pi/skills/bp-* — directory-based cleanup (mirror of .agents/skills/)
const piSkillsDir = join(baseDir, '.pi', 'skills');
if (existsSync(piSkillsDir)) {
  for (const entry of readdirSync(piSkillsDir)) {
    const match = /^bp-(.+)$/.exec(entry);
    if (!match) continue; // skip non-bp skills
    const isCurrent = generatedSet.has(`.pi/skills/${entry}/SKILL.md`);
    if (!isCurrent) {
      rmSync(join(piSkillsDir, entry), { recursive: true, force: true });
      console.log(`  ✓ Removed stale: .pi/skills/${entry}/`);
    }
  }
}

// .pi/agents/ — file-based, bp- prefix guard
const piAgentsDir = join(baseDir, '.pi', 'agents');
if (existsSync(piAgentsDir)) {
  for (const file of readdirSync(piAgentsDir)) {
    checkRemove(piAgentsDir, '.pi/agents', file);
  }
}

// .pi/extensions/bp/ — only the bp-generated extension dir is removed
const piExtensionDir = join(baseDir, '.pi', 'extensions', 'bp');
if (existsSync(piExtensionDir) && !generatedSet.has('.pi/extensions/bp/index.ts')) {
  rmSync(piExtensionDir, { recursive: true, force: true });
  console.log('  ✓ Removed stale: .pi/extensions/bp/');
}
```

**Tests** — extend `tests/commands/bp-update.test.ts` with a `bp update — pi safe stale cleanup` describe block (same init/seed/run pattern as the codex block): config without pi + seeded stale `.pi/skills/bp-plan/`, `.pi/agents/bp-fixer.md`, `.pi/extensions/bp/index.ts` + user-owned `.pi/settings.json` and `.pi/skills/user-skill/SKILL.md` → run `node bin/cli.js update --dir bp` → stale gone, user files present.

**Provider dispatch test** — `src/integrations/pi/index.test.ts` (registry-isolation pattern of `src/generators/codex.test.ts`): after `registerPiProvider()`, `generateAll({ platform: ['pi'] })` emits 18 files (11 skills + 6 agents + 1 extension), all under `.pi/`; duplicate registration does not throw.

## Architecture Decisions

### D-1: Reuse the codex skills generator shape rather than a new pi-specific skill format

- **Status**: ACCEPTED
- **Decision**: `src/integrations/pi/skills.ts` mirrors `src/integrations/codex/skills.ts` (same 11 steps, same colon name `bp:<step>`, same description wording, same `WORKFLOW_REGISTRY` body sourcing); only the output path changes to `.pi/skills/`.
- **Reason**: pi implements the Agent Skills standard (colon slash-command names allowed; directory-with-SKILL.md discovery), and pi explicitly tolerates skill names differing from directory names. The codex generator is the repo's canonical skills-only generator (`supportsCommands: false`); duplicating it with a swapped path keeps skill content in lockstep with codex and Claude Code.
- **Alternatives**:
  - Reuse codex's `.agents/skills/` output for pi (no pi files): rejected — user explicitly wants `.pi/` output and pi must work standalone (not depend on codex being configured).
  - New pi-specific wording/format: rejected — no behavioral reason; extra divergence with no payoff.

### D-2: Agent type detection from system-prompt text, not an agentTemplate field

- **Status**: ACCEPTED
- **Decision**: The pi extension detects the sub-agent type by substring markers (`planner`/`executor`/`reviewer`/`refactorer`/`fixer`) in the effective system prompt (`ctx.getSystemPrompt()` at `session_start`, `event.systemPrompt` at `before_agent_start`), replacing OMP's `ctx.agentTemplate`.
- **Reason**: pi's extension API has no `agentTemplate` on context; the system prompt is the only reliably available discriminator, and the generated bp agent prompts (`AGENT_PROMPTS[role]`) each contain their role name in the `## Role` heading.
- **Alternatives**:
  - Derive the agent from session file name / user prompt: rejected — unreliable; subagent sessions are ordinary sessions.
  - Always emit the paths-only block (no augmentation): rejected — loses the whole role-augmentation value of the OMP contract port.

### D-3: Compaction detection via message-absence scan instead of timestamps

- **Status**: ACCEPTED
- **Decision**: The pi `context` handler re-injects `bp-workflow-state` whenever `event.messages` contains no `custom` message with `customType === 'bp-workflow-state'`, and otherwise leaves messages untouched.
- **Reason**: pi's `context` event exposes only `event.messages` — there is no `lastCompactionTs`/`lastInjectionTs`/`recentMessages` like OMP's context. Because `before_agent_start` messages are persistent in the session, absence of the message is exactly equivalent to "compacted away", so the absence scan implements the OMP post-compaction recovery contract on pi's API.
- **Alternatives**:
  - Timestamp-based reverse scan like OMP: impossible — pi's context event does not provide compaction timestamps.
  - Track injection in a module-level flag and re-inject on every context event when flagged: rejected — would duplicate the message every turn after compaction until the flag resets; the message scan is self-healing.

### D-4: Generated extension runs on pi's package imports (`@earendil-works/pi-coding-agent`, `@earendil-works/pi-ai`) — no bp package imports

- **Status**: ACCEPTED
- **Decision**: The generated `.pi/extensions/bp/index.ts` imports `defineTool`/`parseFrontmatter`/`ExtensionAPI` from `@earendil-works/pi-coding-agent` and `Type` from `@earendil-works/pi-ai` (pi's own published packages — the same surface pi's shipped `examples/extensions/subagent/` uses), plus Node builtins. All bp data (compact context, state, context.jsonl rows) is fetched at runtime via `execSync("bp context plan --format=compact")` and `execSync("bp state --json")`.
- **Reason**: The extension runs inside pi's runtime, where those packages resolve; bp's own modules are not importable there. The execSync indirection keeps the generated file dependency-free of bp internals and matches the OMP extension template, which also shells out to the bp CLI.
- **Alternatives**:
  - Inline re-implementations of frontmatter parsing and tool schemas: rejected — duplicates pi's shipped helpers for no gain.
  - Import bp package internals: impossible — bp is a CLI, not a library dependency of pi extensions.

### D-5: `display: false` for injected custom messages

- **Status**: ACCEPTED
- **Decision**: Both `bp-context` (session_start) and `bp-workflow-state` (before_agent_start/context) messages set `display: false`.
- **Reason**: These are context payloads for the model, not user-facing TUI output; `display: false` keeps pi's TUI uncluttered while the content still participates in LLM context (custom messages with `display: false` are still sent to the LLM).
- **Alternatives**:
  - `display: true` (pi docs example): rejected — noisy TUI for large bp-context blocks.
  - Register a custom message renderer: rejected — adds UI code to a "lean" extension; no user value.

### D-6: Init wizard not extended

- **Status**: ACCEPTED
- **Decision**: `src/prompts/init-wizard.ts` is not modified by this change; `pi` is added only to this repo's `bp/config.yaml` and to `src/generators/index.ts` + the integrations barrel.
- **Reason**: The proposal's In Scope list enumerates provider registration, generated files, `bp update` cleanup, and repo config — the interactive picker is not listed (codex's picker entry was its own PR's requirement). Adding pi to the wizard would widen scope without a proposal deliverable.
- **Alternatives**:
  - Add a pi option to the init wizard: rejected for scope discipline; trivially addable in a follow-up change if requested.

### D-7: Single lean `bp_subagent` tool (single + parallel modes), no chain mode, no TUI rendering

- **Status**: ACCEPTED
- **Decision**: The extension registers one tool, `bp_subagent`, with single (`agent` + `task`) and parallel (`tasks[]`) modes; it discovers agents only from `.pi/agents/` (project-local), inherits model/tools from agent frontmatter or the calling session, and returns plain text results. Chain mode, user-level agent discovery, and TUI rendering from pi's shipped example extension are omitted.
- **Reason**: The proposal's PR-3 scopes the tool to "single/parallel" and "lean version (no TUI rendering)", and to bp's own 6 agents. Project-only discovery also matches the trust boundary: these agents are bp-generated.
- **Alternatives**:
  - Full port of the shipped subagent example (chain, agentScope, confirm dialogs, TUI): rejected — wrong scope (user agents, UI deps); bp needs bp-scoped delegation only.
  - No tool at all (skills/context only): rejected — the proposal explicitly requires sub-agent invocation for planner/executor/reviewer/codebase-scanner/refactorer/fixer.

## Technical Approach

### Architecture Diagram

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ bp update (src/commands/bp-update.ts) [MODIFIED]                          │
│   loadConfig → generateAll(config) → writeGeneratedFiles →                │
│   cleanupStaleFiles(cwd, generatedPaths)  [MODIFIED: +.pi/ blocks]        │
└───────────────┬──────────────────────────────────────────────────────────┘
                │ generateAll(config.platform)
                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ src/generators/index.ts [MODIFIED]  — registers pi provider at startup    │
└───────────────┬──────────────────────────────────────────────────────────┘
                │ PlatformRegistry.register('pi')
                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ src/integrations/pi/index.ts [NEW]  registerPiProvider()                  │
│   id 'pi' · name 'Pi Coding Agent' · supportsCommands: false             │
│   generate() = skills + agents + extension                               │
└──────┬──────────────────────────┬───────────────────────────┬────────────┘
       │                          │                           │
       ▼                          ▼                           ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────────┐
│ pi/skills.ts     │  │ pi/agents.ts     │  │ pi/extension.ts [NEW]         │
│ [NEW]            │  │ [NEW]            │  │  emits .pi/extensions/bp/     │
│ .pi/skills/      │  │ .pi/agents/      │  │  index.ts (EXTENSION_SOURCE)  │
│ bp-<step>/       │  │ bp-<role>.md     │  └──────────┬───────────────────┘
│ SKILL.md (11)    │  │ (6)              │             │
└────────┬─────────┘  └────────┬─────────┘             ▼
         │                    │           ┌──────────────────────────────┐
         │  WORKFLOW_REGISTRY │           │ templates/pi/extension.tmpl.ts│
         │  [EXISTING]        │           │ [NEW] EXTENSION_SOURCE string │
         │                    │           └──────────────┬───────────────┘
         │                    │                          │ re-export
         │                    │  AGENT_PROMPTS           ▼
         │                    │  [EXISTING]   ┌──────────────────────────────┐
         │                    └─────────────► │ pi/extension-runtime.ts      │
         │                                   │ [NEW] testable handlers +    │
         │                                   │ subagent helpers (DS-5)      │
         ▼                                   └──────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────┐
│ Generated .pi/ (runtime, in the user project)                             │
│  .pi/skills/       — discovered natively by pi (progressive disclosure)   │
│  .pi/agents/       — read by bp_subagent tool (frontmatter → prompt)      │
│  .pi/extensions/bp/index.ts — pi loads at startup:                        │
│      session_start  → sendMessage bp-context (role-augmented)             │
│      before_agent_start → bp-workflow-state (once/session)                │
│      context        → re-inject bp-workflow-state after compaction        │
│      bp_subagent tool → spawn `pi --mode json -p --no-session`            │
└──────────────────────────────────────────────────────────────────────────┘

Legend: [NEW] this change · [MODIFIED] existing, changed · [EXISTING] unchanged reference
```

### Core Data Structures

```typescript
// src/integrations/pi/skills.ts
export interface PiSkillDef {
  step: WorkflowStep;      // keyof WORKFLOW_REGISTRY
  name: string;            // 'bp:<step>' (Agent Skills colon name)
  description: string;     // pi-tuned one-liner
}

// src/integrations/pi/agents.ts
export interface PiAgentDef {
  role: string;            // planner | executor | reviewer | codebase-scanner | refactorer | fixer
  description: string;
  tools: string[];         // empty for all bp roles — tools key omitted from frontmatter
  model?: string;          // from config.models[role]
}

// src/integrations/pi/extension-runtime.ts
export type AgentType = 'planner' | 'executor' | 'reviewer' | 'refactorer' | 'fixer' | 'default';
export interface PiExtensionContext {
  cwd?: string;
  getSystemPrompt?: () => string | undefined;
  activeChangeName?: string;
  recentMessages?: Array<{ role?: string; customType?: string }>;
}
export interface PiMessage {
  role: 'custom';
  customType: string;      // 'bp-context' | 'bp-workflow-state'
  content: string;
  display: boolean;        // false — D-5
  timestamp: number;
}
export interface PiAPI {
  on(event: string, handler: (event: unknown, ctx: PiExtensionContext) => unknown): void;
  sendMessage(msg: PiMessage, opts?: unknown): void;
}
export interface PiAgentConfig {
  name: string;            // 'bp-<role>'
  description: string;
  tools?: string[];
  model?: string;
  systemPrompt: string;    // frontmatter body
  filePath: string;
}
```

### Data Flow

1. **Startup** — `src/generators/index.ts` imports `registerPiProvider()` → registers `pi` in PlatformRegistry (id `pi`, name "Pi Coding Agent", `supportsCommands: false`). `src/integrations/index.ts` exposes the `pi` namespace barrel.
2. **`bp update`** — `updateHandler` loads `bp/config.yaml`, calls `generateAll(config)`; for `platform: [pi]` (or repo config now listing pi), `generatePiSkills` → 11 `.pi/skills/bp-<step>/SKILL.md` (WORKFLOW_REGISTRY bodies), `generatePiAgents` → 6 `.pi/agents/bp-<role>.md` (AGENT_PROMPTS bodies), `generatePiExtension` → `.pi/extensions/bp/index.ts` (EXTENSION_SOURCE from template → runtime → generator). `writeGeneratedFiles` writes them; `cleanupStaleFiles` then prunes stale `.pi/` bp-owned files not in the generated set.
3. **pi session start** — pi auto-discovers `.pi/extensions/bp/index.ts` and loads it; extension registers 3 handlers + `bp_subagent` tool. `session_start`: guard bypass/config → `detectAgentType(ctx.getSystemPrompt())` → `api.sendMessage({ customType: 'bp-context', content: augmentBody(...), display: false })`.
4. **Each turn** — `before_agent_start` (first turn only, `_bpStateInjected` gate): returns `{ message: { customType: 'bp-workflow-state', content: <bp state summary>, display: false } }` — persisted into the session. `context`: scan `event.messages` for existing `bp-workflow-state`; absent (compacted away) → push summary message; present → no-op.
5. **bp_subagent tool call** — the LLM calls `bp_subagent` with `{agent, task}` or `{tasks: [...]}`; extension discovers `.pi/agents/*.md` (frontmatter → name/description/tools/model/systemPrompt), spawns `pi --mode json -p --no-session [--model m] [--tools t] [--append-system-prompt tmp] Task: <task>` per agent (≤4 parallel), collects `message_end` assistant output, returns text + details to the caller, cleans temp prompt files.

### Interface Design

No HTTP endpoints. External-facing surfaces:

#### `bp update` CLI (unchanged surface, extended behavior)

- **Invocation**: `node bin/cli.js update --dir <bpDir>` (repo root cwd).
- **Success**: generates files for every configured platform incl. `pi`; logs `✓ Removed stale:` lines for pruned `.pi/` artifacts; exits 0.
- **Error**: unknown platform id → exit 1 with unknown-platform report (existing behavior in `generateAll`/registry resolve — unchanged).
- **Source**: specs/platform-gen/spec.md#pi-update-cleanup

#### Generated `.pi/extensions/bp/index.ts` — pi extension factory

- **Default export**: `bpExtension(api: ExtensionAPI)` — registers `session_start`, `before_agent_start`, `context` handlers and the `bp_subagent` tool.
- **Error responses**:
  - Env bypass `BP_HOOKS=0` or `BP_DISABLE_HOOKS=1`: every handler returns immediately, sends nothing.
  - Missing `bp/config.yaml` at `ctx.cwd`: every handler returns immediately, sends nothing.
  - `execSync("bp state --json")` / `execSync("bp context plan --format=compact")` failure: fallback strings (`_no state available_` / minimal `<bp-context>` block) — extension never crashes on bp CLI absence.
  - Path traversal via tampered `bp/state.md` change name: `assertWithinChanges` throws → row/task reads become empty; no file outside `bp/changes/` is read.
  - `bp_subagent` invalid params (0 or 2+ modes): text result listing available agents, no spawn.
  - `bp_subagent` unknown agent: text result `Unknown agent: "<name>". Available agents: <list>.`, exitCode 1.
  - `bp_subagent` subprocess failure: stderr accumulated into result, exit code surfaced, temp files cleaned in `finally`.
- **Source**: specs/platform-gen/spec.md#pi-extension-context-contract, #pi-extension-subagent-tool

## External Dependencies

| Service | Base URL | Auth | Used For | Source |
| --------- | ---------- | ------ | ---------- | -------- |
| Pi Coding Agent packages (`@earendil-works/pi-coding-agent`, `@earendil-works/pi-ai`) | npm (installed with pi) | none | `defineTool`, `parseFrontmatter`, `Type`, `ExtensionAPI` in the generated extension | DS-4 |
| `bp` CLI on PATH (runtime only) | n/a | none | `bp state --json`, `bp context plan --format=compact` from the generated extension | DS-4 |
| `pi` CLI on PATH (runtime only) | n/a | none | `bp_subagent` spawns `pi --mode json -p --no-session` | DS-5 |

## Impact Analysis

`bp map list` / `bp map module src/integrations/codex` / `bp map impact <module>` run before writing (see Research in D-1..D-7). `src/integrations` is depended on by `src/commands`, `src/generators`, `src/integrations/claude-code`, `tests/integrations`; `src/generators` by `src/commands`, `tests/integrations`; `src/templates/omp` has no dependents.

### Direct Impacts

- `src/integrations/pi/*` (index.ts, skills.ts, agents.ts, extension.ts, extension-runtime.ts, 4 test files, 3 snapshots): created — new pi platform module (DS-1..DS-6).
- `src/templates/pi/extension.tmpl.ts`: created — pi extension source-of-truth string (DS-4).
- `src/integrations/index.ts`: modified — adds `export * as pi` (DS-7).
- `src/generators/index.ts`: modified — adds `registerPiProvider()` call (DS-7).
- `src/commands/bp-update.ts`: modified — `cleanupStaleFiles` gains three `.pi/` blocks (DS-7).
- `bp/config.yaml`: modified — platform list gains `pi` (DS-7).
- `tests/commands/bp-update.test.ts`: modified — new pi cleanup describe block (DS-7).

### Indirect Impacts (callers/dependents)

- `src/commands/bp-update.ts` calls `generateAll` — now returns pi files when configured; no call-site change needed (array merge is additive).
- `PlatformRegistry` consumers (`src/core/platform-registry.ts` unchanged): adding a provider is additive; `resolve`/`list` semantics unchanged.
- No other integration depends on `src/integrations/pi` (new module, zero dependents).
- `src/templates/omp/extension.tmpl.ts` and `src/integrations/omp/*`: NOT modified (pi ports the contract, does not change OMP).
- `src/prompts/init-wizard.ts`: NOT modified (D-6).

### Test Impacts

- `src/generators/codex.test.ts` / `src/generators/multi-platform.test.ts`: use `setPlatformRegistry(createDefaultRegistry())` isolation per test — unaffected by the new provider.
- `tests/commands/bp-update.test.ts`: existing codex/claude cleanup tests unaffected (new blocks only touch `.pi/`); the file gains new pi cases.
- `tests/integration/*` e2e suites: run against `platform` configs without pi — unaffected.
- No existing test asserts the total provider count, so registration is non-breaking.

## File Manifest

| File Path | Description | Action | Source |
| ----------- | ------------- | -------- | -------- |
| `src/integrations/pi/skills.ts` | 11-skill generator → `.pi/skills/bp-<step>/SKILL.md` | Create | DS-1 |
| `src/integrations/pi/skills.test.ts` | skills generator tests (incl. snapshot) | Create | DS-1 |
| `src/integrations/pi/__snapshots__/skills.test.ts.snap` | skills snapshot | Create | DS-1 |
| `src/integrations/pi/agents.ts` | 6-agent generator → `.pi/agents/bp-<role>.md` | Create | DS-3 |
| `src/integrations/pi/agents.test.ts` | agents generator tests (incl. snapshot) | Create | DS-3 |
| `src/integrations/pi/__snapshots__/agents.test.ts.snap` | agents snapshot | Create | DS-3 |
| `src/templates/pi/extension.tmpl.ts` | `EXTENSION_SOURCE` string (generated extension source) | Create | DS-4 |
| `src/integrations/pi/extension-runtime.ts` | testable handler/subagent counterparts + `EXTENSION_SOURCE` re-export | Create | DS-5 |
| `src/integrations/pi/extension-runtime.test.ts` | runtime behavior tests (handlers + subagent helpers) | Create | DS-5 |
| `src/integrations/pi/extension.test.ts` | extension byte-stability + content-marker tests | Create | DS-4/DS-6 |
| `src/integrations/pi/__snapshots__/extension.test.ts.snap` | extension source snapshot | Create | DS-4 |
| `src/integrations/pi/extension.ts` | emits `.pi/extensions/bp/index.ts` descriptor | Create | DS-6 |
| `src/integrations/pi/index.ts` | `registerPiProvider()` + provider composition | Create | DS-2 |
| `src/integrations/pi/index.test.ts` | provider registration + `generateAll(['pi'])` dispatch test | Create | DS-2 |
| `src/integrations/index.ts` | barrel: `export * as pi` | Modify | DS-7 |
| `src/generators/index.ts` | startup registration of pi provider | Modify | DS-7 |
| `src/commands/bp-update.ts` | `.pi/` stale cleanup blocks | Modify | DS-7 |
| `tests/commands/bp-update.test.ts` | pi stale-cleanup test cases | Modify | DS-7 |
| `bp/config.yaml` | platform list gains `pi` | Modify | DS-7 |

## TDD Strategy

- **behavior tasks**: RED → GREEN → REFACTOR (3 commits per task) — all 9 tasks are `type:behavior` except T-9 (config, direct implementation).
- **Snapshot discipline**: run `npx vitest run --update` after INTENTIONAL generator/template changes; the extension snapshot (T-3) intentionally pins the generated source, and runtime-template lockstep is enforced by content-marker assertions (mirror of OMP T-38 pattern).
- **No pi installation required for tests**: runtime tests exercise the handlers with injected contexts and temp fixtures; `buildSubagentArgs`/`discoverPiAgents`/`parseJsonLine` are pure/fs-only. Real `pi` spawn is verified manually (proposal Verify) and guarded by env-bypass fallbacks.
- **Temp fixtures**: mirror `omp/extension-runtime.test.ts` (`tmpdir()` + beforeAll/afterAll cleanup) for handler tests; `bp-update.test.ts` uses the existing `bp init --yes` + seed + `bp update` exec pattern.

## Risks

| Risk | Impact | Likelihood | Mitigation |
| ------ | -------- | ------------ | ------------ |
| Generated extension drifts from the tested runtime counterpart | runtime behavior untested in repo CI | med | Byte-deterministic template + `extension-runtime.ts` counterpart + WARNING headers + `extension.test.ts` content-marker assertions (OMP pattern, proven in repo) |
| pi extension API changes break the generated extension | sessions lose context injection | low | Runtime tests exercise the handler logic; generated file is regenerable via `bp update`; env bypass (`BP_HOOKS=0`) is an operator kill-switch |
| Duplicate `bp-*` skill names when codex + pi both configured | pi may show two skills per step | med | Accepted by user (grilling Q2); pi tolerates duplicate skill names; only one harness runs at a time |
| Cleanup deletes user-owned `.pi/` files | data loss | low | Only `bp-*`-prefixed files and the `bp` extension dir are removed; non-bp entries preserved (mirrors existing `.agents/`/`.claude/` handling) |
| `ctx.getSystemPrompt()` empty at `session_start` | role augmentation missed for that session | low | Falls back to paths-only `default` block (safe); `before_agent_start` re-derives from `event.systemPrompt` on each turn |
| `bp_subagent` spawn cost (fresh pi process per task) | slow delegation for large task sets | low | Parallel mode caps concurrency at 4 (same ceiling as pi's shipped example); lean single/parallel scope keeps surface small |
| Init wizard lacks a pi option | new users can't pick pi interactively | low | Accepted scope (D-6); repo config dogfoods pi; follow-up change if requested |
