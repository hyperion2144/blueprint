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
  nextCommand: string | null;
  slashCommand: string | null;
  needsSubagent: boolean;
  availableSteps: { command: string; slashCommand: string; subagent: boolean }[];
  hint: string | null;
  /** Detailed info for the next step */
  nextStepInfo?: StepInfo;
  /** Full inline instructions for the next step (from TS template) */
  instructions?: string;
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
  verify: {
    command: 'verify',
    description: 'Test verification — dispatch verifier sub-agent',
    artifacts: ['verification.md'],
    fileRef: '',
  },
  archive: {
    command: 'archive',
    description: 'Archive — run bp archive CLI, merge specs + move to archive/',
    artifacts: ['archive/<change-id>/'],
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
};

/** Step name → WorkflowStep mapping for template lookup */
export const STEP_TO_WORKFLOW: Record<string, WorkflowStep> = {
  grill: 'grill',
  research: 'research',
  roadmap: 'roadmap',
  discuss: 'discuss',
  'research-phase': 'research-phase',
  split: 'split',
  plan: 'plan',
  apply: 'apply',
  review: 'review',
  verify: 'verify',
  archive: 'archive',
  'ship-phase': 'ship',
  'ship-milestone': 'ship',
  init: 'init',
  adhoc: 'adhoc',
  continue: 'continue',
  milestone: 'milestone',
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
    case 'adhoc': return `临时 Change (${ref ?? '?'}) — ${step}`;
    default: return step;
  }
}

function generateHint(state: StateFile): string | null {
  const status = state.project.status;
  if (status === 'milestone-shipped') {
    const pendingAdhoc = state.adhoc.filter((c) => c.status !== 'archived');
    const hints: string[] = ['Milestone shipped. Run `bp state set-milestone <next-id>` to activate the next milestone.'];
    if (pendingAdhoc.length > 0) {
      hints.push(
        `Pending adhoc changes: ${pendingAdhoc.map(c => c.name).join(', ')}. ` +
        `Use: bp continue change <name>`,
      );
    }
    return hints.join('\n  ');
  }
  if (status === 'phase-shipped') {
    return 'Phase shipped. Run `bp state set-phase <next-phase-id>` to activate the next phase, or `bp state set-milestone <next-id>` to ship the milestone.';
  }
  return null;
}
