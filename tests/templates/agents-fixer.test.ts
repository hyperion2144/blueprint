import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AGENT_PROMPTS, FIXER_PROMPT } from '../../src/templates/agents/index.js';

describe('FIXER_PROMPT (T-8)', () => {
  it('AGENT_PROMPTS["fixer"] is a non-empty string with the required sections', () => {
    const prompt = AGENT_PROMPTS['fixer'];
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(200);
    expect(prompt).toContain('## Role');
    expect(prompt).toContain('## Inputs');
    expect(prompt).toContain('## Behaviors');
    expect(prompt).toContain('## Guardrails');
  });

  it('references review.md, proposal.md, and design.md', () => {
    const prompt = AGENT_PROMPTS['fixer'];
    expect(prompt).toContain('review.md');
    expect(prompt).toContain('proposal.md');
    expect(prompt).toContain('design.md');
  });

  it('forbids the fixer from marking review issues resolved (reviewer verifies in full re-review)', () => {
    const prompt = AGENT_PROMPTS['fixer'];
    expect(prompt).toMatch(/Do NOT mark/i);
  });

  it('FIXER_PROMPT is reference-identical to AGENT_PROMPTS["fixer"]', () => {
    expect(FIXER_PROMPT).toBe(AGENT_PROMPTS['fixer']);
  });

  it('no bp fix CLI command is registered in src/cli.ts', () => {
    const cli = readFileSync(join(process.cwd(), 'src/cli.ts'), 'utf-8');
    expect(cli).not.toMatch(/\.command\(['"]fix\b/);
    expect(cli).not.toMatch(/registerFix\b/);
  });
});
