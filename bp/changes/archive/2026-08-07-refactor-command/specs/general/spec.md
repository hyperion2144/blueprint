# Delta Spec: general

> Change: refactor-command | Domain: general

## ADDED Requirements

### Requirement: Refactorer-Behavior-Preservation

The `bp dispatch refactorer` subcommand SHALL reuse the executor-style isolation machinery for the configured platform and SHALL constrain each refactorer dispatch to a single module path passed via `--target <module>`. A refactorer run that alters observable behavior — measured by `npm test` exiting non-zero — MUST revert the move and report the failure. Spec edits MUST be limited to `bp/specs/<domain>/spec.md` files whose contents reference the changed file paths or exports; unrelated domains MUST NOT be modified.

#### Scenario: per-module dispatch with executor isolation

- **GIVEN** a project configured with `platform: [omp, claude-code, agent, codex]`
- **WHEN** `bp dispatch refactorer --target src/core` runs
- **THEN** stdout contains an `### Isolation` section
- **AND** the section reports the same isolation type as `bp dispatch executor --target src/core` for each platform
- **AND** the dispatch instructs the orchestrator to invoke a sub-agent for the `refactorer` role only (not planner, executor, or reviewer).

#### Scenario: refactorer dispatch rejects unscoped targets

- **GIVEN** an initialized bp project
- **WHEN** `bp dispatch refactorer` runs without `--target`
- **THEN** stderr contains a usage message referencing `--target`
- **AND** the command exits with code `1`.

#### Scenario: spec sync stays inside affected domains

- **GIVEN** a refactorer dispatch assigned to module `src/core/refactor-analyzer.ts`
- **WHEN** the refactorer reports its diff summary at the end of the run
- **THEN** the summary lists every modified `bp/specs/<domain>/spec.md` file
- **AND** every listed domain corresponds to a directory whose contracts reference the changed module path or its exports.

