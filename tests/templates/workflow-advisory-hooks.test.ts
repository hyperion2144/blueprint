/**
 * workflow-advisory-hooks.test.ts — core-loop design-track advisory hooks (T-8)
 *
 * T-8 RED: GIVEN the plan and check workflow instruction strings
 *          WHEN scanned for design-track references
 *          THEN the plan content contains `bp plan-design-review`
 *          AND the check content contains `bp design-review`
 *          AND neither contains a MUST/SHALL sentence requiring the
 *              design command before proceeding (advisory-only).
 *
 * Spec: specs/design/spec.md#Core-Loop-Advisory-Hooks
 */

import { describe, expect, it } from 'vitest';
import { getPlanCommandTemplate } from '../../src/templates/workflows/plan.js';
import { getCheckCommandTemplate } from '../../src/templates/workflows/check.js';

/** Lines mentioning the given command must never carry a MUST/SHALL gate. */
function assertAdvisoryOnly(content: string, command: string): void {
  const advisoryLines = content.split('\n').filter((l) => l.includes(command));
  expect(advisoryLines.length).toBeGreaterThan(0);
  for (const line of advisoryLines) {
    expect(line).not.toMatch(/\b(MUST|SHALL)\b/);
  }
}

describe('core-loop advisory hooks (T-8)', () => {
  it('plan content suggests bp plan-design-review without gating', () => {
    const content = getPlanCommandTemplate().content;
    expect(content).toContain('bp plan-design-review');
    assertAdvisoryOnly(content, 'bp plan-design-review');
  });

  it('check content suggests bp design-review without gating', () => {
    const content = getCheckCommandTemplate().content;
    expect(content).toContain('bp design-review');
    assertAdvisoryOnly(content, 'bp design-review');
  });

  it('plan step structure remains intact (## Steps before ## Output before ## Guardrails)', () => {
    const content = getPlanCommandTemplate().content;
    expect(content.indexOf('## Steps')).toBeLessThan(content.indexOf('## Output'));
    expect(content.indexOf('## Output')).toBeLessThan(content.indexOf('## Guardrails'));
  });

  it('check step structure remains intact (## Steps before ## Output before ## Guardrails)', () => {
    const content = getCheckCommandTemplate().content;
    expect(content.indexOf('## Steps')).toBeLessThan(content.indexOf('## Output'));
    expect(content.indexOf('## Output')).toBeLessThan(content.indexOf('## Guardrails'));
  });
});
