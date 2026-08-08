/**
 * workflow-propose.test.ts — propose template grilling-first contract (T-17, corrected)
 *
 * Spec: specs/templates/spec.md#Propose-Grilling-First
 *
 * GIVEN the current propose template instructions
 * WHEN its Step 1 is inspected
 * THEN it follows the grilling skill (design tree + frontier + rounds, whole
 *      frontier asked per round with numbered questions and recommended answers)
 *      and appears before the proposal template fetch
 * AND the template notes grilling may be skipped for trivial/light changes
 */

import { describe, expect, it } from 'vitest';
import { getProposeCommandTemplate } from '../../src/templates/workflows/propose.js';

describe('propose workflow grilling-first contract (T-17, grilling-skill aligned)', () => {
  it('grilling step precedes the proposal template fetch', () => {
    const content = getProposeCommandTemplate().content;
    const grillIndex = content.indexOf('### Step 1:');
    const fetchIndex = content.indexOf('bp template proposal --stdout');
    expect(grillIndex).toBeGreaterThan(-1);
    expect(fetchIndex).toBeGreaterThan(-1);
    expect(grillIndex).toBeLessThan(fetchIndex);
  });

  it('grilling follows the grilling skill (design tree, frontier, rounds, recommended answers)', () => {
    const content = getProposeCommandTemplate().content;
    expect(content).toMatch(/grilling skill/i);
    expect(content).toMatch(/design tree/i);
    expect(content).toMatch(/frontier/i);
    expect(content).toMatch(/round/i);
    expect(content).toMatch(/recommended answer/i);
  });

  it('asks the whole frontier in one round with numbered questions and recommended answers, not one-at-a-time', () => {
    const content = getProposeCommandTemplate().content;
    expect(content).toContain('❓ **Q1**');
    expect(content).toContain('➡️');
    expect(content).toMatch(/whole frontier/i);
    expect(content).not.toMatch(/one question at a time/i);
  });

  it('proposal step writes the detailed proposal from the grilling output', () => {
    const content = getProposeCommandTemplate().content;
    expect(content).toMatch(/from the grilling output/i);
  });

  it('grilling may be skipped for trivial/light changes', () => {
    const content = getProposeCommandTemplate().content;
    expect(content).toMatch(/skip/i);
    expect(content).toMatch(/trivial/i);
    expect(content).toMatch(/light/i);
  });
});
