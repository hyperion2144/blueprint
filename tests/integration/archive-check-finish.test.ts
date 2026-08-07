import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { getArchiveCommandTemplate } from '../../src/templates/workflows/archive.js';

const cliPath = join(process.cwd(), 'bin/cli.js');
let testDir: string;

function write(relPath: string, content: string): void {
  const full = join(testDir, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

describe('archive-check step + bp finish (T-15)', () => {
  beforeAll(() => {
    testDir = join(tmpdir(), `bp-archive-check-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    execSync('git init', { cwd: testDir });
    execSync('git config user.email test@test.com', { cwd: testDir });
    execSync('git config user.name test', { cwd: testDir });
    execSync(`node ${cliPath} init --dir ${testDir} --yes`, { encoding: 'utf-8', cwd: testDir });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('archive template has an archive-check step ordered before bp finish $1', () => {
    const content = getArchiveCommandTemplate().content;
    const archiveCheckMatch = content.match(/### Step \d+: Archive check[^\n]*/i);
    expect(archiveCheckMatch).not.toBeNull();
    const archiveCheckIdx = content.indexOf(archiveCheckMatch![0]);
    expect(archiveCheckIdx).toBeGreaterThan(-1);
    const finishRunIdx = content.indexOf('bp finish $1');
    expect(finishRunIdx).toBeGreaterThan(-1);
    expect(finishRunIdx).toBeGreaterThan(archiveCheckIdx);
  });

  it('archive-check step scans proposal/design/implementation and ADDs/MODIFies delta specs', () => {
    const content = getArchiveCommandTemplate().content;
    const archiveCheckMatch = content.match(/### Step \d+: Archive check[^\n]*/i);
    expect(archiveCheckMatch).not.toBeNull();
    const archiveCheckIdx = content.indexOf(archiveCheckMatch![0]);
    const finishRunIdx = content.indexOf('bp finish $1');
    const stepBody = content.slice(archiveCheckIdx, finishRunIdx);
    expect(stepBody).toMatch(/proposal\.md/);
    expect(stepBody).toMatch(/design\.md/);
    expect(stepBody).toMatch(/implementation/i);
    expect(stepBody).toMatch(/\bADD\b/);
    expect(stepBody).toMatch(/\bMODIFY\b/);
    expect(stepBody).toMatch(/specs\/<domain>\/spec\.md/);
  });

  it('archive template contains no bp finalize substring', () => {
    expect(getArchiveCommandTemplate().content).not.toContain('bp finalize');
  });

  it('archive-check ADD/MODIFY flow merges reconciled delta specs via bp finish', () => {
    // Global spec carrying a stale requirement.
    write('bp/specs/auth/spec.md', [
      '# auth',
      '',
      '## Requirements',
      '',
      '### Requirement: Legacy-Auth',
      '',
      'The system SHALL require only email login.',
      '',
    ].join('\n'));

    // A completed change whose implementation drifted from the delta spec.
    write('bp/changes/demo/proposal.md', '# Proposal: demo\n\n## Intent\nOAuth login flow.\n');
    write('bp/changes/demo/design.md', '# Design: demo\n\n## Design Items\n- DS-1: item\n');
    write('bp/changes/demo/tasks.md', '# Tasks\n- [x] T-1\n');
    write('bp/changes/demo/review.md', '## Overall Verdict: PASS\n');

    // Orchestrator archive-check: reconcile delta specs with reality —
    // MODIFY the drifted Legacy-Auth requirement and ADD New-Auth.
    write('bp/changes/demo/specs/auth/spec.md', [
      '# Delta spec: auth',
      '',
      '## MODIFIED Requirements',
      '',
      '### Requirement: Legacy-Auth',
      '',
      'The system SHALL require password reset.',
      '',
      '(was: required email-login only)',
      '',
      '#### Scenario: reset flow',
      '',
      '- **GIVEN** a user with a legacy account',
      '- **WHEN** the user resets their password',
      '- **THEN** the new password SHALL take effect',
      '',
      '## ADDED Requirements',
      '',
      '### Requirement: New-Auth',
      '',
      'The system SHALL support OAuth login.',
      '',
      '#### Scenario: oauth login',
      '',
      '- **GIVEN** a user with an OAuth provider',
      '- **WHEN** the user logs in via OAuth',
      '- **THEN** the session SHALL be created',
      '',
    ].join('\n'));

    execSync(`node ${cliPath} finish demo`, { encoding: 'utf-8', cwd: testDir });

    const merged = readFileSync(join(testDir, 'bp/specs/auth/spec.md'), 'utf-8');
    // ADDED requirement present in the merged global spec.
    expect(merged).toContain('### Requirement: New-Auth');
    expect(merged).toContain('The system SHALL support OAuth login.');
    // MODIFIED requirement replaced the stale text.
    expect(merged).toContain('### Requirement: Legacy-Auth');
    expect(merged).toContain('The system SHALL require password reset.');
    expect(merged).not.toContain('The system SHALL require only email login.');
    // Change moved to the archive directory.
    expect(existsSync(join(testDir, 'bp/changes/demo'))).toBe(false);
  });
});
