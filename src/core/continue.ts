import { loadState } from './state-file.js';
import { getNextSteps } from './state-machine.js';
import type { StateFile } from '../types/index.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../templates/workflows/registry.js';

export interface StepInfo {
  command: string;
  description: string;
  artifacts: string[];
  fileRef: string;
  /** Full workflow instructions from the TypeScript template */
  instructions?: string;
}

export interface ContinueResult {
  currentStep: string;
  context: string;
  type: string;
  status: string;
  nextCommand: string | null;
  slashCommand: string | null;
  needsSubagent: boolean;
  availableSteps: { command: string; slashCommand: string; subagent: boolean }[];
  hint: string | null;
  /** Detailed info for the next step */
  nextStepInfo?: StepInfo;
  /** Full inline instructions for the next step (from TS template) */
  instructions?: string;
  /** Pending changes for hint display */
  pending?: { name: string; status: string; depends_on?: string[] }[];
}

export function determineNextStep(bpDir: string): ContinueResult {
  return determineFromState(loadState(bpDir));
}

/**
 * Get next step for a specific change.
 * Looks in both state.changes and state.adhoc.
 */
export function determineChangeNextStep(
  bpDir: string,
  changeName: string,
): ContinueResult | { error: string } {
  const state = loadState(bpDir);

  // Look in regular changes first
  const change = state.changes.find((c) => c.name === changeName);
  if (change) {
    return determineFromChangeStatus(changeName, `change-${change.status}`, 'change');
  }

  // Then look in adhoc changes
  const adhoc = state.adhoc.find((c) => c.name === changeName);
  if (adhoc) {
    // adhoc changes use change- prefix once past proposal (only proposal uses adhoc-)
    const prefix = adhoc.status === 'proposal' ? 'adhoc' : 'change';
    return determineFromChangeStatus(
      changeName,
      `${prefix}-${adhoc.status}`,
      'adhoc',
    );
  }

  return {
    error: `Change not found: ${changeName}. Available: ${listAvailableChanges(state)}`,
  };
}

/** 步骤信息表 */
const STEP_INFO: Record<string, StepInfo> = {
  grill: {
    command: 'grill',
    description: 'Requirements exploration — 5W1H questioning, output requirements.md',
    artifacts: ['bp/requirements.md'],
    fileRef: '',
  },
  research: {
    command: 'research',
    description: 'Parallel technical research — dispatch researcher sub-agents',
    artifacts: ['bp/research/stack.md', 'bp/research/architecture.md', 'bp/research/pitfalls.md', 'bp/research/summary.md'],
    fileRef: '',
  },
  'research-done': {
    command: 'research-done',
    description: 'Mark research complete, proceed to roadmap',
    artifacts: [],
    fileRef: '',
  },
  roadmap: {
    command: 'roadmap',
    description: 'Split project into Milestones x Phases',
    artifacts: ['bp/roadmap.md'],
    fileRef: '',
  },
  discuss: {
    command: 'discuss',
    description: 'Phase discussion — capture implementation decisions into context.md',
    artifacts: ['context.md'],
    fileRef: '',
  },
  'research-phase': {
    command: 'research-phase',
    description: 'Phase-level technical research — dispatch phase-researcher sub-agent',
    artifacts: ['research.md'],
    fileRef: '',
  },
  split: {
    command: 'split',
    description: 'Split phase into changes with dependency graph',
    artifacts: ['bp/changes/<name>/'],
    fileRef: '',
  },
  plan: {
    command: 'plan',
    description: 'Change design — dispatch planner sub-agent for design + tasks + delta-specs',
    artifacts: ['design.md', 'tasks.md', 'specs/<domain>/spec.md'],
    fileRef: '',
  },
  apply: {
    command: 'apply',
    description: 'Code implementation — dispatch executor sub-agent for TDD',
    artifacts: ['code changes', 'tests', 'change-summary.md'],
    fileRef: '',
  },
  review: {
    command: 'review',
    description: 'Triple review — dispatch three reviewer sub-agents in parallel',
    artifacts: ['spec-review.md', 'quality-review.md', 'goal-review.md'],
    fileRef: '',
  },
  archive: {
    command: 'archive',
    description: 'Verify & archive — run checks, then delta-spec merge + move to archive/',
    artifacts: ['verification.md', 'archive/<change-id>/'],
    fileRef: '',
  },
  'ship-phase': {
    command: 'ship-phase',
    description: 'Phase ship — create PR, update state.md',
    artifacts: ['GitHub PR'],
    fileRef: '',
  },
  'ship-milestone': {
    command: 'ship-milestone',
    description: 'Milestone ship — release tag, update version',
    artifacts: ['git tag', 'RELEASE.md'],
    fileRef: '',
  },
  'next-change': {
    command: 'next-change',
    description: 'Auto: check pending changes, route to next or mark phase ready',
    artifacts: [],
    fileRef: '',
  },
  'phase-ready': {
    command: 'phase-ready',
    description: 'Phase complete. Advancing to next phase or milestone ship.',
    artifacts: [],
    fileRef: '',
  },
  'phase-start': {
    command: 'phase-start',
    description: 'Phase activated. bp continue to begin.',
    artifacts: [],
    fileRef: '',
  },
  'discuss-start': {
    command: 'discuss-start',
    description: 'Starting discuss — outputting /bp:discuss instructions.',
    artifacts: [],
    fileRef: '',
  },
  'fix-planning': {
    command: 'fix-plan',
    description: 'Fix design — correct architecture/approach based on review BLOCKERs',
    artifacts: ['review-design.md', 'review-task.md'],
    fileRef: '',
  },
  'fix-applying': {
    command: 'fix-apply',
    description: 'Fix implementation — wave-based dispatch for review finding fixes',
    artifacts: ['code fixes', 'tests'],
    fileRef: '',
  },
};

