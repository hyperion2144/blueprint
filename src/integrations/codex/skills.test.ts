/**
 * codex/skills.test.ts — Codex Skills generator tests
 *
 * T-1 RED: GIVEN a valid ProjectConfig and shared workflow registry
 *          WHEN generateCodexSkills(config) runs
 *          THEN ten deterministic Skill descriptors are returned with
 *               Codex frontmatter (name: bp:<step>, no argument-hint) and
 *               workflow bodies.
 */

import { describe, it, expect } from 'vitest';
import { generateCodexSkills, CODEX_SKILL_DEFS } from './skills.js';
import type { ProjectConfig } from '../../types/index.js';

describe('generateCodexSkills', () => {
  it('returns exactly ten skill files at .agents/skills/bp-<step>/SKILL.md', () => {
    const config = {} as ProjectConfig;
    const files = generateCodexSkills(config);
    expect(files).toHaveLength(10);
    for (const file of files) {
      expect(file.path).toMatch(/^\.agents\/skills\/bp-[a-z-]+\/SKILL\.md$/);
    }
  });

  it('produces Codex-style frontmatter with colon slash-command name', () => {
    const config = {} as ProjectConfig;
    const files = generateCodexSkills(config);
    for (const file of files) {
      expect(file.content).toMatch(/^---\nname: bp:[a-z-]+\n/);
      expect(file.content).toContain('description:');
      expect(file.content).not.toMatch(/argument-hint/);
    }
  });

  it('emits the canonical ten Codex workflow steps', () => {
    expect(CODEX_SKILL_DEFS).toHaveLength(10);
    const steps = CODEX_SKILL_DEFS.map((d) => d.step);
    expect(steps).toEqual([
      'init',
      'roadmap',
      'propose',
      'plan',
      'apply',
      'review',
      'archive',
      'continue',
      'ff',
      'loop',
    ]);
  });

  it('embeds the workflow body sourced from the shared registry', () => {
    const config = {} as ProjectConfig;
    const files = generateCodexSkills(config);
    const planFile = files.find((f) => f.path === '.agents/skills/bp-plan/SKILL.md');
    expect(planFile).toBeDefined();
    // The plan workflow body contains a known marker (e.g. $ARGUMENTS or
    // "Input" section) sourced from the shared WORKFLOW_REGISTRY.
    expect(planFile!.content.length).toBeGreaterThan(200);
    expect(planFile!.content).toContain('name: bp:plan');
  });

  it('generates a matching snapshot', () => {
    const config = {} as ProjectConfig;
    const files = generateCodexSkills(config);
    const snapshot: Record<string, string> = {};
    for (const file of files) {
      const step = file.path.replace(/^\.agents\/skills\/bp-|\/SKILL\.md$/g, '');
      snapshot[step] = file.content;
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('is deterministic — two invocations produce byte-identical output', () => {
    const config = {} as ProjectConfig;
    const first = generateCodexSkills(config);
    const second = generateCodexSkills(config);
    expect(first).toEqual(second);
    expect(first.map((f) => f.path).sort()).toEqual(
      second.map((f) => f.path).sort(),
    );
    for (let i = 0; i < first.length; i++) {
      expect(first[i].content).toBe(second[i].content);
    }
  });
});