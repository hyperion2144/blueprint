/**
 * specwf continue — 自动推进到下一步
 */

import { join } from 'node:path';
import { determineNextStep } from '../core/continue.js';

export function register(program: any): void {
  program
    .command('continue')
    .description('自动推进到下一步（读 state.md → 确定下一步 → 输出）')
    .action(continueHandler);
}

function continueHandler() {
  const specwfDir = join(process.cwd(), 'specwf');

  const result = determineNextStep(specwfDir);

  console.log('─'.repeat(50));
  console.log(`当前位置: ${result.context}`);
  console.log(`当前步骤: ${result.currentStep}`);

  if (result.nextCommand) {
    console.log('');
    console.log(`→ 推荐下一步: ${result.nextCommand}`);
    if (result.slashCommand) {
      console.log(`   Slash 命令: ${result.slashCommand}`);
    }
    if (result.needsSubagent) {
      console.log(`   需要子代理: 是`);
    }
  } else {
    console.log('');
    console.log('→ 当前无可用下一步');
    if (result.hint) {
      console.log(`   💡 ${result.hint}`);
    }
  }
  console.log('─'.repeat(50));
}
