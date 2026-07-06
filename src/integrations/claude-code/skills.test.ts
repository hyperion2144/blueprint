/**
 * claude-code/skills.test.ts — Golden-file snapshot tests
 */

import { describe, it, expect } from 'vitest';
import { generateClaudeSkills } from './skills.js';
import type { ProjectConfig } from '../types/index.js';

describe('generateClaudeSkills', () => {
  it('generates all skill files with correct frontmatter', () => {
    const config = { platform: ['claude-code'] } as unknown as ProjectConfig;
    const files = generateClaudeSkills(config);
    expect(files).toBeDefined();
    expect(files.length).toBeGreaterThan(0);
    expect(files.length).toBe(22); // 22 steps

    // Each file has correct path and frontmatter
    for (const file of files) {
      expect(file.path).toMatch(/^\.claude\/skills\/bp-[a-z-]+\.md$/);
      expect(file.content).toContain('---');
      expect(file.content).toMatch(/^---\nname: bp:/);
    }
  });

  it('generates matching snapshot', () => {
    const config = { platform: ['claude-code'] } as unknown as ProjectConfig;
    const files = generateClaudeSkills(config);
    // Snapshot keyed by step name, content only (path is deterministic)
    const snapshot: Record<string, string> = {};
    for (const file of files) {
      const step = file.path.replace(/^\.claude\/skills\/bp-|\.md$/g, '');
      snapshot[step] = file.content;
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('generates specific step correctly', () => {
    const config = { platform: ['claude-code'] } as unknown as ProjectConfig;
    const files = generateClaudeSkills(config);
    const initFile = files.find((f) => f.path === '.claude/skills/bp-init.md');
    expect(initFile).toBeDefined();
    expect(initFile!.content).toContain('name: bp:init');
    expect(initFile!.content).toContain('Initialize bp project structure');
  });
});
