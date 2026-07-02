/**
 * bp continue — auto-advance to next step (compact JSON output + inline instructions)
 */

import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
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
    .description('Auto-advance to next step')
    .option('--auto', 'Autonomous mode — agent fills decisions without asking user');

  cmd
    .command('change <name>')
    .description('Advance a specific change')
    .option('--auto', 'Autonomous mode')
    .action(continueChangeHandler);

  cmd.action(continueHandler);
}

function formatContinueResult(result: ContinueResult, isAuto = false): void {
  const stepKey = result.currentStep.replace(/^(phase-|change-)/, '');
  const wfStep = (STEP_TO_WORKFLOW as Record<string, WorkflowStep>)[stepKey];
  const currentInstructions = (wfStep && WORKFLOW_REGISTRY[wfStep]) ? WORKFLOW_REGISTRY[wfStep].command().content : undefined;

  const instrLength = currentInstructions ? currentInstructions.length : 0;
  const lines: string[] = [];

  // Header
  const stepLabel = result.type === 'change' || result.type === 'adhoc' ? `change → ${result.currentStep}` : `→ ${result.currentStep}`;
  const autoTag = isAuto ? ' (AUTO)' : '';
  lines.push(`# bp continue ${stepLabel}${autoTag}`);
  lines.push(`step: ${result.currentStep}`);
  lines.push(`type: ${result.type}`);
  if (result.context) lines.push(`ref: ${result.context}`);
  lines.push(`status: ${result.status}`);
  if (isAuto) lines.push('auto: true');
  lines.push(`chars: ${instrLength}`);

  // Pending changes if any
  if (result.pending && result.pending.length > 0) {
    lines.push('pending:');
    for (const p of result.pending) {
      const deps = p.depends_on && p.depends_on.length > 0 ? ` (needs: ${p.depends_on.join(', ')})` : '';
      lines.push(`  ${p.name} [${p.status}]${deps}`);
    }
  }

  // Hint
  if (result.hint) lines.push(`hint: ${result.hint}`);

  // Instructions body
  if (currentInstructions) {
    lines.push('');
    lines.push('---INSTRUCTIONS---');
    lines.push(currentInstructions);
    lines.push('---END---');
  }

  console.log(lines.join('\n'));
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

function continueHandler(options?: { auto?: boolean }): void {
  const isAuto = options?.auto ?? false;
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
      console.log([
        '# bp continue — hint',
        `hint: Change \`${pending[0].name}\` is at \`${pending[0].status}\`. Run: \`bp continue change ${pending[0].name}\``,
        `pending: ${pending[0].name}[${pending[0].status}]`,
      ].join('\n'));
    } else if (pending.length > 1) {
      const list = pending.map((p: any) => `${p.name}[${p.status}]`).join(', ');
      console.log([
        '# bp continue — hint',
        'hint: Multiple changes pending. Pick one and run \`bp continue change <name>\`.',
        `pending: ${list}`,
      ].join('\n'));
    } else {
      console.log([
        '# bp continue — hint',
        'hint: No pending changes. Create one with \`bp change new <name>\`.',
        'pending: none',
      ].join('\n'));
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
        console.log([
          '# bp continue — hint',
          `hint: Phase has 1 pending change. Run: \`bp continue change ${pending[0].name}\``,
          `phase: ${state.project.current_phase}`,
          `milestone: ${state.project.current_milestone}`,
          `step: ${state.active_context.step}`,
          `pending: ${pending[0].name}[${pending[0].status}]`,
        ].join('\n'));
      } else {
        const list = pending.map((p: any) => `${p.name}[${p.status}]`).join(', ');
        console.log([
          '# bp continue — hint',
          `hint: Phase has ${pending.length} pending changes. Pick one and run \`bp continue change <name>\`.`,
          `phase: ${state.project.current_phase}`,
          `milestone: ${state.project.current_milestone}`,
          `step: ${state.active_context.step}`,
          `pending: ${list}`,
        ].join('\n'));
      }
      return;
    }
    // New phase without context.md — fall through to normal continue
  }

  const result = determineNextStep(bpDir);

  // Special: phase-ready → auto-advance to next phase
  if (state.active_context.step === 'phase-ready') {
    const nextPhase = findNextPhase(bpDir, state.project.current_milestone, state.project.current_phase ?? '');
    if (nextPhase) {
      updateState(bpDir, (s) => {
        s.project.current_phase = nextPhase;
        s.active_context = { type: 'phase', ref: `milestones/${s.project.current_milestone}/phases/${nextPhase}`, step: 'start' };
      });
      const newResult = determineNextStep(bpDir);
      formatContinueResult(newResult, isAuto);
      return;
    }
    // No more phases → suggest ship milestone
    console.log([
      '# bp continue — hint',
      'hint: All phases in this milestone shipped. Run /bp:milestone <next-id> to start the next milestone, or /bp:ship to ship this one.',
    ].join('\n'));
    return;
  }

  // Unknown state — no transitions available for this type/step combo
  if (!result.nextCommand && result.availableSteps.length === 0) {
    console.log([
      '# bp continue — blocked',
      `error: State "${state.active_context.type}/${state.active_context.step}" has no defined transitions.`,
      'hint: Run \`bp state set-phase <id>\` or \`bp state set-milestone <id>\` to reset to a valid state.',
      `type: ${state.active_context.type}`,
      `step: ${state.active_context.step}`,
    ].join('\n'));
    return;
  }

  const validation = validateStepAdvance(state.active_context.type, state.active_context.step, state.active_context.ref, cwd);
  if (!validation.valid) {
    const note = isAuto ? 'AUTO mode' : 'MUST read instructions below, check ---END--- marker exists.';
    console.log([
      '# bp continue — blocked',
      'error: exit conditions not met',
      `note: ${note}`,
      `step: ${state.active_context.step}`,
      `type: ${state.active_context.type}`,
      `reasons: ${validation.errors.join('; ')}`,
      `hint: Complete the current step first. Run \`bp template ${state.active_context.step}\` if you need the step instructions.`,
    ].join('\n'));
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

      // Recompute result after state advance to show the NEW step's instructions
      const newResult = determineNextStep(bpDir);
      formatContinueResult(newResult, isAuto);
      return;
    }
  }

  formatContinueResult(result, isAuto);
}

