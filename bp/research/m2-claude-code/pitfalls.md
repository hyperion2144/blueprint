# Multi-Platform Generator — Pitfalls, Risks & Anti-Patterns

> Research output for m2-claude-code milestone — known risks, anti-patterns to avoid, and mitigation strategies for adding Claude Code + `.agent/` platform support alongside existing OMP generation.

---

## Known Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| OMP generator regression from refactoring `generateAll()` dispatch | medium | high | Golden-file snapshot tests: freeze current OMP output (`platform: [omp]`), verify identical after changes. Do NOT touch OMP integration files — only add new platform integrations and change the dispatch layer. |
| `supportsCommands` const (not a function) hardcodes OMP-only logic at module level | high | medium | Refactor to a per-platform property in the integration export (e.g., `omp.capabilities.commands: true`). `generateAll()` iterates platforms and checks each platform's own capabilities — no module-level const needed. |
| Parameter format migration (`$1` → `[BP:xxx]`) in `.agent/skills/` breaks `expandTemplateVars()` | medium | high | `expandTemplateVars()` already handles both `$1` and `[BP:xxx]` formats (see `continue.ts` lines 375-394). The risk is that skill templates intended for `.agent/` still contain `$1` references that weren't converted. Mitigate by (a) adding a lint rule that flags naked `$1`/`$ARGUMENTS` in `.agent/` output paths, and (b) making the `.agent/` generator explicitly remap template body parameters before output. |
| OMP skills & commands share templates — `.agent/skills/` reuses same templates but needs parameter format change | high | medium | Template reuse is the design intent (same content source). The `.agent/skills/` generator must apply a post-processing transform that rewrites `$1` → `[BP:CHANGE_NAME]` and `$ARGUMENTS` → context-derived `[BP:xxx]`. Keep this transform explicit in the `.agent/` generator, not buried in shared code. |
| Claude Code `.claude/agents/` frontmatter differs significantly from OMP `.omp/agents/` | medium | high | OMP agents use `model: slow` (modelRole), `thinkingLevel: high`. Claude Code agents use `model: sonnet` (model alias or full ID). The shared `AgentDef` must carry enough metadata to render both formats. Recommended: keep a generic `modelOverride` in the def, resolve platform-specific rendering per integration. |
| Claude Code `.claude/commands/` uses `allowed-tools` field — OMP commands don't have one | medium | low | Claude Code commands cannot restrict tools natively via frontmatter unless explicitly set. OMP commands implicitly inherit all session tools. If claude-code commands need restricted tool sets, define them per-command; otherwise omit `allowed-tools`. |
| `.agent/skills/SKILL.md` directory structure vs `.claude/commands/<name>.md` flat file | medium | medium | The `.agent/` platform uses skill directory structure (`skills/bp-plan/SKILL.md`), while Claude Code commands use flat files (`.claude/commands/bp-plan.md`). The `generateAll()` dispatcher must emit to the correct path structure for each platform — easy to get wrong if the platform integration API doesn't expose output path templates. |
| Template divergence across platforms over time | high | high | With N platforms, there are N output renderings of the same source. Without a guard, a developer updates the template for OMP but forgets Claude Code or `.agent/`. **Mitigation: golden-file snapshot tests per platform** that fail when output changes unexpectedly. Also: all 3 platforms must be generated in CI for any template change. |
| Claude Code agent file format uses `.md` with YAML frontmatter — but `tools` field format varies | low | low | OMP uses YAML array; Claude Code expects space-separated string or YAML list. `.agent/` uses plain YAML array. The renderer per platform must produce the correct `tools` format. |

---

## Anti-Patterns to Avoid

### 1. **Copy-pasting OMP generator for new platforms**
Why it fails: duplicates ~500 lines per platform, leading to 3× the bugs and 3× the maintenance surface. You change OMP's command template and now need identical edits in claude-code and `.agent/` generators — but they have subtle frontmatter differences that make diff review unreliable.

**Do instead:** Extract a shared rendering pipeline. Platform integrations should only provide:
- Output path template (e.g., `.claude/commands/bp-{step}.md` vs `.omp/commands/bp-{step}.md`)
- Frontmatter field map (OMP has `thinkingLevel`, Claude Code has `allowed-tools`)
- Body post-processor (parameter format rewrite, if any)
- Capability flags (`supportsCommands`, `supportsSkills`, `supportsAgents`)

