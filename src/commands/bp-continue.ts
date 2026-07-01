/**
 * bp continue — auto-advance to next step (compact JSON output + inline instructions)
 */

import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { determineNextStep, determineChangeNextStep, STEP_TO_WORKFLOW } from '../core/continue.js';
import { loadState, updateState } from '../core/state-file.js';
import { validateStepAdvance } from '../core/state-validator.js';
import { getTransition } from '../core/state-machine.js';
import type { ContinueResult } from '../core/continue.js';
import type { ChangeStatus } from '../types/index.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../templates/workflows/registry.js';

export function register(program: any): void {
  const cmd = program
    .command('continue')
    .description('Auto-advance to next step');

  cmd
    .command('change <name>')
    .description('Advance a specific change')
    .action(continueChangeHandler);

  cmd.action(continueHandler);
}

function formatContinueResult(result: ContinueResult): void {
  const output: any = {
    current: {
      context: result.context,
      step: result.currentStep,
    },
  };

  if (result.nextCommand) {
    output.next = {
      command: result.nextCommand,
      slash: result.slashCommand || null,
      subagent: result.needsSubagent,
      description: result.nextStepInfo?.description || null,
      outputs: result.nextStepInfo?.artifacts || [],
    };
    if (result.instructions) {
      output.next.instructions = result.instructions;
    }
  } else {
    output.next = null;
    if (result.hint) output.hint = result.hint;
  }

  console.log(JSON.stringify(output, null, 2));
}

function resolveStatusKey(type: string, step: string, projectStatus: string): string {
  switch (type) {
    case 'project': return projectStatus;
    case 'milestone': return projectStatus === 'milestone-shipped' ? 'milestone-shipped' : 'milestone-active';
    case 'phase': return `phase-${step}`;
    case 'change': return `change-${step}`;
    // Adhoc changes: 'proposal' uses adhoc- prefix, all others follow change- cycle
    case 'adhoc': return step === 'proposal' ? `adhoc-${step}` : `change-${step}`;
    default: return projectStatus;
  }
}

