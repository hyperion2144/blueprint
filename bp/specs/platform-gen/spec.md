# Platform-Gen — Initial Spec

## SHALL

### SHALL support three platforms: omp, claude-code, agent

- SHALL `blueprint update`: iterate over `project.yml.platform` array and generate files for each listed platform.
  - GIVEN `platform: [omp, agent]`
  - WHEN `blueprint update` runs
  - THEN `.omp/commands/`, `.omp/agents/`, AND `.agent/skills/`, `.agent/agents/` are all generated

### SHALL generate `.agent/skills/` with [BP:xxx] parameter format

- SHALL `.agent/skills/bp-<step>/SKILL.md`: use `[BP:MILESTONE_ID]`, `[BP:CHANGE_NAME]`, etc. instead of `$1`/`$ARGUMENTS`.
  - GIVEN a workflow step template with `$1` in body
  - WHEN generating the `.agent/skills/` version
  - THEN `$1` is replaced by `[BP:CHANGE_NAME]` (or appropriate `[BP:xxx]` key)
  - AND `[BP:xxx]` parameters are substituted by `expandTemplateVars()` at runtime

### SHALL generate `.agent/agents/` with generic frontmatter

- SHALL `.agent/agents/bp-<role>.md`: use generic frontmatter fields (name, description, role, tools) instead of OMP-specific fields.
  - GIVEN the same agent definition
  - WHEN generating the `.agent/` version
  - THEN frontmatter does NOT include OMP-specific fields like `modelRoles` or `thinkingLevel`
  - AND tools are listed as a simple YAML array

## MUST

### MUST keep OMP generator unchanged

- MUST all existing OMP generator code: remain functional when `platform` includes `omp`.
  - GIVEN `platform: [omp]` (single entry)
  - WHEN `blueprint update` runs
  - THEN output is identical to before m2-claude-code changes

### MUST support single and multiple platform entries

- MUST `blueprint update`: handle both single-platform and multi-platform `platform` arrays.
  - GIVEN `platform: [agent]`
  - WHEN `blueprint update` runs
  - THEN only `.agent/` files are generated
  - GIVEN `platform: [omp, claude-code, agent]`
  - WHEN `blueprint update` runs
  - THEN all three platforms' files are generated
