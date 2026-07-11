/**
 * bp continue — auto-advance to next step (compact JSON output + inline instructions)
 */

import { join, basename } from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { parseAndValidate, checkCoverage, parseRoadmapFile } from '../core/validate/index.js';
import { getTransition } from '../core/state-machine.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../templates/workflows/registry.js';
import type { ChangeStatus, StateFile } from '../types/index.js';
import type { ContinueResult } from '../core/continue.js';
import { loadState, updateState } from '../core/state-file.js';
import { determineNextStep, determineChangeNextStep, STEP_TO_WORKFLOW, expandTemplateVars } from '../core/continue.js';
import { validateStepAdvance } from '../core/state-validator.js';

export function register(program: any): void {
  const cmd = program
    .command('continue')
    .description('Auto-advance to next step')
    .option('--auto', 'Autonomous mode — agent fills decisions without asking user')
    .option('--command <cmd>', 'Specify command: design | research (override next step)');

  cmd
    .command('change <name>')
    .description('Advance a specific change')
    .option('--auto', 'Autonomous mode')
    .action(continueChangeHandler);

  cmd.action(continueHandler);
}


function formatContinueResult(result: ContinueResult, isAuto = false, state?: StateFile): void {
  const stepKey = result.currentStep.replace(/^(phase-|change-)/, '');
  let wfStep = (STEP_TO_WORKFLOW as Record<string, WorkflowStep>)[stepKey];
  // Phase-level research should use research-phase template
  if (result.type === 'phase' && stepKey === 'research') {
    wfStep = 'research-phase';
  }
  const rawInstructions = (wfStep && WORKFLOW_REGISTRY[wfStep]) ? WORKFLOW_REGISTRY[wfStep].command().content : undefined;

  const currentInstructions = rawInstructions && state
    ? expandTemplateVars(rawInstructions, state, stepKey, isAuto)
    : rawInstructions;

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
    case 'milestone': return step === 'active' ? 'milestone-active' : step;
    case 'phase': return `phase-${step}`;
    case 'change': return `change-${step}`;
    // Adhoc changes: 'proposal' uses adhoc- prefix, all others follow change- cycle
    case 'adhoc': return step === 'proposal' ? `adhoc-${step}` : `change-${step}`;
    default: return projectStatus;
  }
}
function continueHandler(options?: { auto?: boolean; command?: string }): void {
  const isAuto = options?.auto ?? false;
  const bpDir = join(process.cwd(), 'bp');
  const cwd = process.cwd();

  const state = loadState(bpDir);

  // --command: one explicit transition to target state, show its instructions, stop
  if (options?.command && state.active_context.type !== 'change' && state.active_context.type !== 'adhoc') {
    const currentStatus = resolveStatusKey(state.active_context.type, state.active_context.step, state.project.status);
    const transition = getTransition(currentStatus, options.command);
    if (!transition) {
      console.log(JSON.stringify({ error: `No transition "${options.command}" from current state "${currentStatus}"` }));
      return;
    }
    const to = transition.to;
    updateState(bpDir, (s) => {
      if (to.startsWith('phase-')) {
        s.active_context = { type: 'phase', ref: `milestones/${s.project.current_milestone}/phases/${s.project.current_phase}`, step: to.substring(6) };
      } else if (to.startsWith('change-')) {
        s.active_context = { type: 'change', ref: null, step: to.substring(7) };
      } else {
        s.active_context.step = to;
        if (s.active_context.type === 'project' || s.active_context.type === 'milestone') s.project.status = to;
      }
    });
    // Show target state's instructions
    const ns = loadState(bpDir);
    const stepKey = ns.active_context.step.replace(/^(phase-|change-)/, '');
    let wfStep = (STEP_TO_WORKFLOW as Record<string, WorkflowStep>)[stepKey];
    // Phase-level research should use research-phase template
    if (ns.active_context.type === 'phase' && stepKey === 'research') {
      wfStep = 'research-phase';
    }
    const raw = wfStep && WORKFLOW_REGISTRY[wfStep] ? WORKFLOW_REGISTRY[wfStep].command().content : undefined;
    const instr = raw && ns ? expandTemplateVars(raw, ns, stepKey, isAuto) : raw;
    const ctxStr = ns.active_context.type === 'milestone' ? `Milestone ${ns.project.current_milestone ?? '?'}` : ns.active_context.type === 'phase' ? `Phase ${ns.project.current_phase ?? '?'}` : `${ns.project.current_milestone ?? '?'} — ${ns.active_context.step}`;
    const lines = [`# bp continue → ${ns.active_context.step}`, `step: ${ns.active_context.step}`, `type: ${ns.active_context.type}`, `ref: ${ctxStr}`, `status: ${ns.project.status}`, `chars: ${instr ? instr.length : 0}`];
    if (instr) lines.push('', '---INSTRUCTIONS---', instr, '---END---');
    console.log(lines.join('\n'));
    return;
  }


  // Changes (parallel): output hint, do not auto-route
  if (state.active_context.type === 'changes') {
    const entries = state.active_context.contexts ?? {};
    const list = Object.entries(entries).map(([n, e]) => `${n}[${e.step}]`).join(', ');
    console.log([
      '# bp continue — multiple changes active',
      `active: ${list}`,
      'hint: Use \`bp continue change <name>\` to advance a specific change.',
    ].join('\n'));
    return;
  }
  // Change/adhoc context with active ref: auto-route to that change
  if ((state.active_context.type === 'change' || state.active_context.type === 'adhoc') && state.active_context.step !== 'archived') {
    const ref = state.active_context.ref;
    if (ref) {
      // Extract change name from ref path
      // Phase: milestones/<mid>/phases/<pid>/changes/<name> → <name>
      // Adhoc: changes/<name> → <name>
      const name = basename(ref);
      if (name) {
        continueChangeHandler(name, options);
        return;
      }
    }
    // Fallback: no ref — show hint
    const pending = state.changes.concat(state.adhoc).filter((c: any) => c.status !== 'archived');
    const list = pending.map((c: any) => `${c.name}[${c.status}]`).join(', ');
    if (pending.length === 1) {
      console.log([
        '# bp continue — hint',
        `hint: Change \`${pending[0].name}\` is at \`${pending[0].status}\`. Run: \`bp continue change ${pending[0].name}\``,
        `pending: ${pending[0].name}[${pending[0].status}]`,
      ].join('\n'));
    } else if (pending.length > 1) {
      console.log([
        '# bp continue — hint',
        'hint: Multiple changes pending. Pick one and run \`bp continue change <name>\`.',
        `pending: ${list}`,
      ].join('\n'));
    }
    return;
  }

  // Phase context with pending changes: auto-route to first pending change
  if ((state.active_context.type === 'phase' && (state.changes.some((c: any) => c.status !== 'archived') || state.adhoc.some((c: any) => c.status !== 'archived')))) {
    const phaseRef = state.active_context.ref;
    const ctxPath = phaseRef ? join(bpDir, phaseRef, 'context.md') : null;
    if (ctxPath && existsSync(ctxPath)) {
      // Phase has started — auto-route to first pending change
      const pending = state.changes.concat(state.adhoc).filter((c: any) => c.status !== 'archived');
      if (pending.length > 0) {
        continueChangeHandler(pending[0].name, options);
        return;
      }
    }
    // New phase without context.md — fall through to normal continue
  }

  const result = determineNextStep(bpDir);

  // Special: phase-ready → auto-advance to next phase (auto) or completion gate (non-auto)
  if (state.active_context.step === 'ready') {
    const nextPhase = findNextPhase(bpDir, state.project.current_milestone, state.project.current_phase ?? '');
    if (nextPhase) {
      if (!isAuto) {
        console.log([
          '# bp continue — phase complete',
          `phase: ${state.project.current_phase}`,
          `next: ${nextPhase}`,
          'hint: Current phase complete. Ask user whether to proceed to next phase.',
          'continue: bp continue --auto',
          `manual: bp state set-phase ${nextPhase}`,
        ].join('\n'));
        return;
      }
      // Auto: advance to next phase
      updateState(bpDir, (s) => {
        s.project.current_phase = nextPhase;
        s.active_context = { type: 'phase', ref: `milestones/${s.project.current_milestone}/phases/${nextPhase}`, step: 'start' };
      });
      // 2. Reload state and advance start → discuss
      const newState = loadState(bpDir);
      const advanceResult = determineNextStep(bpDir);
      if (advanceResult.nextCommand) {
        const currentKey = resolveStatusKey(newState.active_context.type, newState.active_context.step, newState.project.status);
        const transition = getTransition(currentKey, advanceResult.nextCommand);
        if (transition) {
          updateState(bpDir, (s) => {
            s.active_context.step = 'discuss';
          });
        }
      }
      // 3. Output discuss instructions
      const finalResult = determineNextStep(bpDir);
      formatContinueResult(finalResult, isAuto, state);
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
      const newState = loadState(bpDir);
      // Chain: if we just advanced to ready, immediately trigger phase-ready logic
      if (newState.active_context.step === 'ready') {
        continueHandler(options);
        return;
      }
      const newResult = determineNextStep(bpDir);
      formatContinueResult(newResult, isAuto, state);
      return;
    }
  }

  formatContinueResult(result, isAuto, state);
}

