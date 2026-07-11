/**
 * claude-code/commands.test.ts — Golden-file snapshot tests
 */

import { describe, it, expect } from 'vitest';
import { generateClaudeCommands } from './commands.js';
import type { ProjectConfig } from '../../types/index.js';

describe('generateClaudeCommands', () => {
  it('generates all command files with correct frontmatter', () => {
    const config = { platform: ['claude-code'] } as unknown as ProjectConfig;
    const files = generateClaudeCommands(config);
    expect(files).toBeDefined();
    expect(files.length).toBe(25);

    for (const file of files) {
      expect(file.path).toMatch(/^\.claude\/commands\/bp-[a-z-]+\.md$/);
      expect(file.content).toContain('---');
      expect(file.content).toMatch(/^---\nname: bp:/);
    }
  });

  it('generates matching snapshot', () => {
    const config = { platform: ['claude-code'] } as unknown as ProjectConfig;
    const files = generateClaudeCommands(config);
    const snapshot: Record<string, string> = {};
    for (const file of files) {
      const step = file.path.replace(/^\.claude\/commands\/bp-|\.md$/g, '');
      snapshot[step] = file.content;
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('generates specific step with argument-hint', () => {
    const config = { platform: ['claude-code'] } as unknown as ProjectConfig;
    const files = generateClaudeCommands(config);
    const planFile = files.find((f) => f.path === '.claude/commands/bp-plan.md');
    expect(planFile).toBeDefined();
    expect(planFile!.content).toContain('name: bp:plan');
    expect(planFile!.content).toContain('argument-hint:');
  });
});
