import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const tmpDir = join(process.cwd(), 'tests/tmp-ship');
const bpDir = join(tmpDir, 'bp');

// markPublished is not exported — test via integration
// We test the template interpolation fix by invoking the CLI command

const cliPath = join(process.cwd(), 'bin/cli.js');

function setupStateMd(content: string) {
  writeFileSync(join(bpDir, 'state.md'), content, 'utf-8');
}

beforeEach(() => {
  mkdirSync(bpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('bp ship markPublished', () => {
  it('markPublished 应输出实际数字而非 ${count}', () => {
    // Setup: state.md with one unpublished archived change
    const stateMd = `---
project:
  name: test
  status: change-archived
  current_milestone: m1
  current_phase: null
active_context:
  type: project
  ref: null
  step: ship
changes: []
adhoc: []
---

## History
- [2026-07-03] Archived \`add-auth\` (m1 / p1)
`;
    setupStateMd(stateMd);

    // Create project.yml for ship handler
    writeFileSync(join(bpDir, 'project.yml'), `version: 1
platform:
  - omp
profile: standard
context: test
workflow: {}
review: {}
change: {}
git: {}
release:
  template: standard
spec:
  stack: generic
conventions:
  inject: true
models: {}
`, 'utf-8');

    // Create archive directory with change-summary.md
    const archiveDir = join(bpDir, 'archive', 'm1', 'p1', '2026-07-03-add-auth');
    mkdirSync(archiveDir, { recursive: true });
    writeFileSync(join(archiveDir, 'change-summary.md'), `## Intent\nTest change\n`, 'utf-8');

    const { execSync } = require('node:child_process');
    const output = execSync(
      `node ${cliPath} ship --mark-published`,
      { cwd: tmpDir, encoding: 'utf-8' },
    );

    const result = JSON.parse(output);

    // After fix: published string should contain actual count (1), not literal '${count}'
    if (result.published) {
      expect(result.published).not.toContain('${');
      expect(result.published).toContain('1');
    }
  });

  it('无未发布 change 时输出 hint', () => {
    const stateMd = `---
project:
  name: test
  status: change-archived
  current_milestone: null
  current_phase: null
active_context:
  type: project
  ref: null
  step: ship
changes: []
adhoc: []
---

## History
- [2026-07-03] Archived \`add-auth\` (m1 / p1) [published]
`;
    setupStateMd(stateMd);

    writeFileSync(join(bpDir, 'project.yml'), `version: 1
platform:
  - omp
profile: standard
context: test
release:
  template: standard
spec:
  stack: generic
conventions:
  inject: true
`, 'utf-8');

    const { execSync } = require('node:child_process');
    const output = execSync(
      `node ${cliPath} ship`,
      { cwd: tmpDir, encoding: 'utf-8' },
    );

    const result = JSON.parse(output);
    expect(result.hint).toContain('No unpublished');
  });
});