/** Parallel change file conflict detection */
const CONFLICT_STEPS = new Set(['applying', 'reviewing', 'verifying', 'archiving']);

interface FileConflict {
  conflictFiles: string[];
  blockingChange: string;
}

function checkFileConflicts(name: string, bpDir: string, state: StateFile): FileConflict[] | null {
  if (state.active_context.type !== 'changes' || !state.active_context.contexts) return null;

  // Find current change's directory
  const ctxEntry = state.active_context.contexts[name];
  if (!ctxEntry) return null;
  const myDir = join(bpDir, ctxEntry.ref);
  const myTasksPath = join(myDir, 'tasks.md');

  // Read current change's tasks.md → extract files
  const myFiles = extractFilesFromTasks(myTasksPath);
  if (!myFiles || myFiles.length === 0) return null;

  // Scan other parallel changes that are already at or past applying stage
  const conflicts: FileConflict[] = [];
  for (const [otherName, otherCtx] of Object.entries(state.active_context.contexts)) {
    if (otherName === name) continue;
    if (!CONFLICT_STEPS.has(otherCtx.step)) continue;

    const otherDir = join(bpDir, otherCtx.ref);
    const otherFiles = extractFilesFromTasks(join(otherDir, 'tasks.md'));
    // Also check review-task.md (files modified during fix mode)
    const reviewFiles = extractFilesFromTasks(join(otherDir, 'review-task.md'));

    const allOtherFiles = new Set([...(otherFiles ?? []), ...(reviewFiles ?? [])]);
    if (allOtherFiles.size === 0) continue;

    const overlap = [...myFiles].filter(f => allOtherFiles.has(f));
    if (overlap.length > 0) {
      conflicts.push({ conflictFiles: overlap, blockingChange: otherName });
    }
  }

  return conflicts.length > 0 ? conflicts : null;
}

