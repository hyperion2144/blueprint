/**
 * bp dispatch <role> — output platform-specific sub-agent dispatch instructions.
 *
 * Each platform integration registers its dispatch format.
 * Templates use this instead of hardcoding platform-specific tool calls.
 */

import { join } from 'node:path';
import { loadConfig } from '../core/config.js';
import { loadState } from '../core/state-file.js';

interface IsolationInfo {
  type: 'auto' | 'param' | 'none';
  /** Spawn tool field name when type=param */
  field?: string;
  /** Field value when type=param */
  fieldValue?: string;
  /** Human description of isolation behavior */
  description: string;
}

/** Platform-specific isolation info for executor role only */
const EXECUTOR_ISOLATION: Record<string, IsolationInfo> = {
  omp: {
    type: 'param',
    field: 'isolated',
    fieldValue: 'true',
    description: 'Pass "isolated: true" per task item — OMP automatically creates an isolated worktree for the sub-agent.',
  },
  'claude-code': {
    type: 'param',
    field: 'worktree',
    fieldValue: '<change>-<wave>',
    description: 'Pass "worktree: <change>-<wave>" — Claude Code automatically creates an isolated worktree at .claude/worktrees/ and cleans up on completion.',
  },
  agent: {
    type: 'none',
    description: 'No built-in isolation. Orchestrator must manually create a git worktree (git worktree add) and include "cd <worktree>" in the sub-agent prompt. Merge back and clean up after completion.',
  },
};

interface DispatchFormat {
  tool: string;
  params: Record<string, string>;
}

/** Agent role → artifact template IDs for output files */
const ROLE_TEMPLATES: Record<string, string[]> = {
  planner: ['design', 'tasks', 'spec', 'global-spec'],
  executor: [],  // produces code, no artifact templates
  reviewer: ['spec-review', 'quality-review', 'goal-review'],
  researcher: ['research-stack', 'research-architecture', 'research-pitfalls'],
  'phase-researcher': ['phase-research'],
  'codebase-mapper': ['codebase-stack', 'codebase-architecture', 'codebase-structure', 'codebase-conventions', 'codebase-testing', 'codebase-integrations', 'codebase-concerns'],
  'spec-bootstrapper': ['spec'],
};

const FORMATS: Record<string, DispatchFormat> = {
  omp: {
    tool: 'task',
    params: {
      agent: 'bp-<role>',
      role: '<role>',
      assignment: '<prompt>',
    },
  },
  'claude-code': {
    tool: 'agent',
    params: {
      subagent_type: 'bp-<role>',
      prompt: '<prompt>',
    },
  },
  agent: {
    tool: 'task',
    params: {
      agent: 'bp-<role>',
      role: '<role>',
      assignment: '<prompt>',
    },
  },
};

export function register(program: any): void {
  program
    .command('dispatch <role>')
    .description('Output platform-specific sub-agent dispatch instructions')
    .option('--change <name>', 'change name to pass to the sub-agent')
    .option('--dir <path>', 'bp directory', 'bp')
    .action(dispatchHandler);
}

function dispatchHandler(role: string, options: { change?: string; dir: string }) {
  const bpDir = join(process.cwd(), options.dir);
  const config = loadConfig(bpDir);
  const platforms: string[] = config.platform || ['omp'];

  for (const platform of platforms) {
    const fmt = FORMATS[platform];
    if (!fmt) continue;

    const changeName = options.change || null;
    const lines: string[] = [];

    lines.push(`## Dispatch: bp-${role} (${platform})`);
    lines.push('');
    lines.push(`Call the \`${fmt.tool}\` tool with these parameters:`);
    lines.push('');

    for (const [key, value] of Object.entries(fmt.params)) {
      const resolved = value.replace('<role>', role);
      lines.push(`  ${key}: ${resolved}`);
    }

    if (changeName) {
      const state = loadState(bpDir);
      const change = state.changes.find((c) => c.name === changeName);
      const adhoc = state.adhoc.find((c) => c.name === changeName);
      const actualChange = change || adhoc;
      if (actualChange) {
        const isPhaseChange = state.changes.includes(actualChange);
        const path = isPhaseChange && state.project.current_milestone && state.project.current_phase
          ? 'bp/milestones/' + state.project.current_milestone + '/phases/' + state.project.current_phase + '/changes/' + changeName + '/'
          : 'bp/changes/' + changeName + '/';
        lines.push('  context: Change ' + changeName + ' at ' + path);
      }
    }

    // Isolation info
    lines.push('');
    lines.push('### Isolation');
    const isolation: IsolationInfo = role === 'executor'
      ? (EXECUTOR_ISOLATION[platform] ?? { type: 'none', description: 'No isolation configured for this platform.' })
      : { type: 'none', description: 'Read-only role — no isolation needed.' };
    if (isolation.type === 'param') {
      lines.push(`- Support: yes`);
      lines.push(`- Type: param`);
      lines.push(`- Mechanism: pass \`${isolation.field}: ${isolation.fieldValue}\` to the \`${fmt.tool}\` tool`);
      lines.push(`- ${isolation.description}`);
    } else if (isolation.type === 'auto') {
      lines.push(`- Support: auto (platform isolates sub-agents by default)`);
      lines.push(`- Type: auto`);
      lines.push(`- ${isolation.description}`);
    } else {
      lines.push(`- Support: no`);
      lines.push(`- Type: none`);
      lines.push(`- Read-only role — no isolation needed.`);
    }

    lines.push('');
    lines.push('The sub-agent reads its own system prompt (see platform agent file).');

    // Template instructions
    const templates = ROLE_TEMPLATES[role];
    if (templates && templates.length > 0) {
      lines.push('Output templates for the sub-agent to use:');
      for (const t of templates) {
        lines.push(`  bp template ${t}`);
      }
    }

    if (platforms.length > 1) {
      console.log(`=== ${platform} ===`);
    }
    console.log(lines.join('\n'));
    if (platforms.length > 1) console.log('');
  }
}
