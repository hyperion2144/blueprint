/**
 * specwf dispatch <role> — output platform-specific sub-agent dispatch instructions.
 *
 * Each platform integration registers its dispatch format.
 * Templates use this instead of hardcoding platform-specific tool calls.
 */

import { join } from 'node:path';
import { loadConfig } from '../core/config.js';

/** Platform-specific dispatch format */
interface DispatchFormat {
  /** Tool name to use */
  tool: string;
  /** Agent type parameter name */
  agentParam: string;
  /** How to pass the change name */
  changeRef: string;
  /** How to set working directory */
  cwdDirective: string;
}

const FORMATS: Record<string, DispatchFormat> = {
  omp: {
    tool: 'task',
    agentParam: 'agent: specwf-<role>',
    changeRef: 'cwd: <project-root>',
    cwdDirective: 'Run from project root. Pass change name as <change-name>.',
  },
  // Future platforms:
  // 'claude-code': {
  //   tool: 'Task',
  //   agentParam: 'subagent_type: "specwf-<role>"',
  //   changeRef: 'cwd: "<project-root>"',
  //   cwdDirective: 'Run from project root. Use Task tool.',
  // },
};

export function register(program: any): void {
  program
    .command('dispatch <role>')
    .description('Output platform-specific sub-agent dispatch instructions')
    .option('--change <name>', 'change name to pass to the sub-agent')
    .option('--dir <path>', 'specwf directory', 'specwf')
    .action(dispatchHandler);
}

function dispatchHandler(role: string, options: { change?: string; dir: string }) {
  const specwfDir = join(process.cwd(), options.dir);
  const config = loadConfig(specwfDir);
  const platforms: string[] = config.platform || ['omp'];

  for (const platform of platforms) {
    const fmt = FORMATS[platform];
    if (!fmt) continue;

    const changeName = options.change || '<change-name>';

    const instructions = [
      `## Dispatch: specwf-${role} (${platform})`,
      '',
      `Use the \`${fmt.tool}\` tool:`,
      '',
      '```text',
      `${fmt.agentParam.replace('<role>', role)}`,
      `Change: ${changeName} (from specwf/changes/${changeName}/)`,
      `${fmt.changeRef.replace('<project-root>', process.cwd())}`,
      '```',
      '',
      fmt.cwdDirective,
      '',
      'The sub-agent prompt should include:',
      `- Read context from specwf context <step> or the change directory`,
      `- Output deliverables as specified in the workflow template`,
      `- Write completion report when done`,
    ].join('\n');

    if (platforms.length > 1) {
      console.log(`=== ${platform} ===`);
    }
    console.log(instructions);
    if (platforms.length > 1) console.log('');
  }
}
