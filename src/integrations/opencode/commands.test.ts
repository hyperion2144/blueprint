import { describe, it, expect } from 'vitest';
import { generateOpenCodeCommands } from './commands.js';
import type { ProjectConfig } from '../../types/index.js';

describe('generateOpenCodeCommands', () => {
  it('generates all 11 command files with correct paths', () => {
    const config = {} as ProjectConfig;
    const files = generateOpenCodeCommands(config);
    expect(files.length).toBe(11);
    for (const file of files) {
      expect(file.path).toMatch(/^\.opencode\/commands\/bp-[a-z-]+\.md$/);
      expect(file.content).toContain('---');
      expect(file.content).toContain('description:');
    }
  });

  it('preserves $ARGUMENTS for runtime replacement', () => {
    const config = {} as ProjectConfig;
    const files = generateOpenCodeCommands(config);
    const planFile = files.find((f) => f.path.includes('bp-plan'));
    expect(planFile).toBeDefined();
    expect(planFile!.content).toContain('$ARGUMENTS');
  });

  it('generates propose command with frontmatter', () => {
    const config = {} as ProjectConfig;
    const files = generateOpenCodeCommands(config);
    const proposeFile = files.find((f) => f.path.includes('bp-propose'));
    expect(proposeFile).toBeDefined();
    expect(proposeFile!.content).toContain('description:');
  });

  it('is deterministic - two invocations produce byte-identical output', () => {
    const config = {} as ProjectConfig;
    const first = generateOpenCodeCommands(config);
    const second = generateOpenCodeCommands(config);
    expect(first).toEqual(second);
    for (let i = 0; i < first.length; i++) {
      expect(first[i].content).toBe(second[i].content);
    }
  });

  it('generates matching snapshot', () => {
    const config = {} as ProjectConfig;
    const files = generateOpenCodeCommands(config);
    const snapshot: Record<string, string> = {};
    for (const file of files) {
      const step = file.path.replace(/^\.opencode\/commands\/bp-|\.md$/g, '');
      snapshot[step] = file.content;
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('generates bp-refactor command with description-only frontmatter', () => {
    const config = {} as ProjectConfig;
    const files = generateOpenCodeCommands(config);
    const refactorFile = files.find((f) => f.path === '.opencode/commands/bp-refactor.md');
    expect(refactorFile).toBeDefined();
    expect(refactorFile!.content).toMatch(/^---\ndescription: Run deterministic refactor analyzer/);
  });
});
