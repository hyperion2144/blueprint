import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

const cliPath = join(process.cwd(), 'bin/cli.js');
let testDir: string;

function cli(...args: string[]): string {
  return execSync(`node ${cliPath} ${args.join(' ')}`, {
    encoding: 'utf-8', cwd: testDir, timeout: 15000,
  });
}

function write(relPath: string, content: string): void {
  const full = join(testDir, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

function remove(relPath: string): void {
  const full = join(testDir, relPath);
  if (existsSync(full)) rmSync(full, { recursive: true, force: true });
}

function getState(): any {
  const matter = require('gray-matter');
  return matter(readFileSync(join(testDir, 'bp/state.md'), 'utf-8')).data;
}

function expectBlocked(output: string, ...substrings: string[]): void {
  expect(output).toContain('# bp continue — blocked');
  expect(output).toContain('error: exit conditions not met');
  for (const s of substrings) expect(output).toContain(s);
}

function expectAdvanced(output: string, step: string): void {
  expect(output).not.toContain('error: exit conditions not met');
  expect(output).toMatch(new RegExp(`step: ${step}|-> ${step}`));
}

function expectState(type: string, step: string, status?: string, changeStatus?: string, changeName?: string): void {
  const s = getState();
  expect(s.active_context.type).toBe(type);
  if (type === 'changes') {
    // In changes mode, step is '' and changes are tracked in contexts
    expect(s.active_context.step).toBe('');
    if (changeName && changeStatus) {
      expect(s.active_context.contexts?.[changeName]?.step).toBe(changeStatus);
    }
  } else {
    expect(s.active_context.step).toBe(step);
  }
  if (status) expect(s.project.status).toBe(status);
  if (changeStatus && type !== 'changes') {
    const entries = s.adhoc || s.changes || [];
    expect(entries.find((c: any) => c.name === (changeName || entries[0]?.name))?.status).toBe(changeStatus);
  }
}

const VALID_REQ = `# Requirements: test

## FR-1: user login
- Priority: high
- user can log in
- Acceptance: POST /login returns 200

## FR-2: user registration
- Priority: high
- user can register
- Acceptance: POST /register returns 201
`;

const VALID_SUMMARY = `# Summary: test

## Recommendation
Use TypeScript with Node.js.

## Rationale
Best developer experience and type safety.
`;

const VALID_ROADMAP = `# Roadmap: test

## Md-1: Core [ACTIVE]

### Ph-1.1: Auth [NOT_STARTED]
- **Goal**: auth module

### Ph-1.2: API [NOT_STARTED]
- **Goal**: api module

## Md-2: UI [NOT_STARTED]

### Ph-2.1: Dashboard [NOT_STARTED]
- **Goal**: dashboard
`;

const VALID_CONTEXT = `# Context: ph.1-auth

## D-1: use JWT
- Status: ACCEPTED
- Decision: use JWT tokens
- Reason: standard auth approach
- Alternatives: session cookies
- References: FR-3
`;

const VALID_PHASE_RESEARCH = `# Research: ph.1-auth

## Research Scope
Authentication implementation paths.

## Recommendation
Use JWT with bcrypt.
`;

const VALID_PROPOSAL = `# Proposal: change-a

## Intent
test

## Deliverables
- PR-1: login
  refs: FR-1
  Source: FR-1 (bp/requirements.md)
  System SHALL login.
  Verify: POST login.
- PR-2: register
  refs: FR-2
  Source: FR-2 (bp/requirements.md)
  System SHALL register.
  Verify: POST register.
`;

const VALID_DESIGN = `# Design: change-a

## Design Items
- DS-1: login
  refs: PR-1
  Source: PR-1 (proposal.md)
  login logic

- DS-2: register
  refs: PR-2
  Source: PR-2 (proposal.md)
  register logic

## Architecture
simple
## File Manifest
- src/login.ts
## Test Strategy
unit
## Alternatives
none
## Risk
low
`;

const VALID_TASKS = `# Tasks: change-a

## Wave 1: Core
- [ ] T-1: [type:behavior] implement login
  - **refs**: DS-1
  - **files**: src/login.ts
  - **spec_ref**: specs/auth/spec.md
  - **acceptance**: login works

- [ ] T-2: [type:behavior] implement register
  - **refs**: DS-2
  - **files**: src/register.ts
  - **spec_ref**: specs/auth/spec.md
  - **acceptance**: register works
`;

const VALID_SPEC_REVIEW = `# Spec Review: change-a

## Overall: PASS

## Constraint Checklist
| # | Constraint | Location | Status | Evidence |
|---|-----------|----------|--------|----------|
| R1 | login | src/login.ts | PASS | works |

## Issues
`;

const VALID_QUALITY_REVIEW = `# Quality Review: change-a

## Overall: PASS

## Issues
| # | Severity | Category | Location | Description |
|---|----------|----------|----------|-------------|
| Q1 | INFO | naming | src/login.ts | ok |

## Convention Compliance
| Rule | Status | Note |
|------|--------|------|
| naming | PASS | ok |

## Issues
`;

const VALID_GOAL_REVIEW = `# Goal Review: change-a

## Overall: PASS

## Goal Checklist
| # | Goal / Must-have | Status | Evidence |
|---|-----------------|--------|----------|
| G1 | login | ACHIEVED | works |

## Completeness Assessment
All goals met.

## Issues
`;

const VALID_CHANGE_SUMMARY = `# Change Summary: change-a

## Intent
test

## Commits
- abc123: feat: implement login

## Output Files
- src/login.ts: created
`;

const VALID_VERIFICATION = `# Verification: change-a

## Status: passed

- [x] tsc passes
- [x] tests pass
`;

describe('Full Lifecycle: init -> M1 -> M2', () => {
  beforeAll(() => {
    testDir = join(tmpdir(), `bp-life-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  // ─── INIT ───────────────────────────────────────────
  it('init: creates project, state=initialized', () => {
    cli('init', '--dir', testDir, '--yes');
    expectState('project', 'init', 'initialized');
  });

  it('initialized -> grill (no gate)', () => {
    const out = cli('continue');
    expectAdvanced(out, 'grill');
    expectState('project', 'grill', 'grill');
  });

  // ─── GRILL GATE: requirements.md ────────────────────
  it('grill gate: requirements.md format checks', () => {
    // no file -> blocked
    remove('bp/requirements.md');
    expectBlocked(cli('continue'), 'requirements.md');
    expectState('project', 'grill', 'grill');

    // empty -> PEG parse error
    write('bp/requirements.md', '');
    expectBlocked(cli('continue'), 'Parse error');
    expectState('project', 'grill', 'grill');

    // wrong title -> PEG parse error
    write('bp/requirements.md', '# Wrong\n');
    expectBlocked(cli('continue'), 'Parse error');
    expectState('project', 'grill', 'grill');

    // no FR sections -> semantic error (PEG passes with empty body)
    write('bp/requirements.md', '# Requirements: test\n\n');
    expectBlocked(cli('continue'), 'No requirements found');

    // FR with non-numeric ID -> PEG error
    write('bp/requirements.md', '# Requirements: test\n\n## FR-X: login\n- Priority: high\n');
    expectBlocked(cli('continue'), 'ID must be numeric');
    expectBlocked(cli('continue'), 'Parse error');
    expectState('project', 'grill', 'grill');

    // FR numbering skip (FR-1, FR-3) -> semantic error
    write('bp/requirements.md', '# Requirements: test\n\n## FR-1: login\n- Priority: high\n\n## FR-3: register\n- Priority: high\n');
    expectBlocked(cli('continue'), 'FR-3', 'expected FR-2');
    expectState('project', 'grill', 'grill');

    // valid -> advance to research
    write('bp/requirements.md', VALID_REQ);
    expectAdvanced(cli('continue'), 'research');
    expectState('project', 'research', 'research');
  });

  // ─── RESEARCH GATE: research/summary.md ─────────────
  it('research gate: summary.md format checks', () => {
    // no file
    expectBlocked(cli('continue'), 'summary.md');
    expectState('project', 'research', 'research');

    // empty
    write('bp/research/summary.md', '');
    expectBlocked(cli('continue'), 'Parse error');
    expectState('project', 'research', 'research');

    // wrong title
    write('bp/research/summary.md', '# Wrong\n');
    expectBlocked(cli('continue'), 'Parse error');
    expectState('project', 'research', 'research');

    // missing ## Recommendation (PEG error - section required by grammar)
    write('bp/research/summary.md', '# Summary: test\n\n## Rationale\nok\n');
    expectBlocked(cli('continue'), 'Parse error');
    expectState('project', 'research', 'research');

    // missing ## Rationale (PEG error - section required by grammar)
    write('bp/research/summary.md', '# Summary: test\n\n## Recommendation\nok\n');
    expectBlocked(cli('continue'), 'Parse error');
    expectState('project', 'research', 'research');

    // valid -> advance to roadmap
    write('bp/research/summary.md', VALID_SUMMARY);
    write('bp/research/stack.md', '# Stack\n');
    write('bp/research/architecture.md', '# Arch\n');
    write('bp/research/pitfalls.md', '# Pitfalls\n');
    expectAdvanced(cli('continue'), 'roadmap');
    expectState('project', 'roadmap', 'roadmap');
  });

  // ─── ROADMAP GATE: roadmap.md ───────────────────────
  it('roadmap gate: roadmap.md format checks', () => {
    // no file
    expectBlocked(cli('continue'), 'roadmap.md');
    expectState('project', 'roadmap', 'roadmap');

    // empty
    write('bp/roadmap.md', '');
    expectBlocked(cli('continue'), 'Parse error');
    expectState('project', 'roadmap', 'roadmap');

    // wrong title
    write('bp/roadmap.md', '# Wrong\n');
    expectBlocked(cli('continue'), 'Parse error');
    expectState('project', 'roadmap', 'roadmap');

    // no milestones (PEG error - grammar requires MilestoneSection+)
    write('bp/roadmap.md', '# Roadmap: test\n\ntext\n');
    expectBlocked(cli('continue'), 'Parse error');
    expectState('project', 'roadmap', 'roadmap');

    // Md-X (non-numeric) -> PEG error
    write('bp/roadmap.md', '# Roadmap: test\n\n## Md-X: A [ACTIVE]\n\n### Ph-1.1: X [NOT_STARTED]\n');
    expectBlocked(cli('continue'), 'ID must be numeric');
    expectBlocked(cli('continue'), 'Parse error');
    expectState('project', 'roadmap', 'roadmap');

    // Md numbering skip (Md-1, Md-3)
    write('bp/roadmap.md', '# Roadmap: test\n\n## Md-1: A [ACTIVE]\n\n### Ph-1.1: X [NOT_STARTED]\n\n## Md-3: B [NOT_STARTED]\n\n### Ph-3.1: Y [NOT_STARTED]\n');
    expectBlocked(cli('continue'), 'Md-3', 'expected Md-2');
    expectState('project', 'roadmap', 'roadmap');

    // Ph numbering skip (Ph-1.1, Ph-1.3)
    write('bp/roadmap.md', '# Roadmap: test\n\n## Md-1: A [ACTIVE]\n\n### Ph-1.1: X [NOT_STARTED]\n\n### Ph-1.3: Y [NOT_STARTED]\n');
    expectBlocked(cli('continue'), 'Ph-1.3', 'expected Ph-1.2');
    expectState('project', 'roadmap', 'roadmap');

    // invalid status (PEG error - grammar validates enum before semantic check)
    write('bp/roadmap.md', '# Roadmap: test\n\n## Md-1: A [WRONG]\n\n### Ph-1.1: X [NOT_STARTED]\n');
    expectBlocked(cli('continue'), 'Parse error');
    expectState('project', 'roadmap', 'roadmap');

    // valid + mkdir + set milestone + set phase
    write('bp/roadmap.md', VALID_ROADMAP);
    mkdirSync(join(testDir, 'bp/milestones/M1-core/phases/ph.1-auth/changes'), { recursive: true });
    cli('state', 'set-milestone', 'M1-core');
    cli('state', 'set-phase', 'ph.1-auth');
    expectState('phase', 'start', 'milestone-active');

    // phase-start -> discuss (no gate)
    expectAdvanced(cli('continue'), 'discuss');
    expectState('phase', 'discuss', 'milestone-active');
  });

  // ─── DISCUSS GATE: context.md ───────────────────────
  it('discuss gate: context.md format checks', () => {
    const dir = 'bp/milestones/M1-core/phases/ph.1-auth';

    // no file
    expectBlocked(cli('continue'), 'context.md');
    expectState('phase', 'discuss', 'milestone-active');

    // empty
    write(`${dir}/context.md`, '');
    expectBlocked(cli('continue'), 'Parse error');
    expectState('phase', 'discuss', 'milestone-active');

    // wrong title
    write(`${dir}/context.md`, '# Wrong\n');
    expectBlocked(cli('continue'), 'Parse error');
    expectState('phase', 'discuss', 'milestone-active');

    // no decisions
    write(`${dir}/context.md`, '# Context: test\n\ntext\n');
    expectBlocked(cli('continue'), 'No decisions found');
    expectState('phase', 'discuss', 'milestone-active');

    // D with non-numeric ID -> PEG error
    write(`${dir}/context.md`, '# Context: test\n\n## D-X: x\n- Status: ok\n- Reason: y\n');
    expectBlocked(cli('continue'), 'ID must be numeric');
    expectState('phase', 'discuss', 'milestone-active');

    // D numbering skip (D-1, D-3)
    write(`${dir}/context.md`, '# Context: test\n\n## D-1: x\n- Status: ACCEPTED\n- Decision: x\n- Reason: y\n\n## D-3: z\n- Status: ACCEPTED\n- Decision: z\n- Reason: w\n');
    expectBlocked(cli('continue'), 'D-3', 'expected D-2');

    // valid -> advance to research
    write(`${dir}/context.md`, VALID_CONTEXT);
    expectAdvanced(cli('continue'), 'research');
    expectState('phase', 'research', 'milestone-active');
  });

  // ─── PHASE RESEARCH GATE: research.md ───────────────
  it('phase research gate: research.md format checks', () => {
    const dir = 'bp/milestones/M1-core/phases/ph.1-auth';

    // no file
    expectBlocked(cli('continue'), 'research.md');
    expectState('phase', 'research', 'milestone-active');

    // empty
    write(`${dir}/research.md`, '');
    expectBlocked(cli('continue'), 'Parse error');
    expectState('phase', 'research', 'milestone-active');

    // wrong title
    write(`${dir}/research.md`, '# Wrong\n');
    expectBlocked(cli('continue'), 'Parse error');
    expectState('phase', 'research', 'milestone-active');

    // missing ## Research Scope (PEG error - section required)
    write(`${dir}/research.md`, '# Research: test\n\n## Recommendation\nok\n');
    expectBlocked(cli('continue'), 'Parse error');
    expectState('phase', 'research', 'milestone-active');

    // missing ## Recommendation (PEG error - section required)
    write(`${dir}/research.md`, '# Research: test\n\n## Research Scope\nok\n');
    expectBlocked(cli('continue'), 'Parse error');
    expectState('phase', 'research', 'milestone-active');

    // valid -> advance to split
    write(`${dir}/research.md`, VALID_PHASE_RESEARCH);
    expectAdvanced(cli('continue'), 'split');
    expectState('phase', 'split', 'milestone-active');
  });

  // ─── SPLIT GATE: changes/ dir + create changes ──────
  it('split gate: changes/ dir + create changes', () => {
    const dir = 'bp/milestones/M1-core/phases/ph.1-auth';

    // no changes/ dir
    remove(`${dir}/changes`);
    expectBlocked(cli('continue'), 'No change directories');
    expectState('phase', 'split', 'milestone-active');

    // create 2 changes
    cli('change', 'new', 'change-a');
    cli('change', 'new', 'change-b');
    const s = getState();
    expect(s.adhoc[0].name).toBe('change-a');
    expect(s.adhoc[0].status).toBe('pending');
    expect(s.adhoc.length).toBe(2);

    // continue change-a: pending -> proposal
    cli('continue', 'change', 'change-a');
    expectState('adhoc', 'proposal', 'milestone-active', 'proposal');
  });

  // ─── PROPOSAL GATE: proposal.md ─────────────────────
  it('proposal gate: proposal.md format checks', () => {
    const dir = 'bp/changes/change-a';

    // no file
    remove(`${dir}/proposal.md`);
    expectBlocked(cli('continue', 'change', 'change-a'), 'proposal.md');
    expectState('adhoc', 'proposal', 'milestone-active', 'proposal');

    // empty
    write(`${dir}/proposal.md`, '');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'proposal', 'milestone-active', 'proposal');

    // wrong title
    write(`${dir}/proposal.md`, '# Wrong\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'proposal', 'milestone-active', 'proposal');

    // missing ## Intent
    write(`${dir}/proposal.md`, '# Proposal: t\n\n## Deliverables\n- PR-1: x\n  d\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'proposal', 'milestone-active', 'proposal');

    // missing ## Deliverables
    write(`${dir}/proposal.md`, '# Proposal: t\n\n## Intent\ntest\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'proposal', 'milestone-active', 'proposal');

    // no PR items
    write(`${dir}/proposal.md`, '# Proposal: t\n\n## Intent\ntest\n\n## Deliverables\n\ntext\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'No deliverables found');
    expectState('adhoc', 'proposal', 'milestone-active', 'proposal');

    // PR without Source
    write(`${dir}/proposal.md`, '# Proposal: t\n\n## Intent\ntest\n\n## Deliverables\n- PR-1: x\n  refs: FR-1\n  desc\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'missing Source');
    expectState('adhoc', 'proposal', 'milestone-active', 'proposal');

    // PR without refs (phase change)
    write(`${dir}/proposal.md`, '# Proposal: t\n\n## Intent\ntest\n\n## Deliverables\n- PR-1: x\n  Source: FR-1 (bp/requirements.md)\n  desc\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Expected "refs: FR-N, D-N"');
    expectState('adhoc', 'proposal', 'milestone-active', 'proposal');

    // PR refs nonexistent FR-99
    write(`${dir}/proposal.md`, '# Proposal: t\n\n## Intent\ntest\n\n## Deliverables\n- PR-1: x\n  refs: FR-99\n  Source: FR-99 (bp/requirements.md)\n  desc\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'FR-99', 'not found');
    expectState('adhoc', 'proposal', 'milestone-active', 'proposal');

    // refs with wrong format (refs: XYZ instead of FR-N) -> PEG error from RefId catch-all
    write(`${dir}/proposal.md`, '# Proposal: t\n\n## Intent\ntest\n\n## Deliverables\n- PR-1: x\n  refs: XYZ\n  Source: FR-1 (bp/requirements.md)\n  desc\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'ref must start with FR-/NFR-/D-');

    // PR with non-numeric ID -> PEG error
    write(`${dir}/proposal.md`, '# Proposal: t\n\n## Intent\ntest\n\n## Deliverables\n- PR-X: x\n  refs: FR-1\n  Source: FR-1 (bp/requirements.md)\n  desc\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'ID must be numeric');
    // PR numbering skip (PR-1, PR-3)
    write(`${dir}/proposal.md`, '# Proposal: t\n\n## Intent\ntest\n\n## Deliverables\n- PR-1: a\n  refs: FR-1\n  Source: FR-1 (bp/requirements.md)\n  d\n- PR-3: b\n  refs: FR-2\n  Source: FR-2 (bp/requirements.md)\n  d\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'PR-3', 'expected PR-2');
    expectState('adhoc', 'proposal', 'milestone-active', 'proposal');

    // valid -> advance to planning
    write(`${dir}/proposal.md`, VALID_PROPOSAL);
    expectAdvanced(cli('continue', 'change', 'change-a'), 'change-planning');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');
  });

  // ─── PLANNING GATE: design.md + tasks.md + coverage ─
  it('planning gate: design.md format checks', () => {
    const dir = 'bp/changes/change-a';

    // no design.md
    remove(`${dir}/design.md`);
    expectBlocked(cli('continue', 'change', 'change-a'), 'design.md');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');

    // empty
    write(`${dir}/design.md`, '');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');

    // wrong title
    write(`${dir}/design.md`, '# Wrong\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');

    // missing ## Design Items
    write(`${dir}/design.md`, '# Design: t\n\ntext\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');

    // DS without refs: line -> PEG error from RefsLine catch-all
    write(`${dir}/design.md`, '# Design: t\n\n## Design Items\n- DS-1: x\n  desc\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Expected "refs: PR-N" on its own indented line');

    // no DS items
    write(`${dir}/design.md`, '# Design: t\n\n## Design Items\n\ntext\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'No design items');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');

    // DS without Source
    write(`${dir}/design.md`, '# Design: t\n\n## Design Items\n- DS-1: x\n  refs: PR-1\n  desc\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'missing Source');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');

    // Source without parentheses (wrong format)
    write(`${dir}/design.md`, '# Design: t\n\n## Design Items\n- DS-1: x\n  refs: PR-1\n  Source: PR-1\n  desc\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'missing Source: annotation');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');

    // refs with wrong prefix (refs: FR-1 instead of PR-N) -> PEG error from PRId catch-all
    write(`${dir}/design.md`, '# Design: t\n\n## Design Items\n- DS-1: x\n  refs: FR-1\n  Source: PR-1 (proposal.md)\n  desc\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'ref must start with PR-');

    // refs with completely wrong format -> PEG error from PRId catch-all
    write(`${dir}/design.md`, '# Design: t\n\n## Design Items\n- DS-1: x\n  refs: XYZ\n  Source: PR-1 (proposal.md)\n  desc\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'ref must start with PR-');

    // DS with non-numeric ID -> Integer fails -> no items -> semantic error
    // DS with non-numeric ID -> PEG error
    write(`${dir}/design.md`, '# Design: t\n\n## Design Items\n- DS-X: x\n  refs: PR-1\n  Source: PR-1 (proposal.md)\n  desc\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'ID must be numeric');
    // DS numbering skip (DS-1, DS-3)
    write(`${dir}/design.md`, '# Design: t\n\n## Design Items\n- DS-1: a\n  refs: PR-1\n  Source: PR-1 (proposal.md)\n  d\n- DS-3: b\n  refs: PR-2\n  Source: PR-2 (proposal.md)\n  d\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'DS-3', 'expected DS-2');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');
  });

  it('planning gate: tasks.md format checks', () => {
    const dir = 'bp/changes/change-a';
    write(`${dir}/design.md`, VALID_DESIGN);

    // no tasks.md
    remove(`${dir}/tasks.md`);
    expectBlocked(cli('continue', 'change', 'change-a'), 'tasks.md');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');

    // empty
    write(`${dir}/tasks.md`, '');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');

    // wrong title
    write(`${dir}/tasks.md`, '# Wrong\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');

    // task without [type:] -> TaskItem fails -> no tasks -> semantic error
    write(`${dir}/tasks.md`, '# Tasks: t\n\n## Wave 1: C\n- [ ] T-1: impl\n  - **refs**: DS-1\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'No tasks found');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');


    // no FieldLines -> task has 0 fields -> semantic errors for missing refs/files/spec_ref
    write(`${dir}/tasks.md`, '# Tasks: t\n\n## Wave 1: C\n- [ ] T-1: [type:behavior] impl\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'missing refs field');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');


    // T with non-numeric ID -> Integer fails -> TaskItem fails -> no tasks -> semantic error
    // T with non-numeric ID -> PEG error
    write(`${dir}/tasks.md`, '# Tasks: t\n\n## Wave 1: C\n- [ ] T-X: [type:behavior] impl\n  - **refs**: DS-1\n  - **files**: x.ts\n  - **spec_ref**: s.md\n  - **acceptance**: ok\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'ID must be numeric');
    // T numbering skip (T-1, T-3)
    write(`${dir}/tasks.md`, '# Tasks: t\n\n## Wave 1: C\n- [ ] T-1: [type:behavior] a\n  - **refs**: DS-1\n  - **files**: x.ts\n  - **spec_ref**: s.md\n  - **acceptance**: ok\n- [ ] T-3: [type:behavior] b\n  - **refs**: DS-2\n  - **files**: y.ts\n  - **spec_ref**: s.md\n  - **acceptance**: ok\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'T-3', 'expected T-2');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');

    // refs not DS-N (refs: PR-1)
    write(`${dir}/tasks.md`, '# Tasks: t\n\n## Wave 1: C\n- [ ] T-1: [type:behavior] a\n  - **refs**: PR-1\n  - **files**: x.ts\n  - **spec_ref**: s.md\n  - **acceptance**: ok\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'refs must start with DS-N');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');

    // refs with completely wrong format (XYZ)
    write(`${dir}/tasks.md`, '# Tasks: t\n\n## Wave 1: C\n- [ ] T-1: [type:behavior] a\n  - **refs**: XYZ\n  - **files**: x.ts\n  - **spec_ref**: s.md\n  - **acceptance**: ok\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'refs must start with DS-N');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');

    // refs with DS-X (non-numeric) -> checkTasks catches non-numeric DS- prefix
    write(`${dir}/tasks.md`, '# Tasks: t\n\n## Wave 1: C\n- [ ] T-1: [type:behavior] a\n  - **refs**: DS-X\n  - **files**: x.ts\n  - **spec_ref**: s.md\n  - **acceptance**: ok\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'must match DS-N format');

    // files empty
    write(`${dir}/tasks.md`, '# Tasks: t\n\n## Wave 1: C\n- [ ] T-1: [type:behavior] a\n  - **refs**: DS-1\n  - **files**: \n  - **spec_ref**: s.md\n  - **acceptance**: ok\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'files field is empty');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');

    // behavior without spec_ref
    write(`${dir}/tasks.md`, '# Tasks: t\n\n## Wave 1: C\n- [ ] T-1: [type:behavior] a\n  - **refs**: DS-1\n  - **files**: x.ts\n  - **acceptance**: ok\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'behavior type requires spec_ref');

    // acceptance empty
    write(`${dir}/tasks.md`, '# Tasks: t\n\n## Wave 1: C\n- [ ] T-1: [type:behavior] a\n  - **refs**: DS-1\n  - **files**: x.ts\n  - **spec_ref**: s.md\n  - **acceptance**: \n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'acceptance field is empty');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');

    // files with absolute path
    write(`${dir}/tasks.md`, '# Tasks: t\n\n## Wave 1: C\n- [ ] T-1: [type:behavior] a\n  - **refs**: DS-1\n  - **files**: /src/login.ts\n  - **spec_ref**: s.md\n  - **acceptance**: ok\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'must be relative');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');

    // files with spaces in path
    write(`${dir}/tasks.md`, '# Tasks: t\n\n## Wave 1: C\n- [ ] T-1: [type:behavior] a\n  - **refs**: DS-1\n  - **files**: src/login file.ts\n  - **spec_ref**: s.md\n  - **acceptance**: ok\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'contains spaces');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');
  });

  it('planning gate: coverage chain checks', () => {
    const dir = 'bp/changes/change-a';

    // DS refs nonexistent PR-99 -> checkDesign catches it (PR-99 not in proposal)
    write(`${dir}/design.md`, '# Design: t\n\n## Design Items\n- DS-1: a\n  refs: PR-99\n  Source: PR-99 (proposal.md)\n  d\n');
    write(`${dir}/tasks.md`, VALID_TASKS);
    expectBlocked(cli('continue', 'change', 'change-a'), 'PR-99');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');

    write(`${dir}/design.md`, VALID_DESIGN);
    write(`${dir}/tasks.md`, '# Tasks: t\n\n## Wave 1: C\n- [ ] T-1: [type:behavior] a\n  - **refs**: DS-99\n  - **files**: x.ts\n  - **spec_ref**: s.md\n  - **acceptance**: ok\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'DS-99');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');

    // PR-1 orphan (not referenced by any DS)
    write(`${dir}/design.md`, '# Design: t\n\n## Design Items\n- DS-1: a\n  refs: PR-2\n  Source: PR-2 (proposal.md)\n  d\n');
    write(`${dir}/tasks.md`, '# Tasks: t\n\n## Wave 1: C\n- [ ] T-1: [type:behavior] a\n  - **refs**: DS-1\n  - **files**: x.ts\n  - **spec_ref**: s.md\n  - **acceptance**: ok\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'PR-1', 'not referenced by any Design Item');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');

    // valid -> advance to applying
    write(`${dir}/design.md`, VALID_DESIGN);
    write(`${dir}/tasks.md`, VALID_TASKS);
    const out4 = cli('continue', 'change', 'change-a');
    console.log('DEBUG step4:', JSON.stringify(out4));
    expectAdvanced(out4, 'change-applying');
  });

  // ─── APPLYING GATE: tasks_marked ────────────────────
  it('applying gate: tasks marked checks', () => {
    const dir = 'bp/changes/change-a';

    // unmarked [ ]
    expectBlocked(cli('continue', 'change', 'change-a'), 'Unmarked tasks remain');
    expectState('adhoc', 'applying', 'milestone-active', 'applying');

    // [x] but no commit hash
    write(`${dir}/tasks.md`, '# Tasks: t\n\n## Wave 1: C\n- [x] T-1: [type:behavior] a\n  - **refs**: DS-1\n  - **files**: x.ts\n  - **spec_ref**: s.md\n  - **acceptance**: ok\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'missing commit hash');
    expectState('adhoc', 'applying', 'milestone-active', 'applying');

    // git init + commit + mark [x] with hash -> advance
    execSync('git init', { cwd: testDir });
    execSync('git config user.email t@t', { cwd: testDir });
    execSync('git config user.name t', { cwd: testDir });
    mkdirSync(join(testDir, 'src'), { recursive: true });
    writeFileSync(join(testDir, 'src/login.ts'), '');
    execSync('git add src/login.ts', { cwd: testDir });
    execSync('git commit -m "feat: login"', { cwd: testDir });
    cli('commit', '"feat: login"', '--files', 'src/login.ts', '--task', 'T-1', '--tasks-path', 'bp/changes/change-a/tasks.md');
    write(`${dir}/change-summary.md`, VALID_CHANGE_SUMMARY);
    expectAdvanced(cli('continue', 'change', 'change-a'), 'change-reviewing');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');
  });

  // ─── REVIEWING GATE: 3 review files ─────────────────
  it('reviewing gate: spec-review.md format checks', () => {
    const dir = 'bp/changes/change-a';

    // no file
    remove(`${dir}/spec-review.md`);
    expectBlocked(cli('continue', 'change', 'change-a'), 'spec-review.md');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');

    // empty
    write(`${dir}/spec-review.md`, '');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');

    // wrong title
    write(`${dir}/spec-review.md`, '# Wrong\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');

    // missing ## Overall
    write(`${dir}/spec-review.md`, '# Spec Review: t\n\n## Constraint Checklist\n| # | C | S |\n| R1 | x | PASS |\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');

    // invalid verdict MAYBE
    write(`${dir}/spec-review.md`, '# Spec Review: t\n\n## Overall: MAYBE\n\n## Constraint Checklist\n| # | C | S |\n| R1 | x | PASS |\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');

    // missing ## Constraint Checklist
    write(`${dir}/spec-review.md`, '# Spec Review: t\n\n## Overall: PASS\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');
    // no constraint rows
    write(`${dir}/spec-review.md`, '# Spec Review: t\n\n## Overall: PASS\n\n## Constraint Checklist\n| # | C | S |\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'has no data rows');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');

    // valid spec-review, but no quality-review
    write(`${dir}/spec-review.md`, VALID_SPEC_REVIEW);
    expectBlocked(cli('continue', 'change', 'change-a'), 'quality-review.md');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');
  });

  it('reviewing gate: quality-review.md format checks', () => {
    const dir = 'bp/changes/change-a';

    // empty
    write(`${dir}/quality-review.md`, '');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');

    // wrong title
    write(`${dir}/quality-review.md`, '# Wrong\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');

    // missing ## Overall
    write(`${dir}/quality-review.md`, '# Quality Review: t\n\n## Issues\n| # | S | D |\n| Q1 | INFO | x |\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');

    // invalid verdict MAYBE
    write(`${dir}/quality-review.md`, '# Quality Review: t\n\n## Overall: MAYBE\n\n## Issues\n| # | S | D |\n| Q1 | INFO | x |\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');

    // missing ## Issues table
    write(`${dir}/quality-review.md`, '# Quality Review: t\n\n## Overall: PASS\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');

    // no issue rows
    write(`${dir}/quality-review.md`, '# Quality Review: t\n\n## Overall: PASS\n\n## Issues\n| # | S | D |\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'has no data rows');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');

    // invalid severity CRITICAL
    write(`${dir}/quality-review.md`, '# Quality Review: t\n\n## Overall: PASS\n\n## Issues\n| # | S | D |\n| Q1 | CRITICAL | x |\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');

    // valid quality-review, but no goal-review
    write(`${dir}/quality-review.md`, VALID_QUALITY_REVIEW);
    expectBlocked(cli('continue', 'change', 'change-a'), 'goal-review.md');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');
  });

  it('reviewing gate: goal-review.md format checks', () => {
    const dir = 'bp/changes/change-a';

    // empty
    write(`${dir}/goal-review.md`, '');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');

    // wrong title
    write(`${dir}/goal-review.md`, '# Wrong\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');

    // missing ## Overall
    write(`${dir}/goal-review.md`, '# Goal Review: t\n\n## Goal Checklist\n| # | G | S |\n| G1 | x | PASS |\n\n## Completeness Assessment\nok\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');

    // invalid verdict MAYBE
    write(`${dir}/goal-review.md`, '# Goal Review: t\n\n## Overall: MAYBE\n\n## Goal Checklist\n| # | G | S |\n| G1 | x | PASS |\n\n## Completeness Assessment\nok\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');

    // missing ## Goal Checklist
    write(`${dir}/goal-review.md`, '# Goal Review: t\n\n## Overall: PASS\n\n## Completeness Assessment\nok\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');

    // no goal rows
    write(`${dir}/goal-review.md`, '# Goal Review: t\n\n## Overall: PASS\n\n## Goal Checklist\n| # | G | S |\n\n## Completeness Assessment\nok\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'has no data rows');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');

    // missing ## Completeness Assessment
    write(`${dir}/goal-review.md`, '# Goal Review: t\n\n## Overall: PASS\n\n## Goal Checklist\n| # | G | S |\n| G1 | x | PASS |\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');

    // all 3 valid -> advance to archiving
    write(`${dir}/goal-review.md`, VALID_GOAL_REVIEW);
    expectAdvanced(cli('continue', 'change', 'change-a'), 'change-archiving');
    expectState('adhoc', 'archiving', 'milestone-active', 'archiving');
  });

  // ─── ARCHIVING GATE: change-summary + verification ──
  it('archiving gate: change-summary.md format checks', () => {
    const dir = 'bp/changes/change-a';

    // no file
    remove(`${dir}/change-summary.md`);
    expectBlocked(cli('continue', 'change', 'change-a'), 'change-summary.md');
    expectState('adhoc', 'archiving', 'milestone-active', 'archiving');

    // empty
    write(`${dir}/change-summary.md`, '');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'archiving', 'milestone-active', 'archiving');

    // wrong title
    write(`${dir}/change-summary.md`, '# Wrong\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'archiving', 'milestone-active', 'archiving');

    // missing ## Intent (PEG error - section required)
    write(`${dir}/change-summary.md`, '# Change Summary: t\n\n## Commits\n- abc: msg\n\n## Output Files\n- f.ts: create\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'archiving', 'milestone-active', 'archiving');

    // missing ## Commits (PEG error - section required)
    write(`${dir}/change-summary.md`, '# Change Summary: t\n\n## Intent\ntest\n\n## Output Files\n- f.ts: create\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'archiving', 'milestone-active', 'archiving');

    // missing ## Output Files (PEG error - section required)
    write(`${dir}/change-summary.md`, '# Change Summary: t\n\n## Intent\ntest\n\n## Commits\n- abc: msg\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'archiving', 'milestone-active', 'archiving');

    // valid summary, no verification
    write(`${dir}/change-summary.md`, VALID_CHANGE_SUMMARY);
    remove(`${dir}/verification.md`);
    expectBlocked(cli('continue', 'change', 'change-a'), 'verification.md');
    expectState('adhoc', 'archiving', 'milestone-active', 'archiving');
  });

  it('archiving gate: verification.md format checks + archive', () => {
    const dir = 'bp/changes/change-a';

    // empty
    write(`${dir}/verification.md`, '');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'archiving', 'milestone-active', 'archiving');

    // wrong title
    write(`${dir}/verification.md`, '# Wrong\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'archiving', 'milestone-active', 'archiving');

    // missing ## Status
    write(`${dir}/verification.md`, '# Verification: t\n\n- [x] ok\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'archiving', 'milestone-active', 'archiving');

    // invalid status "done"
    write(`${dir}/verification.md`, '# Verification: t\n\n## Status: done\n');
    expectBlocked(cli('continue', 'change', 'change-a'), 'Parse error');
    expectState('adhoc', 'archiving', 'milestone-active', 'archiving');

    // valid -> archive
    write(`${dir}/verification.md`, VALID_VERIFICATION);
    const out = cli('archive', 'bp/changes/change-a');
    expect(out).toContain('Archived');
    const s = getState();
    expect(s.adhoc.find((c: any) => c.name === 'change-a')).toBeUndefined();
    expect(s.completed.some((c: any) => c.name === 'change-a')).toBe(true);
    expect(s.active_context.type).toBe('adhoc');
    expect(s.active_context.step).toBe('pending');
  });

  it('change-b: full lifecycle with valid files', () => {
    const dir = 'bp/changes/change-b';

    // proposal
    write(`${dir}/proposal.md`, VALID_PROPOSAL.replace(/change-a/g, 'change-b'));
    cli('continue', 'change', 'change-b');
    cli('continue', 'change', 'change-b');
    expectState('changes', '', 'milestone-active', 'planning', 'change-b');

    // design + tasks
    write(`${dir}/design.md`, VALID_DESIGN.replace(/change-a/g, 'change-b'));
    write(`${dir}/tasks.md`, VALID_TASKS.replace(/change-a/g, 'change-b'));
    cli('continue', 'change', 'change-b');
    expectState('changes', '', 'milestone-active', 'applying', 'change-b');

    // git commit + mark [x]
    writeFileSync(join(testDir, 'src/register.ts'), '');
    execSync('git add src/register.ts', { cwd: testDir });
    execSync('git commit -m "feat: register"', { cwd: testDir });
    // Mark T-1 with commit hash
    const commitOut = execSync(`node ${cliPath} commit "feat: register" --files src/register.ts --task T-1 --tasks-path bp/changes/change-b/tasks.md`, { encoding: 'utf8', cwd: testDir });
    // Also mark T-2 with same hash
    const commitHash = JSON.parse(commitOut).hash;
    const tasksPath = join(testDir, 'bp/changes/change-b/tasks.md');
    let tasksContent = readFileSync(tasksPath, 'utf-8');
    tasksContent = tasksContent.replace(
      '- [ ] T-2: [type:behavior] implement register',
      `- [x] T-2: [type:behavior] implement register <!-- commit: ${commitHash} -->`
    );
    writeFileSync(tasksPath, tasksContent);

    // Advance to reviewing
    cli('continue', 'change', 'change-b');
    expectState('changes', '', 'milestone-active', 'reviewing', 'change-b');

    // reviews
    write(`${dir}/spec-review.md`, VALID_SPEC_REVIEW.replace(/change-a/g, 'change-b'));
    write(`${dir}/quality-review.md`, VALID_QUALITY_REVIEW.replace(/change-a/g, 'change-b'));
    write(`${dir}/goal-review.md`, VALID_GOAL_REVIEW.replace(/change-a/g, 'change-b'));
    cli('continue', 'change', 'change-b');
    expectState('changes', '', 'milestone-active', 'archiving', 'change-b');

    write(`${dir}/change-summary.md`, VALID_CHANGE_SUMMARY.replace(/change-a/g, 'change-b'));
    // verification + archive
    write(`${dir}/verification.md`, VALID_VERIFICATION.replace(/change-a/g, 'change-b'));
    const out = cli('archive', 'bp/changes/change-b');
    expect(out).toContain('Archived');
    expect(out).toContain('Phase ph.1-auth complete');

    const s = getState();
    expect(s.adhoc.length).toBe(0);
    expect(s.changes.length).toBe(0);
    expect(s.active_context.type).toBe('phase');
    expect(s.active_context.step).toBe('ready');
  });

  // ─── PHASE TRANSITION: ph.1-auth -> ph.2-api ────────
  it('phase-ready: next phase prompt + advance', () => {
    // Create next phase directory first so findNextPhase can find it
    mkdirSync(join(testDir, 'bp/milestones/M1-core/phases/ph.2-api/changes'), { recursive: true });
    const out = cli('continue');
    expect(out).toContain('phase complete');
    expect(out).toContain('ph.2-api');
    expectState('phase', 'ready', 'milestone-active');

    cli('state', 'set-phase', 'ph.2-api');
    expectState('phase', 'start', 'milestone-active');

    expectAdvanced(cli('continue'), 'discuss');
    expectState('phase', 'discuss', 'milestone-active');
  });

  // ─── PH.2-API (1 change, valid only) ────────────────
  it('ph.2-api: 1 change full lifecycle', () => {
    const pdir = 'bp/milestones/M1-core/phases/ph.2-api';
    const cdir = 'bp/changes/change-c';

    write(`${pdir}/context.md`, VALID_CONTEXT.replace('ph.1-auth', 'ph.2-api'));
    cli('continue');
    expectState('phase', 'research', 'milestone-active');

    write(`${pdir}/research.md`, VALID_PHASE_RESEARCH.replace('ph.1-auth', 'ph.2-api'));
    cli('continue');
    expectState('phase', 'split', 'milestone-active');

    cli('change', 'new', 'change-c');
    cli('continue', 'change', 'change-c');
    expectState('adhoc', 'proposal', 'milestone-active', 'proposal');

    write(`${cdir}/proposal.md`, VALID_PROPOSAL.replace(/change-a/g, 'change-c'));
    cli('continue', 'change', 'change-c');
    cli('continue', 'change', 'change-c');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');

    write(`${cdir}/design.md`, VALID_DESIGN.replace(/change-a/g, 'change-c'));
    write(`${cdir}/tasks.md`, VALID_TASKS.replace(/change-a/g, 'change-c'));
    cli('continue', 'change', 'change-c');
    expectState('adhoc', 'applying', 'milestone-active', 'applying');

    writeFileSync(join(testDir, 'src/api.ts'), '');
    execSync('git add src/api.ts', { cwd: testDir });
    execSync('git commit -m "feat: api"', { cwd: testDir });
    const commitC = execSync(`node ${cliPath} commit "feat: api" --files src/api.ts --task T-1 --tasks-path bp/changes/change-c/tasks.md`, { encoding: 'utf8', cwd: testDir });
    const hashC = JSON.parse(commitC).hash;
    // Mark T-2 with same hash
    const tasksC = join(testDir, 'bp/changes/change-c/tasks.md');
    let tc = readFileSync(tasksC, 'utf-8');
    tc = tc.replace('- [ ] T-2: [type:behavior] implement register', `- [x] T-2: [type:behavior] implement register <!-- commit: ${hashC} -->`);
    writeFileSync(tasksC, tc);
    write(`${cdir}/change-summary.md`, VALID_CHANGE_SUMMARY.replace(/change-a/g, 'change-c'));
    write(`${cdir}/spec-review.md`, VALID_SPEC_REVIEW.replace(/change-a/g, 'change-c'));
    write(`${cdir}/quality-review.md`, VALID_QUALITY_REVIEW.replace(/change-a/g, 'change-c'));
    write(`${cdir}/goal-review.md`, VALID_GOAL_REVIEW.replace(/change-a/g, 'change-c'));
    cli('continue', 'change', 'change-c');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');
    // Second continue advances to archiving (reviews already written)
    cli('continue', 'change', 'change-c');
    expectState('adhoc', 'archiving', 'milestone-active', 'archiving');
    write(`${cdir}/verification.md`, VALID_VERIFICATION.replace(/change-a/g, 'change-c'));
    const out = cli('archive', 'bp/changes/change-c');
    expect(out).toContain('Phase ph.2-api complete');
    expectState('phase', 'ready', 'milestone-active');

    const out2 = cli('continue');
    expect(out2).toContain('no next phase');
    expectState('phase', 'ready', 'milestone-active');
  });

  // ─── MILESTONE SWITCH: M1 -> M2 ─────────────────────
  it('milestone switch: M1 -> M2', () => {
    // Write valid requirements for new milestone's grill gate
    write('bp/requirements.md', VALID_REQ);
    cli('state', 'set-milestone', 'M2-ui');
    expectState('milestone', 'active', 'milestone-active');
    const s = getState();
    expect(s.project.current_milestone).toBe('M2-ui');
    expect(s.project.current_milestone).toBe('M2-ui');

    expectAdvanced(cli('continue'), 'grill');
    expectState('milestone', 'grill', 'grill');
  });

  // ─── M2: ph.1-dashboard (1 change, valid only) ─────
  it('M2 ph.1-dashboard: full lifecycle', () => {
    cli('continue');
    expectState('milestone', 'research', 'research');

    write('bp/research/summary.md', VALID_SUMMARY);
    cli('continue');
    expectState('milestone', 'roadmap', 'roadmap');

    mkdirSync(join(testDir, 'bp/milestones/M2-ui/phases/ph.1-dashboard/changes'), { recursive: true });
    cli('state', 'set-milestone', 'M2-ui');
    cli('state', 'set-phase', 'ph.1-dashboard');
    expectState('phase', 'start', 'milestone-active');

    cli('continue');
    expectState('phase', 'discuss', 'milestone-active');

    const pdir = 'bp/milestones/M2-ui/phases/ph.1-dashboard';
    const cdir = 'bp/changes/change-d';

    write(`${pdir}/context.md`, '# Context: ph.1-dashboard\n\n## D-1: ui framework\n- Status: ACCEPTED\n- Decision: ui framework\n- Reason: best option\n');
    cli('continue');
    expectState('phase', 'research', 'milestone-active');

    write(`${pdir}/research.md`, '# Research: ph.1-dashboard\n\n## Research Scope\nUI\n\n## Recommendation\nReact\n');
    cli('continue');
    expectState('phase', 'split', 'milestone-active');

    cli('change', 'new', 'change-d');
    cli('continue', 'change', 'change-d');
    expectState('adhoc', 'proposal', 'milestone-active', 'proposal');

    write(`${cdir}/proposal.md`, VALID_PROPOSAL.replace(/change-a/g, 'change-d'));
    cli('continue', 'change', 'change-d');
    cli('continue', 'change', 'change-d');
    expectState('adhoc', 'planning', 'milestone-active', 'planning');

    write(`${cdir}/design.md`, VALID_DESIGN.replace(/change-a/g, 'change-d'));
    write(`${cdir}/tasks.md`, VALID_TASKS.replace(/change-a/g, 'change-d'));
    cli('continue', 'change', 'change-d');
    expectState('adhoc', 'applying', 'milestone-active', 'applying');

    writeFileSync(join(testDir, 'src/dashboard.ts'), '');
    execSync('git add src/dashboard.ts', { cwd: testDir });
    execSync('git commit -m "feat: dashboard"', { cwd: testDir });
    const commitD = execSync(`node ${cliPath} commit "feat: dashboard" --files src/dashboard.ts --task T-1 --tasks-path bp/changes/change-d/tasks.md`, { encoding: 'utf8', cwd: testDir });
    const hashD = JSON.parse(commitD).hash;
    // Mark T-2 with same hash
    const tasksD = join(testDir, 'bp/changes/change-d/tasks.md');
    let td = readFileSync(tasksD, 'utf-8');
    td = td.replace('- [ ] T-2: [type:behavior] implement register', `- [x] T-2: [type:behavior] implement register <!-- commit: ${hashD} -->`);
    writeFileSync(tasksD, td);
    write(`${cdir}/change-summary.md`, VALID_CHANGE_SUMMARY.replace(/change-a/g, 'change-d'));
    cli('continue', 'change', 'change-d');
    expectState('adhoc', 'reviewing', 'milestone-active', 'reviewing');
    // Second continue to archiving (reviews already written below)
    write(`${cdir}/spec-review.md`, VALID_SPEC_REVIEW.replace(/change-a/g, 'change-d'));
    write(`${cdir}/quality-review.md`, VALID_QUALITY_REVIEW.replace(/change-a/g, 'change-d'));
    write(`${cdir}/goal-review.md`, VALID_GOAL_REVIEW.replace(/change-a/g, 'change-d'));
    cli('continue', 'change', 'change-d');
    expectState('adhoc', 'archiving', 'milestone-active', 'archiving');
    write(`${cdir}/verification.md`, VALID_VERIFICATION.replace(/change-a/g, 'change-d'));
    const out = cli('archive', 'bp/changes/change-d');
    expect(out).toContain('Phase');
    expect(out).toContain('complete');
    expectState('phase', 'ready', 'milestone-active');
    const out2 = cli('continue');

    expect(out2).toContain('no next phase');
    expectState('phase', 'ready', 'milestone-active');
  });

  // ─── FINAL STATE ────────────────────────────────────
  it('final state: all changes archived', () => {
    const s = getState();
    expect(s.adhoc).toEqual([]);
    expect(s.changes).toEqual([]);
    expect(s.completed.length).toBeGreaterThanOrEqual(4);
    expect(s.completed.some((c: any) => c.name === 'change-a')).toBe(true);
    expect(s.completed.some((c: any) => c.name === 'change-b')).toBe(true);
    expect(s.completed.some((c: any) => c.name === 'change-c')).toBe(true);
    expect(s.completed.some((c: any) => c.name === 'change-d')).toBe(true);
  });
});
