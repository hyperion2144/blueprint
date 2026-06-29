import { loadState } from './state-file.js';
import { getNextSteps } from './state-machine.js';
import type { StateFile } from '../types/index.js';

export interface StepInfo {
  command: string;
  description: string;
  artifacts: string[];
  fileRef: string;
}

export interface ContinueResult {
  currentStep: string;
  context: string;
  nextCommand: string | null;
  slashCommand: string | null;
  needsSubagent: boolean;
  availableSteps: { command: string; slashCommand: string; subagent: boolean }[];
  hint: string | null;
  /** 下一步的详细信息 */
  nextStepInfo?: StepInfo;
}

export function determineNextStep(specwfDir: string): ContinueResult {
  return determineFromState(loadState(specwfDir));
}

/**
 * 查询指定 change 的下一步
 * 同时在 state.changes 和 state.adhoc 中查找
 */
export function determineChangeNextStep(
  specwfDir: string,
  changeName: string,
): ContinueResult | { error: string } {
  const state = loadState(specwfDir);

  // 先在普通 changes 中查找
  const change = state.changes.find((c) => c.name === changeName);
  if (change) {
    return determineFromChangeStatus(changeName, `change-${change.status}`, 'change');
  }

  // 再在 adhoc changes 中查找
  const adhoc = state.adhoc.find((c) => c.name === changeName);
  if (adhoc) {
    // adhoc 进入标准 change 循环后，状态键使用 change- 前缀
    // 只有 proposal 仍使用 adhoc- 前缀（对应 adhoc-proposal）
    const prefix = adhoc.status === 'proposal' ? 'adhoc' : 'change';
    return determineFromChangeStatus(
      changeName,
      `${prefix}-${adhoc.status}`,
      'adhoc',
    );
  }

  return {
    error: `change 不存在: ${changeName}。可用: ${listAvailableChanges(state)}`,
  };
}

/** 步骤信息表 */
const STEP_INFO: Record<string, StepInfo> = {
  grill: {
    command: 'grill',
    description: '通过逐条提问收集需求，产出 requirements.md',
    artifacts: ['specwf/requirements.md'],
    fileRef: '.omp/commands/specwf-grill.md',
  },
  research: {
    command: 'research',
    description: '并行调研技术方向和架构方案',
    artifacts: ['specwf/research/stack.md', 'specwf/research/architecture.md', 'specwf/research/pitfalls.md', 'specwf/research/summary.md'],
    fileRef: '.omp/commands/specwf-research.md',
  },
  'research-done': {
    command: 'research-done',
    description: '标记调研完成，进入路线图拆分',
    artifacts: [],
    fileRef: '',
  },
  roadmap: {
    command: 'roadmap',
    description: '将项目拆分为 Milestone × Phase',
    artifacts: ['specwf/roadmap.md'],
    fileRef: '.omp/commands/specwf-roadmap.md',
  },
  discuss: {
    command: 'discuss',
    description: 'Phase 讨论，捕获实现决策',
    artifacts: ['milestones/<ms>/phases/<ph>/context.md'],
    fileRef: '.omp/commands/specwf-discuss.md',
  },
  'research-phase': {
    command: 'research-phase',
    description: '对当前 phase 进行技术调研',
    artifacts: ['milestones/<ms>/phases/<ph>/research.md'],
    fileRef: '.omp/commands/specwf-research-phase.md',
  },
  split: {
    command: 'split',
    description: '将 phase 拆分为多个 change，确定依赖图',
    artifacts: ['specwf/roadmap.md（更新）'],
    fileRef: '.omp/commands/specwf-split.md',
  },
  plan: {
    command: 'plan',
    description: 'Change 设计：设计技术方案、拆分任务、预写 delta-specs',
    artifacts: ['design.md', 'tasks.md', 'specs/<domain>/spec.md'],
    fileRef: '.omp/commands/specwf-plan.md',
  },
  apply: {
    command: 'apply',
    description: '按 tasks.md 实现代码，type:behavior 走 RED→GREEN→REFACTOR',
    artifacts: ['代码变更', '测试'],
    fileRef: '.omp/commands/specwf-apply.md',
  },
  review: {
    command: 'review',
    description: '三重审查：规格审查 + 质量审查 + 目标审查',
    artifacts: ['REVIEW.md'],
    fileRef: '.omp/commands/specwf-review.md',
  },
  verify: {
    command: 'verify',
    description: '运行测试，诊断根因，路由回环',
    artifacts: ['VERIFICATION.md'],
    fileRef: '.omp/commands/specwf-verify.md',
  },
  archive: {
    command: 'archive',
    description: 'Delta-spec 合并 + 代码认知回灌 + 目录归档',
    artifacts: ['archive/<change-id>/'],
    fileRef: '.omp/commands/specwf-archive.md',
  },
  'ship-phase': {
    command: 'ship-phase',
    description: '创建 PR + 更新 state.md',
    artifacts: ['GitHub PR', 'state.md 更新'],
    fileRef: '.omp/commands/specwf-ship.md',
  },
  'ship-milestone': {
    command: 'ship-milestone',
    description: '发布 release tag + 更新版本号',
    artifacts: ['git tag', 'RELEASE.md', 'npm publish'],
    fileRef: '.omp/commands/specwf-ship.md',
  },
};

