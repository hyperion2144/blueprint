/**
 * workflow-design-steps.test.ts — design-track workflow step template tests
 *
 * T-1 RED: GIVEN the WORKFLOW_REGISTRY and the five new workflow template modules
 *          WHEN the registry is read and each new step's skill/command getters run
 *          THEN the registry contains 16 entries including the five design steps,
 *               skill instructions equal command content, each instructions string
 *               has the four section headers in order with no forbidden content,
 *               and every new description is free of ': ' (colon+space).
 *
 * Spec: specs/design/spec.md#Design-Step-Templates
 */

import { describe, expect, it } from 'vitest';
import { WORKFLOW_REGISTRY } from '../../src/templates/workflows/registry.js';
import { getDesignSkillTemplate, getDesignCommandTemplate } from '../../src/templates/workflows/design.js';
import { getDesignHtmlSkillTemplate, getDesignHtmlCommandTemplate } from '../../src/templates/workflows/design-html.js';
import { getDesignReviewSkillTemplate, getDesignReviewCommandTemplate } from '../../src/templates/workflows/design-review.js';
import { getDesignShotgunSkillTemplate, getDesignShotgunCommandTemplate } from '../../src/templates/workflows/design-shotgun.js';
import { getPlanDesignReviewSkillTemplate, getPlanDesignReviewCommandTemplate } from '../../src/templates/workflows/plan-design-review.js';

const DESIGN_STEPS = ['design', 'design-html', 'design-review', 'design-shotgun', 'plan-design-review'] as const;

const SECTION_ORDER = ['## Input', '## Steps', '## Output', '## Guardrails'];

const FORBIDDEN_TOKENS = ['~/.gstack', 'Pretext', 'gstack-config', '{{', '$B goto'];

function expectSectionsInOrder(instructions: string): void {
  let prev = -1;
  for (const header of SECTION_ORDER) {
    const idx = instructions.indexOf(header);
    expect(idx, `section ${header} present`).toBeGreaterThan(-1);
    expect(idx, `section ${header} after previous`).toBeGreaterThan(prev);
    prev = idx;
  }
}

describe('design-track workflow registry (T-1)', () => {
  it('registers 16 workflow steps including the five design steps', () => {
    const keys = Object.keys(WORKFLOW_REGISTRY);
    expect(keys).toHaveLength(16);
    for (const step of DESIGN_STEPS) {
      expect(WORKFLOW_REGISTRY[step]).toBeDefined();
    }
  });

  it('pairs each new step skill instructions byte-identical to its command content', () => {
    for (const step of DESIGN_STEPS) {
      const skill = WORKFLOW_REGISTRY[step].skill();
      const command = WORKFLOW_REGISTRY[step].command();
      expect(skill.instructions, step).toBe(command.content);
      expect(skill.instructions.length, step).toBeGreaterThan(120);
    }
  });

  it('orders the four section headers in every new instructions string', () => {
    for (const step of DESIGN_STEPS) {
      expectSectionsInOrder(WORKFLOW_REGISTRY[step].skill().instructions);
    }
  });

  it('keeps every new instructions string free of placeholders and gstack runtime tokens', () => {
    for (const step of DESIGN_STEPS) {
      const instructions = WORKFLOW_REGISTRY[step].skill().instructions;
      for (const token of FORBIDDEN_TOKENS) {
        expect(instructions, `${step} has no ${token}`).not.toContain(token);
      }
    }
  });

  it('uses the hyphen-style descriptions from DS-1 with zero colon+space sequences', () => {
    const expected: Record<string, string> = {
      design: 'Design system consultation - complete design proposal written to root DESIGN.md',
      'design-html': 'Design to production HTML/CSS - implement DESIGN.md against the detected project framework',
      'design-review': "Designer's-eye QA audit - full visual and UX audit against DESIGN.md",
      'design-shotgun': 'Multi-variant design exploration - generate, compare, and approve design variants',
      'plan-design-review': 'Plan-phase UI audit - UI scope detection and 0-10 rating before implementation',
    };
    for (const step of DESIGN_STEPS) {
      const skill = WORKFLOW_REGISTRY[step].skill();
      const command = WORKFLOW_REGISTRY[step].command();
      expect(skill.description, step).toBe(expected[step]);
      expect(command.description, step).toBe(expected[step]);
      expect(skill.description.match(/:\s/), `${step} skill description has no colon+space`).toBeNull();
      expect(command.description.match(/:\s/), `${step} command description has no colon+space`).toBeNull();
    }
  });

  it('exports the ten getter functions from the five new modules', () => {
    expect(getDesignSkillTemplate().name).toBe('bp-design');
    expect(getDesignCommandTemplate().category).toBe('Workflow');
    expect(getDesignHtmlSkillTemplate().name).toBe('bp-design-html');
    expect(getDesignHtmlCommandTemplate().category).toBe('Workflow');
    expect(getDesignReviewSkillTemplate().name).toBe('bp-design-review');
    expect(getDesignReviewCommandTemplate().category).toBe('Workflow');
    expect(getDesignShotgunSkillTemplate().name).toBe('bp-design-shotgun');
    expect(getDesignShotgunCommandTemplate().category).toBe('Workflow');
    expect(getPlanDesignReviewSkillTemplate().name).toBe('bp-plan-design-review');
    expect(getPlanDesignReviewCommandTemplate().category).toBe('Workflow');
  });

  it('describes plan-design-review as a UI-audit-only step without gate machinery', () => {
    const instructions = WORKFLOW_REGISTRY['plan-design-review'].skill().instructions;
    expect(instructions).toMatch(/UI scope/);
    expect(instructions).toMatch(/0-10/);
    expect(instructions).toMatch(/DESIGN\.md status/i);
    expect(instructions).toMatch(/conformance checklist/i);
    expect(instructions).not.toContain('codex');
    expect(instructions).not.toMatch(/\bEXIT\b/);
  });
});
