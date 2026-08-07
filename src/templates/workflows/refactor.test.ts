import { describe, it, expect } from 'vitest';
import { getRefactorSkillTemplate, getRefactorCommandTemplate } from './refactor.js';
import { WORKFLOW_REGISTRY } from './registry.js';
import { getWorkflowInstructions } from '../../core/continue.js';

describe('refactor workflow template (T-1)', () => {
  it('exports dual templates sharing one non-empty instructions body', () => {
    const skill = getRefactorSkillTemplate();
    const command = getRefactorCommandTemplate();
    expect(skill.instructions.length).toBeGreaterThan(0);
    expect(command.content).toBe(skill.instructions);
  });

  it('body contains the four section headers in order', () => {
    const { instructions } = getRefactorSkillTemplate();
    const idxInput = instructions.indexOf('## Input');
    const idxSteps = instructions.indexOf('## Steps');
    const idxOutput = instructions.indexOf('## Output');
    const idxGuardrails = instructions.indexOf('## Guardrails');
    expect(idxInput).toBeGreaterThanOrEqual(0);
    expect(idxSteps).toBeGreaterThan(idxInput);
    expect(idxOutput).toBeGreaterThan(idxSteps);
    expect(idxGuardrails).toBeGreaterThan(idxOutput);
  });

  it('embeds the CONTEXT_JSONL_REMINDER context-injection block before ## Input (Q1)', () => {
    const { instructions } = getRefactorSkillTemplate();
    expect(instructions).toContain('### Context injection (OMP Extension)');
    expect(instructions).toContain('bp/changes/<name>/context.jsonl');
    const idxReminder = instructions.indexOf('### Context injection (OMP Extension)');
    const idxInput = instructions.indexOf('## Input');
    expect(idxReminder).toBeGreaterThanOrEqual(0);
    expect(idxInput).toBeGreaterThan(idxReminder);
  });

  it('steps begin with the deterministic analyzer invocation', () => {
    const { instructions } = getRefactorSkillTemplate();
    expect(instructions).toContain('### Step 1:');
    expect(instructions).toContain('bp refactor analyze');
  });

  it('registry resolves refactor to the same bodies', () => {
    const entry = WORKFLOW_REGISTRY['refactor'];
    expect(entry.command().content).toBe(getRefactorCommandTemplate().content);
    expect(entry.skill().instructions).toBe(getRefactorSkillTemplate().instructions);
  });

  it('getWorkflowInstructions resolves the refactor body through continue.ts', () => {
    const instructions = getWorkflowInstructions('refactor');
    expect(instructions).toBe(getRefactorCommandTemplate().content);
  });

  it('stays standalone: no lifecycle commands, explicit confirmation required', () => {
    const { instructions } = getRefactorSkillTemplate();
    // The shared CONTEXT_JSONL_REMINDER references bp/changes/<name>/context.jsonl as the
    // OMP auto-injection schema pointer — that is not a lifecycle artifact. Forbid lifecycle
    // artifact creation paths and lifecycle commands instead.
    expect(instructions).not.toMatch(/bp\/changes\/<name>\/(proposal|design|tasks|review)\.md/);
    expect(instructions).not.toContain('bp plan');
    expect(instructions).not.toContain('bp apply');
    expect(instructions).not.toContain('bp review');
    expect(instructions).not.toContain('bp archive');
    expect(instructions.toLowerCase()).toContain('confirmation');
  });
});
