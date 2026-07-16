/**
 * v2 continue - artifact-based progress detection
 * Replaces the v1 state machine with file-existence checks.
 * "State" is derived from which artifacts exist in the change directory.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listActiveChanges, changeDir } from './file-tree.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../templates/workflows/registry.js';
import type { ArtifactStatus, ChangeProgress, ChangeStage, ContinueResult, NextStep } from '../types/index.js';

/** Check which artifacts exist in a change directory */
export function checkArtifacts(bpDir: string, changeName: string): ArtifactStatus {
  const dir = changeDir(bpDir, changeName);

  const hasProposal = existsSync(join(dir, 'proposal.md'));
  const hasDesign = existsSync(join(dir, 'design.md'));
  const hasTasks = existsSync(join(dir, 'tasks.md'));
  const hasSpecs = existsSync(join(dir, 'specs'));
  const hasReview = existsSync(join(dir, 'review.md'));

  // Count completed tasks from tasks.md
  let tasksCompleted = 0;
  let tasksTotal = 0;
  let allTasksDone = false;

  if (hasTasks) {
    const content = readFileSync(join(dir, 'tasks.md'), 'utf-8');
    const checked = content.match(/^- \[x\]/gm);
    const unchecked = content.match(/^- \[ \]/gm);
    tasksCompleted = checked?.length ?? 0;
    tasksTotal = (checked?.length ?? 0) + (unchecked?.length ?? 0);
    allTasksDone = tasksTotal > 0 && tasksCompleted === tasksTotal;
  }

  return {
    proposal: hasProposal,
    design: hasDesign,
    tasks: hasTasks,
    specs: hasSpecs,
    review: hasReview,
    tasksCompleted,
    tasksTotal,
    allTasksDone,
  };
}

/** Read review verdict and issue count from review.md */
function readReviewStatus(dir: string): { verdict?: 'PASS' | 'FAIL' | 'NEEDS_REVISION'; unresolved: number; hasDesignIssues: boolean } {
  const reviewPath = join(dir, 'review.md');
  if (!existsSync(reviewPath)) {
    return { unresolved: 0, hasDesignIssues: false };
  }

  const content = readFileSync(reviewPath, 'utf-8');

  // Extract verdict
  let verdict: 'PASS' | 'FAIL' | 'NEEDS_REVISION' | undefined;
  const verdictMatch = content.match(/## Overall Verdict:\s*(PASS|FAIL|NEEDS_REVISION)/i);
  if (verdictMatch) {
    verdict = verdictMatch[1].toUpperCase() as 'PASS' | 'FAIL' | 'NEEDS_REVISION';
  }

  // Count unresolved issues (- [ ] but not - [x])
  const unresolvedMatches = content.match(/^- \[ \] [RQGD]\d+/gm);
  const unresolved = unresolvedMatches?.length ?? 0;

  // Check for D-prefixed issues (design issues)
  const dIssues = content.match(/^- \[ \] D\d+/gm);
  const hasDesignIssues = (dIssues?.length ?? 0) > 0;

  return { verdict, unresolved, hasDesignIssues };
}

/** Determine change stage from artifact status */
function determineStage(artifacts: ArtifactStatus, reviewStatus: { verdict?: string; unresolved: number; hasDesignIssues: boolean }): ChangeStage {
  if (!artifacts.proposal) return 'proposed';
  if (!artifacts.design || !artifacts.tasks) return 'proposed';
  if (!artifacts.allTasksDone) return 'in-progress';
  if (!artifacts.review) return 'implemented';
  if (reviewStatus.verdict === 'PASS' && reviewStatus.unresolved === 0) return 'reviewed';
  return 'implemented';
}

/** Determine next step based on progress */
function determineNextStep(
  changeName: string,
  progress: ChangeProgress,
): NextStep | null {
  const { stage, artifacts, reviewVerdict, unresolvedIssues, hasDesignIssues } = progress;

  let command: string;
  let description: string;

  if (!artifacts.proposal) {
    command = 'propose';
    description = 'Create change folder and proposal.md';
  } else if (!artifacts.design || !artifacts.tasks) {
    command = 'plan';
    description = 'Dispatch planner sub-agent for design + tasks + delta specs';
  } else if (!artifacts.allTasksDone) {
    command = 'apply';
    description = `Dispatch executor sub-agents (${artifacts.tasksCompleted}/${artifacts.tasksTotal} tasks done)`;
  } else if (!artifacts.review) {
    command = 'review';
    description = 'Dispatch reviewer sub-agent for triple review';
  } else if (reviewVerdict === 'PASS' && unresolvedIssues === 0) {
    command = 'archive';
    description = 'Merge delta specs, archive change, update roadmap';
  } else if (hasDesignIssues) {
    command = 'plan --fix';
    description = `Fix design issues (D-prefixed, ${unresolvedIssues} unresolved)`;
  } else {
    command = 'apply --fix';
    description = `Fix code issues (${unresolvedIssues} unresolved)`;
  }

  // Get workflow instructions from registry
  const stepKey = command.split(' ')[0] as WorkflowStep;
  const registry = WORKFLOW_REGISTRY[stepKey];
  const instructions = registry?.command?.()?.content;

  return {
    stage,
    command: `${command} ${changeName}`.trim(),
    description,
    instructions,
  };
}

/** Get progress for a specific change */
export function getChangeProgress(bpDir: string, changeName: string): ChangeProgress | null {
  const dir = changeDir(bpDir, changeName);
  if (!existsSync(dir)) return null;

  const artifacts = checkArtifacts(bpDir, changeName);
  const reviewStatus = readReviewStatus(dir);
  const stage = determineStage(artifacts, reviewStatus);

  return {
    name: changeName,
    stage,
    artifacts,
    reviewVerdict: reviewStatus.verdict,
    unresolvedIssues: reviewStatus.unresolved,
    hasDesignIssues: reviewStatus.hasDesignIssues,
  };
}

/** Main entry: determine next step for a change (or list active changes) */
export function determineNextStepForChange(bpDir: string, changeName?: string): ContinueResult {
  // If change name provided, get progress for that change
  if (changeName) {
    const progress = getChangeProgress(bpDir, changeName);
    if (!progress) {
      return {
        changeName: null,
        progress: null,
        nextStep: null,
        activeChanges: listActiveChanges(bpDir),
      };
    }
    const nextStep = determineNextStep(changeName, progress);
    return {
      changeName,
      progress,
      nextStep,
      activeChanges: [],
    };
  }

  // No change name: list active changes
  const active = listActiveChanges(bpDir);
  if (active.length === 0) {
    return {
      changeName: null,
      progress: null,
      nextStep: {
        stage: 'no-changes',
        command: 'bp roadmap',
        description: 'No active changes. View roadmap for next planned change.',
      },
      activeChanges: [],
    };
  }

  // If only one active change, use it
  if (active.length === 1) {
    return determineNextStepForChange(bpDir, active[0]);
  }

  // Multiple active changes: return list
  return {
    changeName: null,
    progress: null,
    nextStep: null,
    activeChanges: active,
  };
}