function continueChangeHandler(name: string, options?: { auto?: boolean }): void {
  const isAuto = options?.auto ?? false;
  const bpDir = join(process.cwd(), 'bp');
  const cwd = process.cwd();
  const state = loadState(bpDir);

  // Validate exit conditions before advancing
  const change = state.changes.find((c: any) => c.name === name) || state.adhoc.find((c: any) => c.name === name);
  if (change) {
    const ctxType = state.changes.includes(change) ? 'change' : 'adhoc';
    // Phase change: ref = milestones/<mid>/phases/<pid>/changes/<name>
    // Adhoc change: ref = changes/<name>
    const ref = ctxType === 'change' && state.project.current_milestone && state.project.current_phase
      ? `milestones/${state.project.current_milestone}/phases/${state.project.current_phase}/changes/${name}`
      : `changes/${name}`;
    const validation = validateStepAdvance(ctxType, change.status, ref, cwd);
    if (!validation.valid) {
      const note = isAuto ? 'AUTO mode' : 'MUST read instructions below, check ---END--- marker exists.';
      console.log([
        '# bp continue — blocked',
        'error: exit conditions not met',
        `note: ${note}`,
        `step: ${change.status}`,
        `type: ${ctxType}`,
        `reasons: ${validation.errors.join('; ')}`,
        `hint: Complete the current step first. Run \`bp template ${change.status}\` if you need the step instructions.`,
      ].join('\n'));
      return;
    }
  }

  const result = determineChangeNextStep(bpDir, name);
  if ('error' in result) {
    console.log([
      '# bp continue — error',
      `error: ${result.error}`,
    ].join('\n'));
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

      // Recompute result after state advance
      const newResult = determineChangeNextStep(bpDir, name);
      if (!('error' in newResult)) {
        formatContinueResult(newResult, isAuto);
        return;
      }
    }
  }

  formatContinueResult(result, isAuto);
}

function findNextPhase(bpDir: string, milestoneId: string | null, currentPhase: string): string | null {
  if (!milestoneId) return null;
  const roadmapPath = join(bpDir, 'roadmap.md');
  if (!existsSync(roadmapPath)) return null;
  try {
    const content = readFileSync(roadmapPath, 'utf-8');
    // Find phases within the current milestone section
    const escaped = milestoneId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('##\\s+' + escaped + '[\\s\\S]*?(?=##\\s+M\\d|$)', 'i');
    const msMatch = content.match(re);
    if (!msMatch) return null;
    const phases = (msMatch[0].match(/ph\.\d+-\w+/g) ?? []) as string[];
    const idx = phases.indexOf(currentPhase);
    if (idx >= 0 && idx < phases.length - 1) {
      return phases[idx + 1];
    }
  } catch { /* roadmap not parseable */ }
  return null;
}
