/**
 * platform-check-step.test.ts — platform step generators rename (review -> check)
 *
 * T-6 RED: GIVEN the platform step generators
 *          WHEN generateAll runs for every configured platform
 *          THEN every generated path is bp-check (no bp-review)
 *               AND each step array contains 'check' and not 'review'.
 *
 * Spec: specs/templates/spec.md#Check-Step-Rename
 */

import { describe, it, expect } from 'vitest';
import { generateAll } from '../../src/generators/index.js';
import { STEP_DEFS } from '../../src/integrations/omp/commands.js';
import { SKILL_DEFS } from '../../src/integrations/omp/skills.js';
import { CODEX_SKILL_DEFS } from '../../src/integrations/codex/skills.js';
import type { ProjectConfig } from '../../src/types/index.js';

function config(platforms: string[]): ProjectConfig {
  return { platform: platforms } as unknown as ProjectConfig;
}

const ALL_PLATFORMS = ['omp', 'claude-code', 'agent', 'codex', 'opencode'];

describe('platform step generators rename (review -> check)', () => {
  it('every configured platform emits a bp-check path and no bp-review path', () => {
    const files = generateAll(config(ALL_PLATFORMS));
    const paths = files.map((f) => f.path);
    // omp and claude-code emit command files; agent/codex emit skills
    expect(paths.some((p) => p.endsWith('.omp/commands/bp-check.md'))).toBe(true);
    expect(paths.some((p) => p.endsWith('.claude/commands/bp-check.md'))).toBe(true);
    expect(paths.some((p) => p.endsWith('.agent/skills/bp-check/SKILL.md'))).toBe(true);
    expect(paths.some((p) => p.endsWith('.agents/skills/bp-check/SKILL.md'))).toBe(true);
    expect(paths.some((p) => p.endsWith('.opencode/commands/bp-check.md'))).toBe(true);
    for (const p of paths) {
      expect(p).not.toContain('bp-review');
    }
  });

  it('step definition arrays contain check and not review', () => {
    const ompCommandSteps = STEP_DEFS.map((d) => d.step);
    expect(ompCommandSteps).toContain('check');
    expect(ompCommandSteps).not.toContain('review');

    const ompSkillSteps = SKILL_DEFS.map((d) => d.step);
    expect(ompSkillSteps).toContain('check');
    expect(ompSkillSteps).not.toContain('review');

    const codexSteps = CODEX_SKILL_DEFS.map((d) => d.step);
    expect(codexSteps).toContain('check');
    expect(codexSteps).not.toContain('review');
  });
});
