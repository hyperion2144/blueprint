/**
 * specwf continue — 自动推进到下一步
 */

import { join } from 'node:path';
import { determineNextStep, determineChangeNextStep } from '../core/continue.js';
import { loadState, updateState } from '../core/state-file.js';
import { validateStepAdvance } from '../core/state-validator.js';
import { getNextSteps, getTransition } from '../core/state-machine.js';
import type { ContinueResult } from '../core/continue.js';

export function register(program: any): void {
  const cmd = program
    .command('continue')
    .description('自动推进到下一步（检查前置条件 → 更新状态 → 输出下一步）');

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

/** 根据 context type 和 step 构造状态机状态键 */
function resolveStatusKey(type: string, step: string, projectStatus: string): string {
  switch (type) {
    case 'project': return projectStatus;
    case 'milestone': return projectStatus === 'milestone-shipped' ? 'milestone-shipped' : 'milestone-active';
    case 'phase': return `phase-${step}`;
    case 'change': return `change-${step}`;
    case 'adhoc': return `adhoc-${step}`;
    default: return projectStatus;
  }
}

function continueHandler(): void {
  const specwfDir = join(process.cwd(), 'specwf');
  const cwd = process.cwd();

  // 1. 校验当前步骤退出条件
  const state = loadState(specwfDir);
  const validation = validateStepAdvance(state.active_context.type, state.active_context.step, state.active_context.ref, cwd);
  if (!validation.valid) {
    console.log('─'.repeat(50));
    console.log('❌ 当前步骤未完成，无法推进：');
    for (const err of validation.errors) {
      console.log(`   • ${err}`);
    }
    console.log('─'.repeat(50));
    return;
  }

  // 2. 查询下一步
  const result = determineNextStep(specwfDir);

  // 3. 自动更新状态
  if (result.nextCommand) {
    const currentStatus = resolveStatusKey(
      state.active_context.type,
      state.active_context.step,
      state.project.status,
    );
    const transition = getTransition(currentStatus, result.nextCommand);

    if (transition) {
      updateState(specwfDir, (s) => {
        s.active_context.step = transition.to;
        // 项目级和 milestone 级状态同步到 project.status
        if (s.active_context.type === 'project' || s.active_context.type === 'milestone') {
          s.project.status = transition.to;
        }
      });
      console.log(`✓ 状态已推进: ${currentStatus} → ${transition.to}`);
    }
  }

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
