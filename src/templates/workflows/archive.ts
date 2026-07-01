import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **\\\`<change-name>\\\`** (required) — the change to archive. Provided by \\\`bp continue\\\` output or user.
- If no change name, check the \\\`pending\\\` array from \\\`bp context archive\\\` JSON, filter by status \\\`verifying\\\`, and ask the user.

### Prerequisites
- Verify phase passed (verification.md status: passed)
- All changes committed and pushed

## Steps

### Step 1: Resolve change name and get context
Run \\\`bp context archive\\\` — outputs JSON with state (pending list) and file manifest. If a change name was provided, use it directly. If not, read the \\\`pending\\\` array, filter by status \\\`verifying\\\`, ask the user to pick.

### Step 2: Dispatch archiver sub-agent
**You are the orchestrator — dispatch, do not archive yourself.** Run \\\`bp dispatch archiver --change <change-name>\\\` for platform-specific dispatch instructions.

Construct the sub-agent prompt:
- Task: archive the completed change — merge delta-specs, backfill context, move to archive/
- Read: bp/changes/<change-name>/, bp/specs/
- Output: updated specs/, archived change in archive/<date>-<name>/, tasks.md completion status
- The sub-agent's system prompt (.omp/agents/bp-archiver.md) contains archival protocol.

### Step 3: Verify archival
Check \\\`tasks.md completion status\\\` and confirm:
- Global \\\`bp/specs/\\\` updated with delta-specs
- Change directory moved to \\\`bp/archive/<date>-<name>/\\\`
- \\\`state.md\\\` reflects archived status
- Active context auto-reset to next pending change or project level

### Step 4: Advance
Run \\\`bp continue\\\` — if all phase changes are archived, routes to ship-phase.

## Guardrails
- **You are the orchestrator** — dispatch archiver, do not archive yourself
- Delta-spec merge must resolve conflicts, not overwrite
- Archived changes are never deleted
- If archival fails, the change stays in place`;

export function getArchiveSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-archive',
    description: 'Archive — dispatch archiver sub-agent for delta-spec merge + backfill',
    instructions,
  };
}

export function getArchiveCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Archive',
    description: 'Archive — dispatch archiver sub-agent for delta-spec merge + backfill',
    category: 'Workflow',
    tags: ['bp', 'archive', 'specs', 'merge', 'sub-agent'],
    content: instructions,
  };
}
