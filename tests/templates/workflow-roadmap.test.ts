/**
 * workflow-roadmap.test.ts — roadmap lightweight grilling (T-19)
 *
 * Spec: specs/templates/spec.md#Roadmap-Lightweight-Grilling
 *
 * GIVEN the current roadmap template instructions
 * WHEN its Step 1 is inspected
 * THEN it instructs a lightweight grilling covering project direction
 *      and milestone/phase agreement
 * AND it explicitly defers detailed requirements (features/edge cases/
 *      failure modes) to per-change propose steps
 */

import { describe, expect, it } from 'vitest';
import { getRoadmapCommandTemplate } from '../../src/templates/workflows/roadmap.js';

describe('roadmap lightweight grilling (T-19)', () => {
  it('Step 1 is a lightweight grilling covering direction and milestone/phase agreement', () => {
    const content = getRoadmapCommandTemplate().content;
    const step1Start = content.indexOf('### Step 1:');
    const step2Start = content.indexOf('### Step 2:');
    expect(step1Start).toBeGreaterThan(-1);
    expect(step2Start).toBeGreaterThan(step1Start);
    const step1 = content.slice(step1Start, step2Start);
    expect(step1).toMatch(/lightweight grilling/i);
    expect(step1).toMatch(/direction/i);
    expect(step1).toMatch(/milestone/i);
  });

  it('explicitly defers detailed requirement capture to per-change propose steps', () => {
    const content = getRoadmapCommandTemplate().content;
    expect(content).toMatch(/bp propose/i);
    expect(content).toMatch(/defer/i);
  });

  it('does not contain the full edge-cases/failure-modes interview list', () => {
    const content = getRoadmapCommandTemplate().content;
    expect(content).not.toContain('**Edge cases**');
    expect(content).not.toContain('**Failure modes**');
  });
});
