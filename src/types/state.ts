/**
 * v2 state types
 * No state machine - change progress is derived from artifact existence.
 * This file provides types for artifact-based progress detection.
 */

/** Artifact check result for a change */
export interface ArtifactStatus {
  proposal: boolean;
  design: boolean;
  tasks: boolean;
  specs: boolean;
  review: boolean;
  /** Count of completed tasks (marked [x] in tasks.md) */
  tasksCompleted: number;
  /** Total tasks in tasks.md */
  tasksTotal: number;
  /** Whether all tasks are complete */
  allTasksDone: boolean;
}

/** Change progress info derived from artifacts */
export interface ChangeProgress {
  name: string;
  stage: import('./project.js').ChangeStage;
  artifacts: ArtifactStatus;
  /** Review verdict if review.md exists */
  reviewVerdict?: 'PASS' | 'FAIL' | 'NEEDS_REVISION';
  /** Unresolved issue count from review.md */
  unresolvedIssues: number;
  /** Whether review has D-prefixed issues (needs replan) */
  hasDesignIssues: boolean;
}

/** Next step recommendation */
export interface NextStep {
  stage: string;
  command: string;
  description: string;
  /** Full workflow instructions from template */
  instructions?: string;
}

/** Continue result - what the orchestrator should do next */
export interface ContinueResult {
  changeName: string | null;
  progress: ChangeProgress | null;
  nextStep: NextStep | null;
  /** Available active changes if no specific one given */
  activeChanges: string[];
}