### 2. **Hardcoding `platform` branching in `generateAll()`**
Why it fails: `if (platform === 'omp') { … } else if (platform === 'claude-code') { … }` creates a tangled switch statement that grows with every platform. Adding platform 4 means touching the dispatch function again.

**Do instead:** Each platform integration exports a `generate(config): GeneratedFile[]` function. `generateAll()` iterates `config.platform`, imports from `integrations/<name>/`, and calls `.generate()`. Zero switch statements.

### 3. **Reusing the same template body function for commands and skills across all platforms**
Why it fails: OMP skills and commands share content but wrap it differently (skill has YAML frontmatter + `hide` field, command has `name`/`description` frontmatter). Claude Code commands use `allowed-tools` and `argument-hint`. `.agent/` skills use `[BP:xxx]` parameter format.

**Do instead:** Source templates store raw instructions (body only). Each platform's generator calls `getBodyTemplate()` and wraps it in platform-specific frontmatter. The body itself may need post-processing per platform (parameter substitution, tool reference rewrites).

### 4. **Skipping golden-file tests on the principle of "template tests are brittle"**
Why it fails: Template drift is invisible until someone manually inspects all N platforms' outputs. Without snapshot tests, a one-line change to `plan.ts` silently produces broken Claude Code commands for weeks.

**Do instead:** One snapshot test per platform. Each calls `generateAll(config)` with that platform and asserts output matches golden files. On template changes, `--update` the snapshots and diff-review all N files. This is the ONLY reliable way to prevent drift.

### 5. **Treating `.agent/agents/` and `.claude/agents/` as identical formats**
Why it fails: They look similar (both YAML frontmatter + body) but have different field sets. `.agent/agents/` is a generic spec with no modelRole/thinkingLevel and minimal frontmatter. `.claude/agents/` supports `model`, `tools`, `permissionMode`, `maxTurns`, `skills`, `hooks`, `mcpServers`, etc.

**Do instead:** The `.agent/` agent generator should produce the minimal generic format (name, description, role, tools). The claude-code agent generator should map the shared `AgentDef` to Claude Code's richer frontmatter fields, resolving model aliases from profile config.

### 6. **Dual-format confusion in .claude/ (commands vs skills)**
Why it fails: Claude Code treats `.claude/commands/` files and `.claude/skills/<name>/SKILL.md` as the same thing (both create `/command-name`). But skills support additional features (supporting files, `disable-model-invocation`, `context: fork`). If we use `.claude/commands/` now and later need a skill-only feature, migration is painful.

**Do instead:** Use `.claude/skills/` from the start. Claude Code's docs explicitly say skills are recommended over commands. The skill directory structure (with `SKILL.md`) maps directly to `.agent/skills/` format — closer alignment means less divergence.

### 7. **Letting platform-specific fields leak into shared `AgentDef` / `CommandDef`**
Why it fails: Adding `thinkingLevel` to `AgentDef` because OMP needs it, then adding `permissionMode` because Claude Code needs it — the shared type becomes a union of all platforms' fields.

**Do instead:** Keep shared defs minimal (generic identity + description + tools + body). Platform-specific rendering is the integration's job. Use an `extra?: Record<string, unknown>` escape hatch for the rare case a platform needs a truly unique field, but prefer explicit mapping per integration.

---

## Edge Cases

