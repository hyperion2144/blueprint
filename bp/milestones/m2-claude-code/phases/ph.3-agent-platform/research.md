# Research: ph.3-agent-platform

> Express path — all decisions clear from ph.1/ph.2 and milestone-level research.

Implementation mirrors ph.2 pattern with two changes:
1. Path: `.agent/skills/bp-<step>/SKILL.md` (subdir) + `.agent/agents/bp-<role>.md`
2. Skills: WORKFLOW_REGISTRY body with `$1`→`[BP:CHANGE_NAME]` substitution
3. Agents: generic frontmatter (no OMP-specific fields)
