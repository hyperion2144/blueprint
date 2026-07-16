/**
 * v2 continue - schema-driven progress detection
 *
 * The workflow is defined by the schema (artifact dependency graph + step completion checks).
 * continue.ts reads the schema to determine the next step - no hardcoded if-else chains.
 *
 * Two-level detection:
 * 1. Project-level: no active changes -> check roadmap -> roadmap or propose instructions
 * 2. Change-level: check artifacts and steps against schema -> next step instructions
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listActiveChanges, changeDir } from './file-tree.js';
import { loadSchema } from './schema.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../templates/workflows/registry.js';
import type { ArtifactStatus, ChangeProgress, ChangeStage, ContinueResult, NextStep } from '../types/index.js';
import type { SchemaDef, SchemaArtifact, SchemaStep } from './schema.js';

/** Get workflow instructions from registry */
function getWorkflowInstructions(step: string): string | undefined {
  const registry = WORKFLOW_REGISTRY[step as WorkflowStep];
  return registry?.command?.()?.content;
}

/** Check if roadmap.md has real content (not just template placeholders) */
function isRoadmapEmpty(bpDir: string): boolean {
  const roadmapPath = join(bpDir, 'roadmap.md');
  if (!existsSync(roadmapPath)) return true;
  const content = readFileSync(roadmapPath, 'utf-8');
  return /\{\{.*\}\}/.test(content) || !/## Milestone:/.test(content);
}

/** Check if a file matching the artifact's generates pattern exists */
function artifactExists(dir: string, generates: string): boolean {
  if (generates.includes('*')) {
    // Glob pattern like specs/**/*.md - check if directory exists and has .md files
    const baseDir = generates.split('/')[0];
    return existsSync(join(dir, baseDir));
  }
  return existsSync(join(dir, generates));
}

/** Check which schema artifacts exist in a change directory */
export function checkArtifacts(bpDir: string, changeName: string, schema: SchemaDef): ArtifactStatus {
  const dir = changeDir(bpDir, changeName);

  // Check each artifact from schema
  const existing = new Set<string>();
  for (const artifact of schema.artifacts) {
    if (artifactExists(dir, artifact.generates)) {
      existing.add(artifact.id);
    }
  }

  // Count completed tasks from tasks.md (if tasks artifact exists)
  let tasksCompleted = 0;
  let tasksTotal = 0;
  let allTasksDone = false;

  if (existing.has('tasks')) {
    const content = readFileSync(join(dir, 'tasks.md'), 'utf-8');
    const checked = content.match(/^- \[x\]/gm);
    const unchecked = content.match(/^- \[ \]/gm);
    tasksCompleted = checked?.length ?? 0;
    tasksTotal = (checked?.length ?? 0) + (unchecked?.length ?? 0);
    allTasksDone = tasksTotal > 0 && tasksCompleted === tasksTotal;
  }

  return {
    proposal: existing.has('proposal'),
    design: existing.has('design'),
    tasks: existing.has('tasks'),
    specs: existing.has('specs'),
    review: existsSync(join(dir, 'review.md')),
    tasksCompleted,
    tasksTotal,
    allTasksDone,
  };
}

