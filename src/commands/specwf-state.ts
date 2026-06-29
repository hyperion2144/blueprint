/**
 * specwf state — 查看/修改当前状态
 */

import { join } from 'node:path';
import { loadState, updateState } from '../core/state-file.js';
import { validateStepAdvance } from '../core/state-validator.js';

export function register(program: any): void {
  const cmd = program
    .command('state')
    .description('查看/修改当前状态');

  cmd
    .command('show')
    .description('查看当前状态')
    .action(showState);

  cmd
    .command('set-milestone <id>')
    .description('切换到指定 milestone')
    .action(setMilestone);

  cmd
    .command('set-phase <id>')
    .description('切换到指定 phase')
    .action(setPhase);

  cmd
    .command('set-step <step>')
    .description('设置当前步骤')
    .action(setStep);

  // 默认行为：show
  cmd.action(showState);
}

function findSpecwfDir(): string {
  return join(process.cwd(), 'specwf');
}

function showState() {
  const specwfDir = findSpecwfDir();
  const state = loadState(specwfDir);

  const { project, active_context } = state;
  console.log('─'.repeat(50));
  console.log(`项目: ${project.name}`);
  console.log(`状态: ${project.status}`);
  console.log(`Milestone: ${project.current_milestone ?? '(无)'}`);
  console.log(`Phase: ${project.current_phase ?? '(无)'}`);
  console.log(`当前类型: ${active_context.type}`);
  console.log(`当前步骤: ${active_context.step}`);
  if (active_context.ref) {
    console.log(`引用: ${active_context.ref}`);
  }
  console.log('─'.repeat(50));
}

function setMilestone(id: string) {
  const specwfDir = findSpecwfDir();
  updateState(specwfDir, (state) => {
    state.project.current_milestone = id;
    state.project.current_phase = null;
    state.active_context.type = 'milestone';
    state.active_context.ref = `milestones/${id}`;
    state.active_context.step = 'active';
    state.project.status = 'milestone-active';
  });
  console.log(`✓ 切换到 milestone: ${id}（状态: milestone-active）`);
  console.log('→ 下一步: 定义里程碑需求: /specwf:grill');
}

function setPhase(id: string) {
  const specwfDir = findSpecwfDir();
  updateState(specwfDir, (state) => {
    state.project.current_phase = id;
    state.active_context.type = 'phase';
    state.active_context.ref = `milestones/${state.project.current_milestone ?? '?'}/phases/${id}`;
    state.active_context.step = 'discuss';
    state.project.status = 'phase-discuss';
  });
  console.log(`✓ 切换到 phase: ${id}（状态: phase-discuss）`);
  console.log('→ 下一步: /specwf:discuss');
}

function setStep(step: string) {
  const specwfDir = findSpecwfDir();
  const state = loadState(specwfDir);

  // 构造当前状态键
  const ctx = state.active_context;
  let currentStatus: string;
  switch (ctx.type) {
    case 'project': currentStatus = state.project.status; break;
    case 'milestone': currentStatus = 'milestone-active'; break;
    case 'phase': currentStatus = `phase-${ctx.step}`; break;
    case 'change': currentStatus = `change-${ctx.step}`; break;
    case 'adhoc': currentStatus = `adhoc-${ctx.step}`; break;
    default: currentStatus = state.project.status;
  }

  // 校验当前步骤的退出条件
  const result = validateStepAdvance(ctx.type, ctx.step, process.cwd());
  if (!result.valid) {
    console.log('─'.repeat(50));
    console.log('❌ 前置条件未满足，无法推进:');
    for (const err of result.errors) {
      console.log(`   • ${err}`);
    };
    console.log('─'.repeat(50));
    return;
  }

  updateState(specwfDir, (state) => {
    state.active_context.step = step;
  });
  console.log(`✓ 当前步骤: ${step}`);
}
