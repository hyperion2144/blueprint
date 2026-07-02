/**
 * bp dispatch <role> — output platform-specific sub-agent dispatch instructions.
 *
 * Each platform integration registers its dispatch format.
 * Templates use this instead of hardcoding platform-specific tool calls.
 */

import { join } from 'node:path';
import { loadConfig } from '../core/config.js';

interface DispatchFormat {
  tool: string;
  params: Record<string, string>;
}

/** Agent role → artifact template IDs for output files */
const ROLE_TEMPLATES: Record<string, string[]> = {
  planner: ['design', 'tasks'],
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
      lines.push(`  context: Change ${changeName} at bp/changes/${changeName}/`);
    }

    lines.push('');
    lines.push('The sub-agent reads its own system prompt (see .omp/agents/).');

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
