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

  it('plan Step-4 reviews content quality with five effect-oriented dimensions (no format checklists)', () => {
    const content = getPlanCommandTemplate().content;
    const dim1Start = content.indexOf('#### Dimension 1:');
    const dim5Start = content.indexOf('#### Dimension 5:');
    expect(dim1Start).toBeGreaterThan(-1);
    expect(dim5Start).toBeGreaterThan(dim1Start);
    const dims = content.slice(dim1Start, dim5Start);
    // Effect-oriented substance checks — the executor must be able to
    // implement without guessing; acceptance must be verifiable.
    expect(dims).toMatch(/implement from the design alone/i);
    expect(dims).toMatch(/no guessing/i);
    expect(dims).toMatch(/acceptance criterion/i);
    expect(dims).toMatch(/can actually be checked/i);
    expect(dims).toMatch(/error paths, boundary conditions, and failure modes/i);
    // No structural/format checklists: the old dimensions demanded
    // specific fields, annotations, and exact wording — none of that
    // belongs in the content-quality review.
    expect(dims).not.toMatch(/\[NEW\]\/\[MODIFIED\]\/\[EXISTING\]/);
    expect(dims).not.toMatch(/File Manifest.*Action column/);
  });
});
