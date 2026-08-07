import { describe, expect, it } from 'vitest';
import { AGENT_PROMPTS, REFACTORER_PROMPT } from '../../src/templates/agents/index.js';

describe('REFACTORER_PROMPT (T-8)', () => {
  it('AGENT_PROMPTS["refactorer"] is a non-trivial string with the required sections', () => {
    const prompt = AGENT_PROMPTS['refactorer'];
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(200);
    expect(prompt).toContain('## Role');
    expect(prompt).toContain('## Inputs');
    expect(prompt).toContain('## Behaviors');
    expect(prompt).toContain('## Guardrails');
  });

  it('references the report and spec files the refactorer must read', () => {
    const prompt = AGENT_PROMPTS['refactorer'];
    expect(prompt).toContain('bp/.refactor-report.md');
    expect(prompt).toContain('bp/specs/<domain>/spec.md');
    expect(prompt).toContain('bp/specs/');
  });

  it('enforces behavior preservation and the stop-after-one-module guardrail', () => {
    const prompt = AGENT_PROMPTS['refactorer'];
    expect(prompt).toMatch(/behavior preserv/);
    expect(prompt).toMatch(/revert/i);
    expect(prompt).toMatch(/STOP after ONE module/i);
    expect(prompt).toMatch(/spec edits are limited to/i);
  });

  it('REFACTORER_PROMPT is reference-identical to AGENT_PROMPTS["refactorer"]', () => {
    expect(REFACTORER_PROMPT).toBe(AGENT_PROMPTS['refactorer']);
  });
});
