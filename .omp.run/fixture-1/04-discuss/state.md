---
project:
  name: sokoban
  status: researched
  current_milestone: M1-core-playable
  current_phase: ph.1-foundation
active_context:
  type: change
  ref: changes/toolchain-and-types
  step: applying
changes:
  - name: toolchain-and-types
    status: applying
    depends_on: []
  - name: vite-vitest-configs
    status: proposal
    depends_on:
      - toolchain-and-types
  - name: entry-canvas
    status: proposal
    depends_on:
      - toolchain-and-types
      - vite-vitest-configs
  - name: smoke-test
    status: proposal
    depends_on:
      - toolchain-and-types
      - vite-vitest-configs
adhoc: []
---
# State

## Current Position

Project (init)

## State Machine

Project path: `initialized → grill → researched → roadmap-defined`

## History
