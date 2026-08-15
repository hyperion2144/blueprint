/**
 * bp-state.test.ts — deriveState milestone/phase pairing
 *
 * Regression: a fully completed active milestone (all P1.x COMPLETED) must
 * NOT pair with the first non-completed phase of a later milestone.
 * The active phase is scoped to the active milestone's section.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { deriveState } from '../../src/commands/bp-state.js';

const testDir = join(tmpdir(), `bp-state-${Date.now()}`);

const ROADMAP = `# Roadmap

## Milestone: M1 - First milestone [ACTIVE]

### Phase: P1.1 - Init [COMPLETED]
- [x] change-a archived

### Phase: P1.2 - Core [COMPLETED]
- [x] change-b archived

## Milestone: M2 - Later milestone [PLANNED]

### Phase: P2.1 - Polish [NOT_STARTED]
`;

describe('deriveState (milestone/phase pairing)', () => {
  beforeAll(() => {
    mkdirSync(join(testDir, 'bp', 'changes', 'archive'), { recursive: true });
    writeFileSync(join(testDir, 'bp', 'config.yaml'), 'profile: standard\n', 'utf-8');
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('pairs the phase with the active milestone only (M2 phase not pulled into M1)', () => {
    writeFileSync(join(testDir, 'bp', 'roadmap.md'), ROADMAP, 'utf-8');
    const state = deriveState(join(testDir, 'bp'));
    expect(state.milestone?.id).toBe('M1');
    expect(state.phase).toBeNull(); // M1 fully completed — no phase from M2
  });

  it('picks the first non-completed phase inside the active milestone', () => {
    const withPending = ROADMAP.replace(
      '### Phase: P1.2 - Core [COMPLETED]',
      '### Phase: P1.2 - Core [IN_PROGRESS]',
    );
    writeFileSync(join(testDir, 'bp', 'roadmap.md'), withPending, 'utf-8');
    const state = deriveState(join(testDir, 'bp'));
    expect(state.milestone?.id).toBe('M1');
    expect(state.phase?.id).toBe('P1.2');
  });
});
