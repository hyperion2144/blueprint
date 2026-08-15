/**
 * dsh/skills.test.ts — DeepSeek Harness Skills generator tests
 *
 * DSH's skill provider (`@deepseek-ai/dsh-skill-filesystem`) validates the
 * frontmatter `name` against the strict kebab-case grammar
 * `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` — the Agent Skills colon convention
 * (`bp:plan`) is rejected. This suite pins the kebab-case rendering at
 * `.dsh/skills/bp-<step>/SKILL.md`.
 */

import { describe, it, expect } from 'vitest';
import { generateDshSkills, DSH_SKILL_DEFS } from './skills.js';
import type { ProjectConfig } from '../../types/index.js';

/** DSH's public skill-name grammar (mirrored from dsh-skill isSkillName). */
const DSH_SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe('generateDshSkills', () => {
  it('returns exactly sixteen skill files at .dsh/skills/bp-<step>/SKILL.md', () => {
    const config = {} as ProjectConfig;
    const files = generateDshSkills(config);
    expect(files).toHaveLength(16);
    for (const file of files) {
      expect(file.path).toMatch(/^\.dsh\/skills\/bp-[a-z-]+\/SKILL\.md$/);
    }
  });

  it('uses kebab-case frontmatter names that pass the DSH skill-name grammar', () => {
    const config = {} as ProjectConfig;
    const files = generateDshSkills(config);
    for (const file of files) {
      expect(file.content).toMatch(/^---\nname: bp-[a-z-]+\n/);
      const name = /^name: (.+)$/m.exec(file.content)![1];
      expect(DSH_SKILL_NAME_RE.test(name)).toBe(true);
      expect(name).not.toContain(':');
      // DSH requires a non-empty description; no Agent Skills extras.
      expect(file.content).toContain('description:');
      expect(file.content).not.toMatch(/argument-hint/);
      expect(file.content).not.toContain('hide:');
    }
  });

  it('emits the canonical sixteen workflow steps', () => {
    expect(DSH_SKILL_DEFS).toHaveLength(16);
    const steps = DSH_SKILL_DEFS.map((d) => d.step);
    expect(steps).toEqual([
      'init',
      'roadmap',
      'propose',
      'plan',
      'apply',
      'check',
      'archive',
      'continue',
      'ff',
      'loop',
      'refactor',
      'design',
      'design-html',
      'design-review',
      'design-shotgun',
      'plan-design-review',
    ]);
  });

  it('embeds the workflow body sourced from the shared registry', () => {
    const config = {} as ProjectConfig;
    const files = generateDshSkills(config);
    const planFile = files.find((f) => f.path === '.dsh/skills/bp-plan/SKILL.md');
    expect(planFile).toBeDefined();
    expect(planFile!.content.length).toBeGreaterThan(200);
    expect(planFile!.content).toContain('name: bp-plan');
  });

  it('generates a matching snapshot', () => {
    const config = {} as ProjectConfig;
    const files = generateDshSkills(config);
    const snapshot: Record<string, string> = {};
    for (const file of files) {
      const step = file.path.replace(/^\.dsh\/skills\/bp-|\/SKILL\.md$/g, '');
      snapshot[step] = file.content;
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('is deterministic — two invocations produce byte-identical output', () => {
    const config = {} as ProjectConfig;
    const first = generateDshSkills(config);
    const second = generateDshSkills(config);
    expect(first).toEqual(second);
    for (let i = 0; i < first.length; i++) {
      expect(first[i].content).toBe(second[i].content);
    }
  });
});