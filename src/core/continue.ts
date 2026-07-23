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

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { listActiveChanges, changeDir } from './file-tree.js';
import { loadSchema, resolveInstruction } from './schema.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../templates/workflows/registry.js';
import type { ArtifactStatus, ChangeProgress, ChangeStage, ContinueResult, NextStep } from '../types/index.js';
import type { SchemaDef, SchemaArtifact, SchemaStep } from './schema.js';
import { loadConfig } from './config.js';
import { hasPlaceholders } from './artifact-validator.js';

/** Get workflow instructions: custom schema file -> built-in TypeScript fallback */
export function getWorkflowInstructions(step: string, bpDir?: string): string | undefined {
  if (bpDir) {
    const custom = resolveInstruction(bpDir, step);
    if (custom) return custom;
  }
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
  let checklistCompleted = 0;
  let checklistTotal = 0;
  let allTasksDone = false;

  if (existing.has('tasks')) {
    const content = readFileSync(join(dir, 'tasks.md'), 'utf-8');

    // Split at Pre-Archive Checklist section — T-N tasks vs checklist are different concerns
    const splitIdx = content.indexOf('## Pre-Archive Checklist');
    const taskSection = splitIdx >= 0 ? content.slice(0, splitIdx) : content;
    const checklistSection = splitIdx >= 0 ? content.slice(splitIdx) : '';

    // T-N tasks (before checklist section)
    const checked = taskSection.match(/^- \[x\]/gm);
    const unchecked = taskSection.match(/^- \[ \]/gm);
    tasksCompleted = checked?.length ?? 0;
    tasksTotal = (checked?.length ?? 0) + (unchecked?.length ?? 0);

    // Pre-Archive Checklist (separate counting)
    const clChecked = checklistSection.match(/^- \[x\]/gm);
    const clUnchecked = checklistSection.match(/^- \[ \]/gm);
    checklistCompleted = clChecked?.length ?? 0;
    checklistTotal = (clChecked?.length ?? 0) + (clUnchecked?.length ?? 0);

    const tasksDone = tasksTotal > 0 && tasksCompleted === tasksTotal;
    const checklistDone = checklistTotal === 0 || checklistCompleted === checklistTotal;
    allTasksDone = tasksDone && checklistDone;
  }

  return {
    proposal: existing.has('proposal'),
    design: existing.has('design'),
    tasks: existing.has('tasks'),
    specs: existing.has('specs'),
    review: existsSync(join(dir, 'review.md')),
    tasksCompleted,
    tasksTotal,
    checklistCompleted,
    checklistTotal,
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

  // Build artifact existence set from schema
  const existingArtifacts = new Set<string>();
  for (const a of schema.artifacts) {
    if (artifactExists(dir, a.generates)) {
      existingArtifacts.add(a.id);
    }
  }

  // Phase 0: Check for partial step execution
  // Group artifacts by command, check if any command has partial completion
  const commandArtifactIds: Record<string, string[]> = {};
  for (const artifact of schema.artifacts) {
    if (!artifact.command) continue;
    if (!commandArtifactIds[artifact.command]) {
      commandArtifactIds[artifact.command] = [];
    }
    commandArtifactIds[artifact.command].push(artifact.id);
  }
  for (const [command, ids] of Object.entries(commandArtifactIds)) {
    if (ids.length <= 1) continue; // single-file commands can't be partial
    const existing = ids.filter((id) => existingArtifacts.has(id));
    const missingIds = ids.filter((id) => !existingArtifacts.has(id));
    if (existing.length > 0 && missingIds.length > 0) {
      return {
        stage: 'incomplete',
        command: `${command} ${changeName}`,
        description: `[INCOMPLETE] ${command} only produced: ${existing.join(', ')}. Missing: ${missingIds.join(', ')}. Follow the instructions below to complete this step.`,
        instructions: getWorkflowInstructions(command, bpDir),
      };
    }
  }

  // F7a: Check change dependencies
  const proposalPath = join(dir, 'proposal.md');
  if (existsSync(proposalPath)) {
    const proposalContent = readFileSync(proposalPath, 'utf-8');
    const depMatch = proposalContent.match(/## Dependencies[\s\S]*?(?=##|$)/);
    if (depMatch) {
      const deps = (depMatch[0].match(/^\s*-\s+(\S+)/gm) || []).map((l: string) => l.replace(/^\s*-\s+/, '')).filter((d: string) => !d.includes('{{') && !d.includes('}'));
      const archiveDir = join(bpDir, 'changes', 'archive');
      let unarchived: string[];
      if (existsSync(archiveDir) && readdirSync(archiveDir).length > 0) {
        const archivedNames = readdirSync(archiveDir);
        unarchived = deps.filter((d: string) => !archivedNames.some((a: string) => a.includes(d)));
      } else {
        unarchived = deps;
      }
      if (unarchived.length > 0) {
        return {
          stage: 'blocked',
          command: `bp continue ${unarchived[0]}`,
          description: `[BLOCKED] Change depends on ${unarchived.join(', ')} which is not yet archived. Archive the dependency first.`,
          instructions: undefined,
        };
      }
    }
  }
  // Phase 1: Check artifact-producing steps (proposal, design, specs, tasks)
  // Find the first artifact that doesn't exist but whose requirements are met
  for (const artifact of schema.artifacts) {
    if (existingArtifacts.has(artifact.id)) {
      // F6a: Check for unreplaced placeholders in concrete-file artifacts
      if (!artifact.generates.includes('*')) {
        const artifactPath = join(dir, artifact.generates);
        if (existsSync(artifactPath) && hasPlaceholders(readFileSync(artifactPath, 'utf-8'))) {
          return {
            stage: 'incomplete',
            command: `${artifact.command} ${changeName}`,
            description: `[PLACEHOLDER] ${artifact.id} has unreplaced {{placeholder}} variables. Fill them before proceeding.`,
            instructions: getWorkflowInstructions(artifact.command ?? '', bpDir),
          };
        }
      }
      continue;
    }
    const requirementsMet = artifact.requires.every((req) => existingArtifacts.has(req));
    if (requirementsMet && artifact.command) {
      return {
        stage: progress.stage,
        command: `${artifact.command} ${changeName}`,
        description: `Produce ${artifact.id} (${artifact.generates})`,
        instructions: getWorkflowInstructions(artifact.command, bpDir),
      };
    }
  }
  // Check for fix loop BEFORE Phase 2 (review exists but not PASS).
  // Must run before Phase 2 so that review != PASS routes to fix, not re-review.
  if (artifacts.review && reviewVerdict && reviewVerdict !== 'PASS') {
    //: Diminishing-returns fuse
    // Read Review History from review.md, check if last N rounds had low new-issue count
    try {
      const reviewContent = readFileSync(join(dir, 'review.md'), 'utf-8');
      // Parse Review History table rows
      const historyRows = reviewContent.match(/\|\s*\d+\s*\|[^\n]+\|/g) || [];
      if (historyRows.length > 0) {
        const config = loadConfig(bpDir);
        const fuseRounds = config.budget.no_progress_fuse_rounds;
        const recentRows = historyRows.slice(-fuseRounds);
        const recentNewIssues = recentRows.map((r) => {
          const cols = r.split('|').map((c) => c.trim());
          return parseInt(cols[3] || '0', 10) || 0;
        });
        const allLowProgress = recentNewIssues.every((n) => n <= 2);
        if (allLowProgress && recentNewIssues.length >= fuseRounds) {
          return {
            stage: progress.stage,
            command: `bp review ${changeName}`,
            description: `[FUSE] Diminishing returns detected: last ${fuseRounds} review rounds added <= 2 issues each. Recommend human verification before another fix cycle.`,
            instructions: getWorkflowInstructions('review', bpDir),
          };
        }
      }
    } catch { /* review.md unreadable — skip fuse */ }

    if (hasDesignIssues) {
      return {
        stage: progress.stage,
        command: `plan --fix ${changeName}`,
        description: `Fix design issues — ${reviewVerdict}, ${unresolvedIssues} unresolved (D-prefixed design issue detected, replan needed)`,
        instructions: getWorkflowInstructions('plan', bpDir),
      };
    }
    return {
      stage: progress.stage,
      command: `apply --fix ${changeName}`,
      description: `Fix code issues — ${reviewVerdict}, ${unresolvedIssues} unresolved`,
      instructions: getWorkflowInstructions('apply', bpDir),
    };
  }

  // Phase 2: Check action steps (apply, review, archive)
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
        if (artifacts.tasksCompleted === artifacts.tasksTotal && !artifacts.allTasksDone) {
          description = `[CHECKLIST INCOMPLETE] Pre-Archive Checklist: ${artifacts.checklistCompleted}/${artifacts.checklistTotal} checked. Run build/tests then mark items [x] in tasks.md. Do NOT re-dispatch executor.`;
        } else {
          description = `Dispatch executor sub-agents (${artifacts.tasksCompleted}/${artifacts.tasksTotal} tasks done)`;
        }
      } else if (step.id === 'review') {
        description = 'Verify build and tests pass (per project config), then dispatch reviewer for triple review';
      } else if (step.id === 'archive') {
        description = 'Merge delta specs, archive change, update roadmap';
      }

      return {
        stage: progress.stage,
        command: `${command} ${changeName}`,
        description,
        instructions: getWorkflowInstructions(command, bpDir),
      };
    }
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
      instructions: getWorkflowInstructions('roadmap', bpDir),
    };
  }

  return {
    stage: 'project-ready',
    command: 'bp propose <name>',
    description: 'No active changes. Create a new change based on your roadmap.',
    instructions: getWorkflowInstructions('propose', bpDir),
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
