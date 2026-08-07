/**
 * design-contract-fields.test.ts — DS-N contract fields (T-18)
 *
 * Spec: specs/plan-review/spec.md#DS-N-Contract-Fields
 *
 * GIVEN the design artifact template
 * WHEN `bp template design --stdout` is invoked
 * THEN the DS-N block contains `**Requirements**:`, `**Constraints**:`, and
 *      `**Acceptance Criteria**:` fields
 * AND the PLANNER_PROMPT instructs filling all three fields for every DS-N
 * AND the plan workflow Step-4 implementability dimension asks about their presence
 */

import { describe, expect, it } from 'vitest';
import { DESIGN_TEMPLATE } from '../../src/templates/artifacts/index.js';
import { PLANNER_PROMPT } from '../../src/templates/agents/index.js';
import { getPlanCommandTemplate } from '../../src/templates/workflows/plan.js';

describe('DS-N contract fields (T-18)', () => {
  it('design template DS-N block carries Requirements, Constraints, and Acceptance Criteria fields', () => {
    expect(DESIGN_TEMPLATE).toContain('**Requirements**:');
    expect(DESIGN_TEMPLATE).toContain('**Constraints**:');
    expect(DESIGN_TEMPLATE).toContain('**Acceptance Criteria**:');
  });

  it('planner prompt instructs filling all three fields for every DS-N with binary pass/fail', () => {
    expect(PLANNER_PROMPT).toMatch(/Requirements/i);
    expect(PLANNER_PROMPT).toMatch(/Constraints/i);
    expect(PLANNER_PROMPT).toMatch(/Acceptance Criteria/i);
    expect(PLANNER_PROMPT).toMatch(/binary pass\/fail/i);
  });

  it('plan Step-4 Dimension 1 asks whether every DS-N carries the three fields', () => {
    const content = getPlanCommandTemplate().content;
    const dim1Start = content.indexOf('#### Dimension 1:');
    const dim2Start = content.indexOf('#### Dimension 2:');
    expect(dim1Start).toBeGreaterThan(-1);
    expect(dim2Start).toBeGreaterThan(dim1Start);
    const dim1 = content.slice(dim1Start, dim2Start);
    expect(dim1).toMatch(/Requirements/i);
    expect(dim1).toMatch(/Constraints/i);
    expect(dim1).toMatch(/Acceptance Criteria/i);
  });
});
