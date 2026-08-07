/**
 * workflow-propose.test.ts — propose template grilling-first contract (T-17)
 *
 * Spec: specs/templates/spec.md#Propose-Grilling-First
 *
 * GIVEN the current propose template instructions
 * WHEN parsed for step order
 * THEN a grilling Step (containing `one question at a time` and `recommended answer`)
 *      appears before the step running `bp template proposal --stdout`
 * AND the template notes grilling may be skipped for trivial/light changes
 */

import { describe, expect, it } from 'vitest';
import { getProposeCommandTemplate } from '../../src/templates/workflows/propose.js';

describe('propose workflow grilling-first contract (T-17)', () => {
  it('grilling step precedes the proposal template fetch', () => {
    const content = getProposeCommandTemplate().content;
    const grillIndex = content.indexOf('one question at a time');
    const fetchIndex = content.indexOf('bp template proposal --stdout');
    expect(grillIndex).toBeGreaterThan(-1);
    expect(fetchIndex).toBeGreaterThan(-1);
    expect(grillIndex).toBeLessThan(fetchIndex);
  });

  it('grilling step is aligned to the grilling method (one question, recommended answer, every branch)', () => {
    const content = getProposeCommandTemplate().content;
    expect(content).toMatch(/grilling method/i);
    expect(content).toMatch(/one question at a time/i);
    expect(content).toMatch(/recommended answer/i);
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
