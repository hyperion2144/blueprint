/**
 * workflow-roadmap.test.ts — roadmap scope grilling + user confirmation (correction to T-19)
 *
 * Spec: specs/templates/spec.md#Roadmap-Lightweight-Grilling (as corrected)
 *
 * GIVEN the current roadmap template instructions
 * WHEN its Step 1-3 are inspected
 * THEN Step 1 is a complete feature-scope grilling (capabilities, boundaries,
 *      priorities), Step 2 is an explicit user-confirmation gate that the scope
 *      discussion is complete, and Step 3 agrees the milestone/phase structure
 *      with the user — ordered only after confirmation
 * AND implementation detail (edge cases / failure modes) is deferred to
 *      per-change propose steps
 */

import { describe, expect, it } from 'vitest';
import { getRoadmapCommandTemplate } from '../../src/templates/workflows/roadmap.js';

describe('roadmap scope grilling + user confirmation (T-19 correction)', () => {
  it('Step 1 is a complete feature-scope grilling covering capabilities, boundaries, and priorities', () => {
    const content = getRoadmapCommandTemplate().content;
    const step1Start = content.indexOf('### Step 1:');
    const step2Start = content.indexOf('### Step 2:');
    expect(step1Start).toBeGreaterThan(-1);
    expect(step2Start).toBeGreaterThan(step1Start);
    const step1 = content.slice(step1Start, step2Start);
    expect(step1).toMatch(/feature scope/i);
    expect(step1).toMatch(/main capabilities/i);
    expect(step1).toMatch(/scope boundaries/i);
    expect(step1).toMatch(/priorities/i);
  });

  it('grilling follows the grilling skill (frontier + rounds, whole frontier per round)', () => {
    const content = getRoadmapCommandTemplate().content;
    expect(content).toMatch(/grilling skill/i);
    expect(content).toMatch(/design tree/i);
    expect(content).toMatch(/frontier/i);
    expect(content).toMatch(/whole frontier/i);
    expect(content).not.toMatch(/one question at a time/i);
  });

  it('Step 2 is an explicit user-confirmation gate that the scope discussion is complete', () => {
    const content = getRoadmapCommandTemplate().content;
    const step2Start = content.indexOf('### Step 2:');
    const step3Start = content.indexOf('### Step 3:');
    expect(step2Start).toBeGreaterThan(-1);
    expect(step3Start).toBeGreaterThan(step2Start);
    const step2 = content.slice(step2Start, step3Start);
    expect(step2).toMatch(/confirm/i);
    expect(step2).toMatch(/scope discussion complete/i);
    expect(step2).toMatch(/do NOT proceed/i);
  });

  it('Step 3 agrees the milestone/phase structure with the user, only after the confirmation gate', () => {
    const content = getRoadmapCommandTemplate().content;
    const step2Start = content.indexOf('### Step 2:');
    const step3Start = content.indexOf('### Step 3:');
    const step3 = content.slice(step3Start);
    expect(step3Start).toBeGreaterThan(step2Start);
    expect(step3).toMatch(/milestone\/phase/i);
    expect(step3).toMatch(/planning mode/i);
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
