/**
 * specwf continue — 自动推进到下一步
 */

import { join } from 'node:path';
import { determineNextStep, determineChangeNextStep } from '../core/continue.js';
import type { ContinueResult } from '../core/continue.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function register(program: any): void {
  const cmd = program
    .command('continue')
    .description('自动推进到下一步（读 state.md → 确定下一步 → 输出）');

  cmd
    .command('change <name>')
    .description('查询指定 change 的下一步')
    .action(continueChangeHandler);

  cmd.action(continueHandler);
}

function formatContinueResult(result: ContinueResult): void {
  console.log('─'.repeat(50));
  console.log(`当前位置: ${result.context}`);
  console.log(`当前步骤: ${result.currentStep}`);

  if (result.nextCommand) {
    const info = result.nextStepInfo;
    console.log('');
    console.log(`→ 下一步: ${result.nextCommand}`);
    if (result.slashCommand) {
      console.log(`   Slash 命令: ${result.slashCommand}`);
    }
    if (result.needsSubagent) {
      console.log(`   需要子代理: 是`);
    }
    if (info) {
      console.log(`   描述: ${info.description}`);
      if (info.artifacts.length > 0) {
        console.log(`   产出物:`);
        for (const a of info.artifacts) {
          console.log(`     - ${a}`);
        }
      }
      if (info.fileRef) {
        console.log(`   参考: ${info.fileRef}`);
      }
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

function continueHandler(): void {
  const specwfDir = join(process.cwd(), 'specwf');
  const result = determineNextStep(specwfDir);
  formatContinueResult(result);
}

function continueChangeHandler(name: string): void {
  const specwfDir = join(process.cwd(), 'specwf');
  const result = determineChangeNextStep(specwfDir, name);
  if ('error' in result) {
    console.log('─'.repeat(50));
    console.log(result.error);
    console.log('─'.repeat(50));
    return;
  }
  formatContinueResult(result);
}