function getStepInfo(command: string): StepInfo | undefined {
  return STEP_INFO[command];
}

function determineFromChangeStatus(
  name: string,
  statusKey: string,
  type: 'change' | 'adhoc',
): ContinueResult {
  const available = getNextSteps(statusKey);
  const availableSteps = available.map((t) => ({
    command: t.command,
    slashCommand: t.slashCommand,
    subagent: t.subagent ?? false,
  }));
  const first = available[0];

  return {
    currentStep: statusKey,
    context: `${type === 'adhoc' ? '临时 Change' : 'Change'} (${name})`,
    nextCommand: first?.command ?? null,
    slashCommand: first?.slashCommand || null,
    needsSubagent: first?.subagent ?? false,
    availableSteps,
    hint: available.length === 0
      ? '该 change 已没有可用下一步。创建新 change 继续。'
      : null,
    nextStepInfo: first ? getStepInfo(first.command) : undefined,
  };
}

function listAvailableChanges(state: StateFile): string {
  const names = [
    ...state.changes.map((c) => c.name),
    ...state.adhoc.map((c) => c.name),
  ];
  return names.join(', ') || '(无)';
}

export function determineFromState(state: StateFile): ContinueResult {
  const ctx = state.active_context;
  const currentStatus = resolveStatus(state);
  const available = getNextSteps(currentStatus);

  const availableSteps = available.map((t) => ({
    command: t.command,
    slashCommand: t.slashCommand,
    subagent: t.subagent ?? false,
  }));

  const first = available[0];
  const hint = available.length === 0 ? generateHint(state) : null;

  return {
    currentStep: ctx.step,
    context: formatContext(state),
    nextCommand: first?.command ?? null,
    slashCommand: first?.slashCommand || null,
    needsSubagent: first?.subagent ?? false,
    availableSteps,
    hint,
    nextStepInfo: first ? getStepInfo(first.command) : undefined,
  };
}

function resolveStatus(state: StateFile): string {
  const ctx = state.active_context;
  switch (ctx.type) {
    case 'project':
      return state.project.status;
    case 'milestone':
      return state.project.status === 'milestone-shipped' ? 'milestone-shipped' : 'milestone-active';
    case 'phase':
      return `phase-${ctx.step}`;
    case 'change':
      return `change-${ctx.step}`;
    case 'adhoc':
      return `adhoc-${ctx.step}`;
    default:
      return state.project.status;
  }
}

function formatContext(state: StateFile): string {
  const { type, ref, step } = state.active_context;
  switch (type) {
    case 'project': return `项目层 — ${step}`;
    case 'milestone': return `Milestone ${state.project.current_milestone ?? '?'} — ${step}`;
    case 'phase': return `Phase ${state.project.current_phase ?? '?'} — ${step}`;
    case 'change': return `Change (${ref ?? '?'}) — ${step}`;
    case 'adhoc': return `临时 Change (${ref ?? '?'}) — ${step}`;
    default: return step;
  }
}

function generateHint(state: StateFile): string | null {
  const status = state.project.status;
  if (status === 'milestone-shipped') {
    const pendingAdhoc = state.adhoc.filter((c) => c.status !== 'archived');
    const hintParts: string[] = ['当前 milestone 已完成。创建新 milestone: specwf state set-milestone <id>'];
    if (pendingAdhoc.length > 0) {
      hintParts.push(
        `待处理的临时 change: ${pendingAdhoc.map((c) => c.name).join(', ')}` +
        `。使用: specwf continue change <name>`,
      );
    }
    return hintParts.join('\n    ');
  }
  if (status === 'phase-shipped') {
    return '当前 phase 已完成。创建新 phase 或切换: specwf state set-milestone <id>';
  }
  return null;
}