/** Extract - **files**: <paths> entries from tasks.md/review-task.md */
function extractFilesFromTasks(tasksPath: string): string[] | null {
  if (!existsSync(tasksPath)) return null;
  const content = readFileSync(tasksPath, 'utf-8');
  const files: string[] = [];
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*-\s+\*\*files\*\*:\s*(.+)/i);
    if (m) {
      // Comma-separated, trim each path
      for (const f of m[1].split(',')) {
        const trimmed = f.trim();
        if (trimmed) files.push(trimmed);
      }
    }
  }
  return files.length > 0 ? files : null;
}

function continueChangeHandler(name: string, options?: { auto?: boolean; command?: string }, cmdObj?: any): void {
  const isAuto = options?.auto ?? process.argv.includes('--auto');
  // --command is defined on parent 'continue', pass through via cmdObj.parent
  const resolvedCommand = options?.command ?? cmdObj?.parent?.getOptionValue?.('command');
  const bpDir = join(process.cwd(), 'bp');
  const cwd = process.cwd();
  const state = loadState(bpDir);

  const changeEntry = state.changes.find((c: any) => c.name === name) || state.adhoc.find((c: any) => c.name === name);
  if (!changeEntry) {
    console.log(JSON.stringify({ error: `Change "${name}" not found in active changes` }));
    return;
  }

  const ctxType = state.changes.includes(changeEntry) ? 'change' : 'adhoc';
  const ref = ctxType === 'change' && state.project.current_milestone && state.project.current_phase
    ? 'milestones/' + state.project.current_milestone + '/phases/' + state.project.current_phase + '/changes/' + name
    : 'changes/' + name;

  // Dependency check: depends_on changes must not be in active changes list
  for (const depName of changeEntry.depends_on || []) {
    const dep = state.changes.find((c: any) => c.name === depName) || state.adhoc.find((c: any) => c.name === depName);
    if (dep) {
      console.log(`# bp continue — blocked\n${name} depends on "${depName}" which is still active [${dep.status}]. Archive or release it first.`);
      return;
    }
  }

  // Pending → proposal: first activation
  if (changeEntry.status === 'pending') {
    updateState(bpDir, (s) => {
      const ce = s.changes.find((c: any) => c.name === name) || s.adhoc.find((c: any) => c.name === name);
      if (ce) ce.status = 'proposal';
      const newEntry = { type: ctxType as 'change' | 'adhoc', ref, step: 'proposal' };
      if (s.active_context.type === 'change' || s.active_context.type === 'adhoc') {
        const oldName = basename(s.active_context.ref ?? '');
        s.active_context = {
          type: 'changes', ref: null, step: '',
          contexts: { [oldName]: { type: s.active_context.type === 'adhoc' ? 'adhoc' as const : 'change' as const, ref: s.active_context.ref ?? '', step: s.active_context.step }, [name]: newEntry },
        };
      } else if (s.active_context.type === 'changes') {
        if (!s.active_context.contexts) s.active_context.contexts = {};
        s.active_context.contexts[name] = newEntry;
      } else {
        s.active_context = { type: ctxType as 'change' | 'adhoc', ref, step: 'proposal' };
      }
    });
    const proposalWf = WORKFLOW_REGISTRY['proposal'];
    if (proposalWf) console.log('---INSTRUCTIONS---\n' + proposalWf.command().content + '\n---END---');
    return;
  }

  // Validate exit conditions before advancing
  if (!resolvedCommand) {
    const validation = validateStepAdvance(ctxType, changeEntry.status, ref, cwd);
    if (!validation.valid) {
      const note = isAuto ? 'AUTO mode' : 'MUST read instructions below, check ---END--- marker exists.';
      console.log(['# bp continue — blocked', 'error: exit conditions not met', 'note: ' + note, 'step: ' + changeEntry.status, 'type: ' + ctxType, 'reasons: ' + validation.errors.join('; '), 'hint: Complete the current step first. Run bp template ' + changeEntry.status + ' if you need the step instructions.'].join('\n'));
      return;
    }
  }

  // File conflict check: planning → applying, detect parallel change overlap
  if (changeEntry.status === 'planning') {
    const conflicts = checkFileConflicts(name, bpDir, state);
    if (conflicts) {
      const lines = ['# bp continue — blocked', 'error: file conflicts with parallel changes'];
      for (const c of conflicts) {
        lines.push(`  Change "${c.blockingChange}" (${state.active_context.contexts?.[c.blockingChange]?.step ?? 'unknown'}) modifies:`);
        for (const f of c.conflictFiles) lines.push(`    - ${f}`);
      }
      lines.push('hint: Wait for the above changes to complete and archive, then retry.');
      console.log(lines.join('\n'));
      return;
    }

    // Coverage check: PR→DS→T chain completeness
    const changeDir = join(bpDir, ref);
    const [propResult, desResult, taskResult] = ['proposal', 'design', 'tasks'].map(type => {
      const path = join(changeDir, `${type}.md`);
      if (!existsSync(path)) return null;
      const content = readFileSync(path, 'utf-8');
      return parseAndValidate(type, content);
    });
    if (propResult?.ast && desResult?.ast && taskResult?.ast) {
      const covErrors = checkCoverage(propResult.ast, desResult.ast, taskResult.ast);
      if (covErrors.length > 0) {
        console.log(['# bp continue — blocked', 'error: reference chain incomplete'].concat(
          covErrors.map(e => '  ' + e.message)
        ).concat(['hint: Ensure every PR is referenced by a DS, and every DS by a Task.']).join('\n'));
        return;
      }
    }
  }

  const result = determineChangeNextStep(bpDir, name);
  if ('error' in result) {
    console.log(JSON.stringify({ error: result.error }));
    return;
  }

  const command = resolvedCommand || result.nextCommand;
  if (command) {
    const state = loadState(bpDir);
    const transition = getTransition(result.currentStep, command);
    if (transition) {
      const shortStatus = transition.to.replace(/^(change|adhoc)-/, '') as ChangeStatus;
      updateState(bpDir, (s) => {
        const entry = s.adhoc.find((c) => c.name === name);
        const entryType = entry ? 'adhoc' : 'change';
        const target = entry ?? s.changes.find((c) => c.name === name);
        if (!target) return;
        target.status = shortStatus;

        // If already in parallel mode (type:changes), update entry in-place
        if (s.active_context.type === 'changes' && s.active_context.contexts) {
          s.active_context.contexts[name] = { type: entryType as 'change' | 'adhoc', ref: 'changes/' + name, step: shortStatus };
        } else {
          // Single change mode
          s.active_context = { type: entryType as 'change' | 'adhoc', ref: 'changes/' + name, step: shortStatus };
        }
      });
      const newResult = determineChangeNextStep(bpDir, name);
      if (!('error' in newResult)) { formatContinueResult(newResult, isAuto, state); return; }
    }
  }
}
function findNextPhase(bpDir: string, milestoneId: string | null, currentPhase: string): string | null {
  if (!milestoneId || !currentPhase) return null;

  const msNum = parseInt(milestoneId.match(/^M(\d+)/i)?.[1] ?? '');
  const phNum = parseInt(currentPhase.match(/^ph\.(\d+)/i)?.[1] ?? '');
  if (!msNum || !phNum) return null;

  const roadmapPath = join(bpDir, 'roadmap.md');
  if (!existsSync(roadmapPath)) return null;
  const ast = parseRoadmapFile(roadmapPath);
  if (!ast?.milestones) return null;

  const milestone = ast.milestones.find((m: any) => m.id === msNum);
  if (!milestone?.phases) return null;

  const phaseIdx = milestone.phases.findIndex((p: any) => {
    const pid = parseInt(p.id.split('.')[1] ?? '');
    return pid === phNum;
  });
  if (phaseIdx < 0 || phaseIdx >= milestone.phases.length - 1) return null;

  const nextPid = parseInt(milestone.phases[phaseIdx + 1].id.split('.')[1] ?? '');
  if (!nextPid) return null;

  const phasesDir = join(bpDir, 'milestones', milestoneId, 'phases');
  if (!existsSync(phasesDir)) return null;

  try {
    const dirs = readdirSync(phasesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    return dirs.find((d) => d.startsWith(`ph.${nextPid}-`)) || null;
  } catch {
    return null;
  }
}
