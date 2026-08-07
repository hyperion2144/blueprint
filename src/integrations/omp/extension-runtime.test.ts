/**
 * OMP Extension runtime — refactorer discrimination (T-9).
 *
 * Covers the AgentType widening, the detectAgentType branch, and the
 * `## Refactor Targets` augmentation rendered for refactorer sessions.
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

import {
  detectAgentType,
  handleSessionStart,
  type ExtensionAPI,
  type ExtensionContext,
} from './extension-runtime.js';

const testDir = join(tmpdir(), `bp-omp-refactorer-${Date.now()}`);

const REPORT = [
  '# Refactor Report',
  '',
  '**Target**: .',
  '',
  '## Summary',
  '',
  '- Fragmented modules: 1 (2 files)',
  '- Duplication pairs: 1',
  '- Flat modules: 1',
  '- Low-reuse modules: 1',
  '',
  '## Module: src/frag',
  '',
  '### Fragmentation',
  '',
  '- src/frag/a.ts — 1 exports, 5 non-blank lines',
  '',
].join('\n') + '\n';

function writeFile(relPath: string, content: string): void {
  const full = join(testDir, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

function makeApi() {
  const sent: Array<{ customType?: string; content?: Array<{ type: string; text: string }> }> = [];
  const api: ExtensionAPI = {
    on() {},
    sendMessage(msg) {
      sent.push(msg as { customType?: string; content?: Array<{ type: string; text: string }> });
    },
  };
  return { api, sent };
}

beforeAll(() => {
  mkdirSync(testDir, { recursive: true });
  writeFile('bp/config.yaml', 'profile: standard\nplatform: [omp]\n');
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('detectAgentType refactorer (T-9)', () => {
  it('returns refactorer for the bp-refactorer agent template', () => {
    expect(detectAgentType({ agentTemplate: 'bp-refactorer' })).toBe('refactorer');
  });

  it('returns refactorer for the bp:refactorer template name (substring match)', () => {
    expect(detectAgentType({ agentTemplate: 'bp:refactorer' })).toBe('refactorer');
  });

  it('still returns default for unrelated templates', () => {
    expect(detectAgentType({ agentTemplate: 'unrelated-agent' })).toBe('default');
    expect(detectAgentType({})).toBe('default');
  });
});

describe('handleSessionStart refactorer path (T-9)', () => {
  it('renders ## Refactor Targets followed by the report summary when bp/.refactor-report.md exists', async () => {
    writeFile('bp/.refactor-report.md', REPORT);
    const { api, sent } = makeApi();
    const ctx: ExtensionContext = { cwd: testDir, agentTemplate: 'bp-refactorer' };
    await handleSessionStart({}, ctx, api);
    expect(sent).toHaveLength(1);
    const text = (sent[0].content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('<bp-context>');
    expect(text).toContain('## Refactor Targets');
    const targetsIdx = text.indexOf('## Refactor Targets');
    const summaryIdx = text.indexOf('## Summary');
    expect(targetsIdx).toBeGreaterThan(-1);
    expect(summaryIdx).toBeGreaterThan(targetsIdx);
    expect(text).toContain('- Fragmented modules: 1 (2 files)');
    expect(text).toContain('- Duplication pairs: 1');
    // Module sections of the report are not inlined — only the summary block.
    expect(text).not.toContain('## Module:');
  });
});
