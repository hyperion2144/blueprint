import { describe, it, expect } from 'vitest';
import { prunePrompt } from '../../src/core/prompt-pruner.js';

describe('prunePrompt', () => {
  const sample = `## Role
<!-- ENGINEERING-CONSTRAINT: role def -->
You are a planner.

### Step 1
<!-- CAPABILITY-COMPENSATION: quality gate methodology -->
Ask clarifying questions.
Check if ambiguous.

### Step 2
<!-- ENGINEERING-CONSTRAINT: output format -->
Produce design.md.
`;

  it('lite removes CAPABILITY-COMPENSATION sections', () => {
    const pruned = prunePrompt(sample, 'lite');
    expect(pruned).toContain('You are a planner.');
    expect(pruned).toContain('Produce design.md.');
    expect(pruned).not.toContain('Ask clarifying questions.');
    expect(pruned).not.toContain('Check if ambiguous.');
  });

  it('standard keeps everything', () => {
    const pruned = prunePrompt(sample, 'standard');
    expect(pruned).toBe(sample);
  });

  it('full keeps everything', () => {
    const pruned = prunePrompt(sample, 'full');
    expect(pruned).toBe(sample);
  });

  it('lite does not remove ENGINEERING-CONSTRAINT sections', () => {
    const pruned = prunePrompt(sample, 'lite');
    expect(pruned).toContain('<!-- ENGINEERING-CONSTRAINT: role def -->');
    expect(pruned).toContain('<!-- ENGINEERING-CONSTRAINT: output format -->');
  });

  it('lite handles consecutive CAPABILITY-COMPENSATION sections', () => {
    const multi = `## A
<!-- CAPABILITY-COMPENSATION: one -->
Content one.

### Intermediate
<!-- ENGINEERING-CONSTRAINT: keep -->
Keep this.

## B
<!-- CAPABILITY-COMPENSATION: two -->
Content two.
`;
    const pruned = prunePrompt(multi, 'lite');
    expect(pruned).toContain('Keep this.');
    expect(pruned).not.toContain('Content one.');
    expect(pruned).not.toContain('Content two.');
  });

  it('lite removes CAPABILITY-COMPENSATION section at end of file', () => {
    const endSection = `## Start
Keep this.

## End Section
<!-- CAPABILITY-COMPENSATION: trailing section -->
This should be removed.
`;
    const pruned = prunePrompt(endSection, 'lite');
    expect(pruned).toContain('Keep this.');
    expect(pruned).not.toContain('This should be removed.');
    expect(pruned).not.toContain('CAPABILITY-COMPENSATION: trailing section');
  });

  it('handles empty prompts', () => {
    expect(prunePrompt('', 'lite')).toBe('');
    expect(prunePrompt('', 'standard')).toBe('');
    expect(prunePrompt('', 'full')).toBe('');
  });

  it('handles prompt with no markers', () => {
    const plain = '## Role\nYou are an agent.\n';
    expect(prunePrompt(plain, 'lite')).toBe(plain);
    expect(prunePrompt(plain, 'standard')).toBe(plain);
  });
});