function continueHandler(): void {
  const bpDir = join(process.cwd(), 'bp');
  const cwd = process.cwd();

  const state = loadState(bpDir);

  // Change/adhoc context: bp continue (no args) does NOT advance — use bp continue change <name>
  if (state.active_context.type === 'change' || state.active_context.type === 'adhoc') {
    const pending = state.changes.concat(state.adhoc).filter((c: any) => c.status !== 'archived').map((c: any) => ({
      type: state.changes.includes(c) ? 'change' : 'adhoc',
      name: c.name,
      status: c.status,
    }));

    if (pending.length === 1) {
      console.log(JSON.stringify({
        hint: `Change \`${pending[0].name}\` is at \`${pending[0].status}\`. Run: \`bp continue change ${pending[0].name}\``,
        pending,
      }));
    } else if (pending.length > 1) {
      console.log(JSON.stringify({
        hint: `Multiple changes pending. Pick one and run \`bp continue change <name>\`.`,
        pending,
      }));
    } else {
      console.log(JSON.stringify({
        hint: 'No pending changes. Create one with `bp change new <name>`.',
        pending: [],
      }));
    }
    return;
  }

  // Phase context with pending changes: guide to change-level advancement
  if ((state.active_context.type === 'phase' && (state.changes.length > 0 || state.adhoc.length > 0))) {
    // Check if this phase still needs discuss — don't block on stale pending changes
    const phaseRef = state.active_context.ref;
    const ctxPath = phaseRef ? join(bpDir, phaseRef, 'context.md') : null;
    if (ctxPath && existsSync(ctxPath)) {
      // Phase has started — show pending changes hint
      const pending = state.changes.concat(state.adhoc).map((c: any) => ({
        type: state.changes.includes(c) ? 'change' : 'adhoc',
        name: c.name,
        status: c.status,
      }));
      if (pending.length === 1) {
        console.log(JSON.stringify({
          hint: `Phase has 1 pending change. Run: \`bp continue change ${pending[0].name}\``,
          current: { phase: state.project.current_phase, milestone: state.project.current_milestone, step: state.active_context.step },
          pending,
        }));
      } else {
        console.log(JSON.stringify({
          hint: `Phase has ${pending.length} pending changes. Pick one and run \`bp continue change <name>\`.`,
          current: { phase: state.project.current_phase, milestone: state.project.current_milestone, step: state.active_context.step },
          pending,
        }));
      }
      return;
    }
    // New phase without context.md — fall through to normal continue
  }

  const result = determineNextStep(bpDir);

  // Unknown state — no transitions available for this type/step combo
  if (!result.nextCommand && result.availableSteps.length === 0) {
    console.log(JSON.stringify({
      error: 'unknown_state',
      message: `State "${state.active_context.type}/${state.active_context.step}" has no defined transitions.`,
      hint: 'Run `bp state set-phase <id>` or `bp state set-milestone <id>` to reset to a valid state.',
      current: { type: state.active_context.type, step: state.active_context.step, milestone: state.project.current_milestone, phase: state.project.current_phase },
    }));
    return;
  }

  const validation = validateStepAdvance(state.active_context.type, state.active_context.step, state.active_context.ref, cwd);
  if (!validation.valid) {
    // Get current step instructions so the agent knows what to do
    const stepKey = state.active_context.step.replace(/^(phase-|change-)/, '');
    const wfStep = STEP_TO_WORKFLOW[stepKey] as WorkflowStep | undefined;
    const currentInstructions = (wfStep && WORKFLOW_REGISTRY[wfStep]) ? WORKFLOW_REGISTRY[wfStep].command().content : undefined;

    console.log(JSON.stringify({
      error: 'exit_conditions_not_met',
      current: { context: result.context, step: state.active_context.step, type: state.active_context.type },
      next: result.nextCommand ? {
        command: result.nextCommand,
        slash: result.slashCommand || null,
        description: result.nextStepInfo?.description || null,
      } : null,
      details: validation.errors,
      instructions: currentInstructions || null,
    }));
    return;
  }

  if (result.nextCommand) {
    const currentStatus = resolveStatusKey(state.active_context.type, state.active_context.step, state.project.status);
    const transition = getTransition(currentStatus, result.nextCommand);

    if (transition) {
      updateState(bpDir, (s) => {
        // transition.to is the full state key (e.g. phase-discuss, change-planning)
        const to = transition.to;

        // Update active_context type and ref based on target state
        if (to.startsWith('phase-')) {
          s.active_context.type = 'phase';
          s.active_context.ref = `milestones/${s.project.current_milestone}/phases/${s.project.current_phase}`;
          s.active_context.step = to.substring(6); // strip 'phase-'
        } else if (to.startsWith('change-')) {
          s.active_context.type = 'change';
          s.active_context.step = to.substring(7); // strip 'change-'
          // Keep existing ref from change creation
        } else {
          s.active_context.step = to;
          if (s.active_context.type === 'project' || s.active_context.type === 'milestone') {
            s.project.status = to;
          }
        }
      });
    }
  }

  formatContinueResult(result);
}

function continueChangeHandler(name: string): void {
  const bpDir = join(process.cwd(), 'bp');
  const result = determineChangeNextStep(bpDir, name);
  if ('error' in result) {
    console.log(JSON.stringify({ error: 'not_found', message: result.error }));
    return;
  }

  if (result.nextCommand) {
    const state = loadState(bpDir);
    const transition = getTransition(result.currentStep, result.nextCommand);

    if (transition) {
      const shortStatus = transition.to.replace(/^(change|adhoc)-/, '') as ChangeStatus;

      updateState(bpDir, (s) => {
        const adhoc = s.adhoc.find((c) => c.name === name);
        if (adhoc) {
          adhoc.status = shortStatus;
          s.active_context = { type: 'adhoc', ref: `changes/${name}`, step: shortStatus };
          return;
        }
        const change = s.changes.find((c) => c.name === name);
        if (change) {
          change.status = shortStatus;
          s.active_context = { type: 'change', ref: `changes/${name}`, step: shortStatus };
        }
      });
    }
  }

  formatContinueResult(result);
}