/** Check completion of a schema step */
function checkStepCompletion(
  dir: string,
  step: SchemaStep,
  artifacts: ArtifactStatus,
): boolean {
  switch (step.completion) {
    case 'tasks_all_checked':
      return artifacts.allTasksDone;
    case 'review_exists':
      return existsSync(join(dir, 'review.md'));
    case 'review_pass': {
      const reviewPath = join(dir, 'review.md');
      if (!existsSync(reviewPath)) return false;
      const content = readFileSync(reviewPath, 'utf-8');
      const verdictMatch = content.match(/## Overall Verdict:\s*(PASS|FAIL|NEEDS_REVISION)/i);
      return verdictMatch?.[1]?.toUpperCase() === 'PASS';
    }
    case 'file_exists':
      return step.tracks ? existsSync(join(dir, step.tracks)) : false;
    default:
      return false;
  }
}

/** Read review verdict and issue count from review.md */
function readReviewStatus(dir: string): { verdict?: 'PASS' | 'FAIL' | 'NEEDS_REVISION'; unresolved: number; hasDesignIssues: boolean } {
  const reviewPath = join(dir, 'review.md');
  if (!existsSync(reviewPath)) {
    return { unresolved: 0, hasDesignIssues: false };
  }

  const content = readFileSync(reviewPath, 'utf-8');
  let verdict: 'PASS' | 'FAIL' | 'NEEDS_REVISION' | undefined;
  const verdictMatch = content.match(/## Overall Verdict:\s*(PASS|FAIL|NEEDS_REVISION)/i);
  if (verdictMatch) {
    verdict = verdictMatch[1].toUpperCase() as 'PASS' | 'FAIL' | 'NEEDS_REVISION';
  }

  const unresolvedMatches = content.match(/^- \[ \] [RQGD]\d+/gm);
  const unresolved = unresolvedMatches?.length ?? 0;
  const dIssues = content.match(/^- \[ \] D\d+/gm);
  const hasDesignIssues = (dIssues?.length ?? 0) > 0;

  return { verdict, unresolved, hasDesignIssues };
}

/** Determine change stage from schema + artifacts */
function determineStage(artifacts: ArtifactStatus, reviewStatus: { verdict?: string; unresolved: number }): ChangeStage {
  if (!artifacts.proposal) return 'proposed';
  if (!artifacts.design || !artifacts.tasks) return 'proposed';
  if (!artifacts.allTasksDone) return 'in-progress';
  if (!artifacts.review) return 'implemented';
  if (reviewStatus.verdict === 'PASS' && reviewStatus.unresolved === 0) return 'reviewed';
  return 'implemented';
}

/**
 * Schema-driven: determine next step for a change.
 * Reads the schema to find the first incomplete step whose requirements are met.
 */
function determineChangeNextStep(
  bpDir: string,
  changeName: string,
  progress: ChangeProgress,
  schema: SchemaDef,
): NextStep | null {
  const dir = changeDir(bpDir, changeName);
  const { artifacts, reviewVerdict, unresolvedIssues, hasDesignIssues } = progress;

  // Phase 1: Check artifact-producing steps (proposal, design, specs, tasks)
  // Find the first artifact that doesn't exist but whose requirements are met
  const existingArtifacts = new Set<string>();
  for (const a of schema.artifacts) {
    if (artifactExists(dir, a.generates)) {
      existingArtifacts.add(a.id);
    }
  }

  for (const artifact of schema.artifacts) {
    if (existingArtifacts.has(artifact.id)) continue;
    // Check if all requirements are met
    const requirementsMet = artifact.requires.every((req) => existingArtifacts.has(req));
    if (requirementsMet && artifact.command) {
      return {
        stage: progress.stage,
        command: `${artifact.command} ${changeName}`,
        description: `Produce ${artifact.id} (${artifact.generates})`,
        instructions: getWorkflowInstructions(artifact.command),
      };
    }
  }

  // Phase 2: Check action steps (apply, review, archive)
  // Build a map of step completion
  const stepCompletion = new Map<string, boolean>();
  for (const step of schema.steps) {
    // Check if requirements are met
    const reqMet = step.requires.every((req) => {
      // 'apply' requires tasks -> check artifacts.allTasksDone or tasks exist
      if (req === 'tasks') return existingArtifacts.has('tasks');
      if (req === 'apply') return stepCompletion.get('apply') ?? false;
      if (req === 'review') return stepCompletion.get('review') ?? false;
      return existingArtifacts.has(req);
    });

    const isComplete = checkStepCompletion(dir, step, artifacts);
    stepCompletion.set(step.id, isComplete);

    if (reqMet && !isComplete) {
      // This is the next step
      let command = step.command;
      let description = '';

      if (step.id === 'apply') {
        description = `Dispatch executor sub-agents (${artifacts.tasksCompleted}/${artifacts.tasksTotal} tasks done)`;
      } else if (step.id === 'review') {
        description = 'Dispatch reviewer sub-agent for triple review';
      } else if (step.id === 'archive') {
        description = 'Merge delta specs, archive change, update roadmap';
      }

      return {
        stage: progress.stage,
        command: `${command} ${changeName}`,
        description,
        instructions: getWorkflowInstructions(command),
      };
    }
  }

  // Check for fix loop (review exists but not PASS)
  if (artifacts.review && reviewVerdict !== 'PASS') {
    if (hasDesignIssues) {
      return {
        stage: progress.stage,
        command: `plan --fix ${changeName}`,
        description: `Fix design issues (D-prefixed, ${unresolvedIssues} unresolved)`,
        instructions: getWorkflowInstructions('plan'),
      };
    }
    return {
      stage: progress.stage,
      command: `apply --fix ${changeName}`,
      description: `Fix code issues (${unresolvedIssues} unresolved)`,
      instructions: getWorkflowInstructions('apply'),
    };
  }

  return null;
}

/** Determine project-level next step (when no active changes) */
function determineProjectNextStep(bpDir: string): NextStep {
  if (isRoadmapEmpty(bpDir)) {
    return {
      stage: 'project-setup',
      command: 'bp roadmap',
      description: 'Roadmap is not yet defined. Define milestones and phases for your project.',
      instructions: getWorkflowInstructions('roadmap'),
    };
  }

  return {
    stage: 'project-ready',
    command: 'bp propose <name>',
    description: 'No active changes. Create a new change based on your roadmap.',
    instructions: getWorkflowInstructions('propose'),
  };
}

/** Get progress for a specific change */
export function getChangeProgress(bpDir: string, changeName: string): ChangeProgress | null {
  const dir = changeDir(bpDir, changeName);
  if (!existsSync(dir)) return null;

  const schema = loadSchema(bpDir);
  const artifacts = checkArtifacts(bpDir, changeName, schema);
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

/**
 * Main entry: schema-driven next step detection.
 * 1. If change name provided or active changes exist -> change-level (schema-driven)
 * 2. If no active changes -> project-level (roadmap vs propose)
 */
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
    const schema = loadSchema(bpDir);
    const nextStep = determineChangeNextStep(bpDir, changeName, progress, schema);
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
    const nextStep = determineProjectNextStep(bpDir);
    return {
      changeName: null,
      progress: null,
      nextStep,
      activeChanges: [],
    };
  }

  if (active.length === 1) {
    return determineNextStepForChange(bpDir, active[0]);
  }

  return {
    changeName: null,
    progress: null,
    nextStep: null,
    activeChanges: active,
  };
}
