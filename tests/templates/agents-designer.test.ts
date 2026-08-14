/**
 * agents-designer.test.ts — designer sub-agent prompt contract tests
 *
 * T-2 RED: GIVEN the AGENT_PROMPTS map exported from src/templates/agents/index.ts
 *          WHEN AGENT_PROMPTS['designer'] is read and scanned
 *          THEN it is a non-empty string containing `## Role`, `## Core Principles`,
 *               `## Inputs`, `## Behaviors`, `## Output`, `## Guardrails`,
 *               containing the marker `Design Consultant`, NOT containing
 *               `Change Design Specialist`, and embedding the shared constraints.
 *
 * Spec: specs/design/spec.md#Designer-Sub-Agent
 */

import { describe, expect, it } from 'vitest';
import { AGENT_PROMPTS, DESIGNER_PROMPT, PLANNER_PROMPT } from '../../src/templates/agents/index.js';

const SECTION_ORDER = ['## Role', '## Core Principles', '## Inputs', '## Behaviors', '## Output', '## Guardrails'];

describe('designer sub-agent prompt (T-2)', () => {
  it('registers AGENT_PROMPTS["designer"] identical to DESIGNER_PROMPT and non-empty', () => {
    expect(AGENT_PROMPTS['designer']).toBe(DESIGNER_PROMPT);
    expect(DESIGNER_PROMPT.length).toBeGreaterThan(500);
  });

  it('contains the six required sections in order', () => {
    let prev = -1;
    for (const header of SECTION_ORDER) {
      const idx = DESIGNER_PROMPT.indexOf(header);
      expect(idx, `section ${header} present`).toBeGreaterThan(-1);
      expect(idx, `section ${header} after previous`).toBeGreaterThan(prev);
      prev = idx;
    }
  });

  it('contains the marker Design Consultant and not the planner marker phrase', () => {
    expect(DESIGNER_PROMPT).toContain('Design Consultant');
    expect(DESIGNER_PROMPT).not.toContain('Change Design Specialist');
  });

  it('embeds the shared AGENT_CONSTRAINTS block (NEVER run bp continue)', () => {
    expect(DESIGNER_PROMPT).toContain('NEVER run bp continue');
  });

  it('marker disjointness: the designer marker does not leak into the planner prompt and vice versa', () => {
    expect(PLANNER_PROMPT).not.toContain('Design Consultant');
  });

  it('guardrails forbid source-code edits and direct output to design artifacts', () => {
    expect(DESIGNER_PROMPT).toMatch(/NEVER edit source code/i);
    expect(DESIGNER_PROMPT).toMatch(/DESIGN\.md/);
    expect(DESIGNER_PROMPT).toMatch(/design-review\.md/);
  });
});