/** Step name → WorkflowStep mapping for template lookup */
export const STEP_TO_WORKFLOW: Record<string, WorkflowStep> = {
  // Project-level steps
  grill: 'grill',
  researching: 'research',
  researched: 'roadmap',
  'roadmap-defined': 'discuss',
  // Phase-level steps (after strip prefix)
  research: 'research-phase',
  discuss: 'discuss',
  split: 'split',
  // Change-level steps (after strip prefix)
  planning: 'plan',
  proposal: 'adhoc',
  applying: 'apply',
  reviewing: 'review',
  archiving: 'archive',
  // Other
  'research-phase': 'research-phase',
  plan: 'plan',
  apply: 'apply',
  review: 'review',
  archive: 'archive',
  'ship-phase': 'ship',
  'ship-milestone': 'ship',
  'phase-ready': 'ship',
  'phase-start': 'discuss',
  'discuss-start': 'discuss',
  shipped: 'ship',
  init: 'init',
  adhoc: 'adhoc',
  continue: 'continue',
  milestone: 'milestone',
  'fix-planning': 'fix-plan',
  'fix-applying': 'fix-apply',
};

function getStepInfo(command: string): StepInfo | undefined {
  const info = STEP_INFO[command];
  if (!info) return undefined;

  // Populate instructions from the TypeScript template
  const wfStep = STEP_TO_WORKFLOW[command];
  if (wfStep && WORKFLOW_REGISTRY[wfStep]) {
    return {
      ...info,
      instructions: WORKFLOW_REGISTRY[wfStep].command().content,
    };
  }
  return info;
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
  const stepInfo = first ? getStepInfo(first.command) : undefined;

  return {
    currentStep: statusKey,
    context: `${type === 'adhoc' ? 'Adhoc Change' : 'Change'} (${name})`,
    type,
    status: statusKey,
    nextCommand: first?.command ?? null,
    slashCommand: first?.slashCommand || null,
    needsSubagent: first?.subagent ?? false,
    availableSteps,
    hint: available.length === 0
      ? 'This change has no available next steps. Create a new change to continue.'
      : null,
    nextStepInfo: stepInfo,
    instructions: stepInfo?.instructions,
  };
}

