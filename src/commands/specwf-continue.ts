/**
 * specwf continue — auto-advance to next step (compact JSON output + inline instructions)
 */

import { join } from 'node:path';
import { determineNextStep, determineChangeNextStep } from '../core/continue.js';
import { loadState, updateState } from '../core/state-file.js';
import { validateStepAdvance } from '../core/state-validator.js';
import { getTransition } from '../core/state-machine.js';
import type { ContinueResult } from '../core/continue.js';
import type { ChangeStatus } from '../types/index.js';

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
    case 'adhoc': return `adhoc-${step}`;
    default: return projectStatus;
  }
}

function continueHandler(): void {
  const specwfDir = join(process.cwd(), 'specwf');
  const cwd = process.cwd();

  const state = loadState(specwfDir);
  const validation = validateStepAdvance(state.active_context.type, state.active_context.step, state.active_context.ref, cwd);
  if (!validation.valid) {
    console.log(JSON.stringify({ error: 'exit_conditions_not_met', details: validation.errors }));
    return;
  }

  const result = determineNextStep(specwfDir);

  if (result.nextCommand) {
    const currentStatus = resolveStatusKey(state.active_context.type, state.active_context.step, state.project.status);
    const transition = getTransition(currentStatus, result.nextCommand);

    if (transition) {
      updateState(specwfDir, (s) => {
        s.active_context.step = transition.to;
        if (s.active_context.type === 'project' || s.active_context.type === 'milestone') {
          s.project.status = transition.to;
        }
      });
    }
  }

  formatContinueResult(result);
}

function continueChangeHandler(name: string): void {
  const specwfDir = join(process.cwd(), 'specwf');
  const result = determineChangeNextStep(specwfDir, name);
  if ('error' in result) {
    console.log(JSON.stringify({ error: 'not_found', message: result.error }));
    return;
  }

  if (result.nextCommand) {
    const state = loadState(specwfDir);
    const transition = getTransition(result.currentStep, result.nextCommand);

    if (transition) {
      const shortStatus = transition.to.replace(/^(change|adhoc)-/, '') as ChangeStatus;

      updateState(specwfDir, (s) => {
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
