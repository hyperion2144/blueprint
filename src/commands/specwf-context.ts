/**
 * specwf context <step> — 输出当前步骤上下文清单
 */

import { join } from 'node:path';
import { loadState } from '../core/state-file.js';
import { generateContext, formatContextTerminal } from '../core/spec-injector.js';

export function register(program: any): void {
  program
    .command('context <step>')
    .description('输出当前步骤上下文文件清单')
    .option('--json', 'JSON 格式输出')
    .action(contextHandler);
}

function contextHandler(step: string, options: { json?: boolean }) {
  const specwfDir = join(process.cwd(), 'specwf');

  const result = generateContext(specwfDir, step);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatContextTerminal(result));
  }
}