function listAvailableChanges(state: StateFile): string {
  const names = [
    ...state.changes.map((c) => c.name),
    ...state.adhoc.map((c) => c.name),
  ];
  return names.join(', ') || '(none)';
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
  const stepInfo = first ? getStepInfo(first.command) : undefined;

  return {
    currentStep: ctx.step,
    context: formatContext(state),
    type: ctx.type,
    status: state.project.status,
    nextCommand: first?.command ?? null,
    slashCommand: first?.slashCommand || null,
    needsSubagent: first?.subagent ?? false,
    availableSteps,
    hint,
    nextStepInfo: stepInfo,
    instructions: stepInfo?.instructions,
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
      return ctx.step === 'proposal' ? `adhoc-${ctx.step}` : `change-${ctx.step}`;
    default:
      return state.project.status;
  }
}

function formatContext(state: StateFile): string {
  const { type, ref, step } = state.active_context;
  switch (type) {
    case 'project': return `Project (${step})`;
    case 'milestone': return `Milestone ${state.project.current_milestone ?? '?'} — ${step}`;
    case 'phase': return `Phase ${state.project.current_phase ?? '?'} — ${step}`;
    case 'change': return `Change (${ref ?? '?'}) — ${step}`;
    case 'adhoc': return `Adhoc Change (${ref ?? '?'}) — ${step}`;
    default: return step;
  }
}

function generateHint(state: StateFile): string | null {
  const status = state.project.status;
  if (status === 'milestone-shipped') {
    return 'Milestone shipped. Run `bp state set-milestone <next-id>` to activate the next milestone.';
  }
  if (status === 'phase-shipped') {
    return 'Phase shipped. Run `bp state set-phase <next-phase-id>` to activate the next phase.';
  }
  return null;
}

/** 展开模板变量 → state 中的实际值。在 bp continue 输出前调用。
 *  \$1 根据 active_context.type 推断：change→changeName, phase→phaseId, milestone→milestoneId
 */
export function expandTemplateVars(
  instructions: string,
  state: StateFile,
  step: string,
  isAuto: boolean,
): string {
  const milestone = state.project.current_milestone ?? '';
  const phase = state.project.current_phase ?? '';
  const ctx = state.active_context;

  // \$1 推断——根据 context 类型取不同的标识符
  const isChange = ctx.type === 'change' || ctx.type === 'adhoc';
  const changeName = isChange ? (ctx.ref?.split('/').pop() ?? '') : '';
  const changeDir = isChange && milestone && phase
    ? `bp/milestones/${milestone}/phases/${phase}/changes/${changeName}/`
    : isChange ? `bp/changes/${changeName}/` : '';

  let primaryId = '';
  if (isChange) primaryId = changeName;
  else if (ctx.type === 'phase') primaryId = phase;
  else if (ctx.type === 'milestone') primaryId = milestone;

  const vars: Record<string, string> = {
    '[BP:MILESTONE_ID]': milestone,
    '[BP:PHASE_ID]': phase,
    '[BP:CHANGE_NAME]': changeName,
    '[BP:CHANGE_DIR]': changeDir,
    '[BP:CHANGE_TYPE]': ctx.type === 'adhoc' ? 'adhoc' : 'phase',
    '[BP:AUTO_FLAG]': isAuto ? '--auto' : '',
    '[BP:MILESTONE_DIR]': milestone ? `bp/milestones/${milestone}/` : '',
    '[BP:PHASE_DIR]': milestone && phase ? `bp/milestones/${milestone}/phases/${phase}/` : '',
    '$ARGUMENTS': primaryId,
    '$1': primaryId,
    '$2': '',
    '$3': '',
    '$4': '',
    '$5': '',
    '$6': '',
    '$7': '',
    '$8': '',
    '$9': '',
  };

  let result = instructions;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(key, value);
  }
  return result;
}
