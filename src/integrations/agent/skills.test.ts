import { describe, it, expect } from 'vitest';
import { generateAgentSkills } from './skills.js';
import type { ProjectConfig } from '../../types/index.js';

describe('generateAgentSkills', () => {
  it('generates all skill files with correct paths', () => {
    const config = {} as ProjectConfig;
    const files = generateAgentSkills(config);
    expect(files.length).toBeGreaterThanOrEqual(20);
    for (const file of files) {
      expect(file.path).toMatch(/^\.agent\/skills\/bp-[a-z-]+\/SKILL\.md$/);
      expect(file.content).toContain('---');
      expect(file.content).toContain('name: bp-');
    }
  });

  it('replaces $1 with [BP:CHANGE_NAME] for change-scoped steps (e.g. plan)', () => {
    const config = {} as ProjectConfig;
    const files = generateAgentSkills(config);
    const planFile = files.find((f) => f.path.includes('bp-plan'));
    expect(planFile).toBeDefined();
    expect(planFile!.content).toContain('[BP:CHANGE_NAME]');
    expect(planFile!.content).not.toContain('$1');
    expect(planFile!.content).not.toContain('$ARGUMENTS');
  });

  it('replaces $1 with [BP:MILESTONE_ID] for milestone step', () => {
    const config = {} as ProjectConfig;
    const files = generateAgentSkills(config);
    const msFile = files.find((f) => f.path.includes('bp-milestone'));
    expect(msFile).toBeDefined();
    expect(msFile!.content).toContain('[BP:MILESTONE_ID]');
  });

  it('keeps $1 unchanged for context-free steps (grill)', () => {
    const config = {} as ProjectConfig;
    const files = generateAgentSkills(config);
    const grillFile = files.find((f) => f.path.includes('bp-grill'));
    expect(grillFile).toBeDefined();
    // grill has no context param mapping; $ARGUMENTS stays as-is
    expect(grillFile!.content).toContain('$ARGUMENTS');
  });

  it('generates matching snapshot', () => {
    const config = {} as ProjectConfig;
    const files = generateAgentSkills(config);
    const snapshot: Record<string, string> = {};
    for (const file of files) {
      const step = file.path.replace(/^\.agent\/skills\/bp-|\/SKILL\.md$/g, '');
      snapshot[step] = file.content;
    }
    expect(snapshot).toMatchSnapshot();
  });
});
