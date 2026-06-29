import { loadState } from './state-file.js';
import { getNextSteps } from './state-machine.js';
import type { StateFile } from '../types/index.js';

export interface ContinueResult {
  currentStep: string;
  context: string;
  nextCommand: string | null;
  slashCommand: string | null;
  needsSubagent: boolean;
  availableSteps: { command: string; slashCommand: string; subagent: boolean }[];
  hint: string | null;
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
    return determineFromChangeStatus(
      changeName,
      `adhoc-${adhoc.status}`,
      adhoc.status === 'proposal' ? 'adhoc' : 'change',
    );
  }

  return {
    error: `change 不存在: ${changeName}。可用: ${listAvailableChanges(state)}`,
  };
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
