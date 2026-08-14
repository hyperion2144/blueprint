/**
 * pi/skills.test.ts — Pi Coding Agent skills generator tests
 *
 * T-1 RED: GIVEN a valid ProjectConfig and the shared workflow registry
 *          WHEN generatePiSkills(config) runs
 *          THEN eleven deterministic skill descriptors are returned at
 *               .pi/skills/bp-<step>/SKILL.md with name: bp:<step>
 *               frontmatter (no argument-hint) and workflow bodies.
 */

import { describe, it, expect } from 'vitest';
import { generatePiSkills, PI_SKILL_DEFS } from './skills.js';
import type { ProjectConfig } from '../../types/index.js';

describe('generatePiSkills', () => {
  it('returns exactly eleven skill files at .pi/skills/bp-<step>/SKILL.md', () => {
    const config = {} as ProjectConfig;
    const files = generatePiSkills(config);
    expect(files).toHaveLength(11);
    for (const file of files) {
      expect(file.path).toMatch(/^\.pi\/skills\/bp-[a-z-]+\/SKILL\.md$/);
    }
  });

  it('produces Agent-Skills-style frontmatter with colon name and no argument-hint', () => {
    const config = {} as ProjectConfig;
    const files = generatePiSkills(config);
    for (const file of files) {
      expect(file.content).toMatch(/^---\nname: bp:[a-z-]+\n/);
      expect(file.content).toContain('description:');
      expect(file.content).not.toMatch(/argument-hint/);
    }
  });

  it('emits the canonical eleven workflow steps in immutable order', () => {
    expect(PI_SKILL_DEFS).toHaveLength(11);
    const steps = PI_SKILL_DEFS.map((d) => d.step);
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
    ]);
  });

  it('embeds the workflow body sourced from the shared registry', () => {
    const config = {} as ProjectConfig;
    const files = generatePiSkills(config);
    const planFile = files.find((f) => f.path === '.pi/skills/bp-plan/SKILL.md');
    expect(planFile).toBeDefined();
    expect(planFile!.content.length).toBeGreaterThan(200);
    expect(planFile!.content).toContain('name: bp:plan');
  });

  it('generates the bp-refactor skill with the refactor description', () => {
    const config = {} as ProjectConfig;
    const files = generatePiSkills(config);
    const refactorFile = files.find((f) => f.path === '.pi/skills/bp-refactor/SKILL.md');
    expect(refactorFile).toBeDefined();
    expect(refactorFile!.content).toMatch(/^---\nname: bp:refactor\n/);
    expect(refactorFile!.content).toContain('Run deterministic refactor analyzer and dispatch refactorer sub-agents per module');
  });

  it('generates a matching snapshot', () => {
    const config = {} as ProjectConfig;
    const files = generatePiSkills(config);
    const snapshot: Record<string, string> = {};
    for (const file of files) {
      const step = file.path.replace(/^\.pi\/skills\/bp-|\/SKILL\.md$/g, '');
      snapshot[step] = file.content;
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('is deterministic — two invocations produce byte-identical output', () => {
    const config = {} as ProjectConfig;
    const first = generatePiSkills(config);
    const second = generatePiSkills(config);
    expect(first).toEqual(second);
    expect(first.map((f) => f.path).sort()).toEqual(second.map((f) => f.path).sort());
    for (let i = 0; i < first.length; i++) {
      expect(first[i].content).toBe(second[i].content);
    }
  });
});
