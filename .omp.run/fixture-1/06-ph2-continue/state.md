---
project:
  name: sokoban
  status: phase-shipped
  current_milestone: M1-core-playable
  current_phase: ph.2-core-engine
active_context:
  type: change
  ref: changes/types-and-helpers
  step: applying
changes:
  - name: types-and-helpers
    status: applying
    depends_on: []
  - name: move-and-history
    status: proposal
    depends_on:
      - types-and-helpers
  - name: reducer
    status: proposal
    depends_on:
      - types-and-helpers
      - move-and-history
adhoc: []
---
# State

## Current Position

Project (init)

## State Machine

Project path: `initialized → grill → researched → roadmap-defined`

## History
- [2026-07-01] Archived `smoke-test` (M1-core-playable / ph.1-foundation)
- [2026-07-01] Archived `entry-canvas` (M1-core-playable / ph.1-foundation)
- [2026-07-01] Archived `vite-vitest-configs` (M1-core-playable / ph.1-foundation)
- [2026-07-01] Archived `toolchain-and-types` (M1-core-playable / ph.1-foundation)