| Edge Case | Handling Strategy |
|-----------|------------------|
| `platform: [omp, agent]` — skills generated for `.agent/` but NOT for OMP (redundant with commands) | Check `integration.capabilities.supportsCommands`. If true, skip skills generation for that platform. `.agent/` platform has `supportsCommands: false` — generates skills. |
| `platform: [claude-code]` — only generate `.claude/skills/` and `.claude/agents/`, no `.omp/` or `.agent/` files | The platform loop only invokes integrations listed in `platform` array. Ensure every integration is self-contained (no cross-platform output contamination). |
| `platform: [omp, claude-code, agent]` — collision on `.agent/` dir if both `.agent/` platform and another write there | `.agent/` platform writes to `.agent/skills/` and `.agent/agents/`. Claude Code writes to `.claude/skills/` and `.claude/agents/`. OMP writes to `.omp/commands/`, `.omp/agents/` and `.omp/skills/`. No overlap. |
| Claude Code agents require model alias (`sonnet`) but profile stores modelRole (`slow`) | The Claude Code integration must map `slow` → `sonnet`, `default` → `haiku`, `smol` → `haiku` (or whatever aliases match). This mapping is integration-specific and must not leak into the shared profile logic. |
| `expandTemplateVars()` handles both `$1` and `[BP:xxx]` — but a template body contains literal `$1` meant for OMP's runtime, not for `.agent/`'s static file | When generating `.agent/skills/`, the generator must apply a transform pass that converts shell-facing `$1` references to `[BP:CHANGE_NAME]` (or other appropriate keys) **before** writing the file. This transform is the `.agent/` integration's responsibility. |
| Claude Code command arguments: `$0` = first arg (0-based), `$1` = second arg. OMP uses `$1` = first arg (1-based). This means the same `$1` in a template resolves to different arguments at runtime depending on platform. | In generated files, OMP skills and commands use OMP's `$1` semantics. `.agent/` skills use `[BP:xxx]`. Claude Code skills would use Claude Code's `$0`/`$1` semantics. The body content must be render-time rewritten per platform to match the target's argument convention — **not** share the same raw body text across all three. |
| No tests exist yet for generators | Before any platform changes, write golden-file tests for OMP output with `platform: [omp]`. This creates a regression baseline. Then add tests for claude-code and `.agent/` as they're built. |

---

## Dependencies at Risk

| Dependency | Version | Status | Concern |
|-----------|---------|--------|---------|
| `src/generators/index.ts` | current | active | The `supportsCommands` const is a module-level value, not a per-platform property. Refactoring to per-platform capabilities is required before adding more platforms. |
| `src/integrations/omp/` | current | active | Must remain **untouched** — zero line changes. All new code goes into new integration directories. |
| `src/core/continue.ts:expandTemplateVars()` | current | active | Already supports both `$1` and `[BP:xxx]` formats. Low risk, but the [BP:xxx]→value resolution depends on `StateFile` context at runtime — static `.agent/skills/` files contain unresolved `[BP:xxx]` placeholders. |
| `WORKFLOW_REGISTRY` (src/templates/workflows/registry.ts) | current | active | Currently registers `command` and `skill` template getters. May need an additional getter per new platform if body content differs. As of m2, `.agent/` skills share the same `skill` template with post-processing — no registry change needed initially. |
| Template body content (`src/templates/workflows/*.ts`) | current | active | Mixed usage of `$1` and `[BP:xxx]` across templates (see `plan.ts` line 34 uses `$1`, but line 57 uses `[BP:CHANGE_NAME]`). This mixed format is fine for OMP runtime, but the `.agent/` generator must normalize all parameter references to `[BP:xxx]` format. |
| `src/templates/workflows/shared.ts` | current | active | `CHANGE_NAME_RESOLVE` uses `$ARGUMENTS` string literal in its output — this flows into generated skill/command body content. `.agent/` skills must rewrite this to reference `[BP:CHANGE_NAME]` instead. |

---

## Summary of architectural recommendations

1. **Zero changes to `src/integrations/omp/`** — this is the golden rule. All new platform code in new directories.
2. **Refactor `supportsCommands`** from a module-level `const` to a per-integration capability flag, so `generateAll()` can iterate platforms generically.
3. **Each platform integration exports `generate(config)`**, not separate `generateCommands`/`generateAgents`/`generateSkills`. The integration decides what to generate based on its own capabilities.
4. **Template body post-processing per platform** — shared `WORKFLOW_REGISTRY` provides raw instructions; each platform applies its own parameter rewrite (`$1` → `$0` for Claude Code, `$1` → `[BP:CHANGE_NAME]` for `.agent/`, keep as-is for OMP).
5. **Golden-file snapshot tests** per platform before and after changes. This is the only defense against silent output drift.
6. **Use `.claude/skills/` not `.claude/commands/`** for Claude Code — skill directory structure aligns with `.agent/skills/`, and Claude Code docs recommend skills over commands.
