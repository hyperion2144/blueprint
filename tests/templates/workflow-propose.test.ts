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
 * AND no level may bypass the grill — trivial/light changes are grilled too
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

  it('no level bypasses the grill — trivial/light changes are grilled too', () => {
    const content = getProposeCommandTemplate().content;
    // The old grill skip gate is gone: no level is told to go straight from
    // Step 0 to writing, and the grill section explicitly applies to every
    // change. (Step 1b technical-research cost gating for standard/critical
    // remains — that is not the grill.)
    expect(content).not.toMatch(/Skip for trivial\/light changes/i);
    expect(content).not.toMatch(/no interview/i);
    expect(content).toMatch(/No level bypasses the grill/i);
    expect(content).toMatch(/EVERY change is grilled/i);
  });
});
