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
  agentParam: string;
  changeRef: string;
  cwdDirective: string;
}

/** Agent role → artifact template IDs for output files */
const ROLE_TEMPLATES: Record<string, string[]> = {
  planner: ['design', 'tasks'],
  executor: [],  // produces code, no artifact templates
  reviewer: ['spec-review', 'quality-review', 'goal-review'],
  verifier: ['verification'],
  archiver: ['completion'],
  researcher: ['research-stack', 'research-architecture', 'research-pitfalls'],
  'phase-researcher': ['phase-research'],
  'codebase-mapper': ['codebase-stack', 'codebase-architecture', 'codebase-conventions', 'codebase-pitfalls'],
  'spec-bootstrapper': ['spec'],
};

const FORMATS: Record<string, DispatchFormat> = {
  omp: {
    tool: 'task',
    agentParam: 'agent: bp-<role>',
    changeRef: 'cwd: <project-root>',
    cwdDirective: 'Run from project root.',
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
    lines.push(`Use the \`${fmt.tool}\` tool:`);
    lines.push('');
    lines.push('```text');
    lines.push(`${fmt.agentParam.replace('<role>', role)}`);

    if (changeName) {
      lines.push(`Change: ${changeName} (from bp/changes/${changeName}/)`);
    }

    lines.push(`${fmt.changeRef.replace('<project-root>', process.cwd())}`);
    lines.push('```');
    lines.push('');
    lines.push(fmt.cwdDirective);
    lines.push('');
    lines.push('The sub-agent prompt should include:');
    lines.push('- Read context from bp context <step> or the change directory');
    lines.push('- Output deliverables as specified in the workflow template');
    lines.push('- Write completion report when done');

    // Template instructions
    const templates = ROLE_TEMPLATES[role];
    if (templates && templates.length > 0) {
      lines.push('');
      lines.push('Tell the sub-agent to fetch its own output templates with:');
      for (const t of templates) {
        lines.push(`  \`bp template ${t}\``);
      }
      lines.push('(The sub-agent runs these CLI commands itself, not the orchestrator.)');
    }

    if (platforms.length > 1) {
      console.log(`=== ${platform} ===`);
    }
    console.log(lines.join('\n'));
    if (platforms.length > 1) console.log('');
  }
}
