<!-- BOOTSTRAPPED — extracted from src/parser/spec-parser.ts, src/parser/heading-tree.ts, src/core/delta-merge.ts, src/core/code-extract.ts, src/types/spec.ts -->

## Purpose

Parse, merge, and extract behavioral contracts from Markdown spec files using heading-tree analysis. Enable hierarchical spec structure (`## Purpose → ### Requirement → #### Scenario`), RFC 2119 keyword extraction, delta-spec merging with conflict detection, and code cognition backfill from git diffs.

### Requirement: Heading Tree Parsing

The system SHALL parse Markdown into a tree of `HeadingNode` objects, where each node captures level (1-6), text, line number, direct content, and children.

- **Source:** `src/parser/heading-tree.ts:14-55` `parseHeadings()`  
- **Confidence:** HIGH

#### Scenario: Simple heading tree
- **GIVEN** markdown `# Title\nSome text\n## Section\nMore text`
- **WHEN** `parseHeadings()` is called
- **THEN** a root node at level 1 with text `Title` and content `Some text` SHALL be returned
- **AND** a child node at level 2 with text `Section` and content `More text` SHALL exist under it

#### Scenario: Content stops at next heading
- **GIVEN** markdown `## A\ncontent A\n### B\ncontent B`
- **WHEN** `parseHeadings()` is called
- **THEN** node `A`'s content SHALL only include `content A` — `content B` belongs to node `B`

### Requirement: Heading Lookup

The system SHALL provide `findHeading(root, text)` for exact-match heading search and `findHeadingsByPrefix(root, prefix)` for prefix-based matching across the tree.

- **Source:** `src/parser/heading-tree.ts:63-84`  
- **Confidence:** HIGH

#### Scenario: Exact heading match
- **GIVEN** a heading tree with a node `## Purpose`
- **WHEN** `findHeading(root, "Purpose")` is called
- **THEN** the Purpose node SHALL be returned

#### Scenario: Prefix heading match
- **GIVEN** headings `### Requirement: Auth` and `### Requirement: Payments`
- **WHEN** `findHeadingsByPrefix(root, "Requirement:")` is called
- **THEN** both Requirement nodes SHALL be returned

### Requirement: Spec Structure Extraction

The system SHALL extract a `SpecSection` from a heading tree:
- `## Purpose` → `purpose` text  
- `### Requirement: <name>` → `Requirement` with keywords and scenarios  
- `#### Scenario: <name>` → `Scenario` with GIVEN/WHEN/THEN/AND/BUT steps  

- **Source:** `src/parser/spec-parser.ts:26-41` `extractSpecFromTree()`  
- **Confidence:** HIGH

#### Scenario: Full spec extraction
- **GIVEN** markdown with `## Purpose`, `### Requirement: Auth`, `#### Scenario: Login` with `- GIVEN`, `- WHEN`, `- THEN` steps
- **WHEN** `parseSpec()` is called
- **THEN** a `SpecSection` SHALL be returned with `purpose`, one `Requirement` named "Auth", and one `Scenario` named "Login" with 3 steps

### Requirement: RFC 2119 Keyword Extraction

The system SHALL detect RFC 2119 keywords (`SHALL`, `MUST`, `SHOULD`, `MAY`, `SHALL NOT`, `MUST NOT`, `SHOULD NOT`) within requirement content.

- **Source:** `src/parser/spec-parser.ts:11`, `src/parser/spec-parser.ts:47-53` `extractKeywords()`  
- **Confidence:** HIGH

#### Scenario: Keyword detected
- **GIVEN** requirement content contains "The system SHALL authenticate users"
- **WHEN** `extractKeywords()` is called
- **THEN** `["SHALL"]` SHALL be in the keywords array

#### Scenario: No keywords found
- **GIVEN** requirement content contains no RFC 2119 keywords
- **WHEN** `extractKeywords()` is called
- **THEN** an empty array SHALL be returned

### Requirement: Scenario Step Parsing

The system SHALL parse scenario steps from markdown bullet lines matching `- GIVEN|WHEN|THEN|AND|BUT <text>`.

- **Source:** `src/parser/spec-parser.ts:72-85` `parseScenarioSteps()`  
- **Confidence:** HIGH

#### Scenario: Complete scenario
- **GIVEN** content `- GIVEN user is logged in\n- WHEN user clicks logout\n- THEN session is cleared`
- **WHEN** `parseScenarioSteps()` is called
- **THEN** 3 steps SHALL be returned with types `GIVEN`, `WHEN`, `THEN`

#### Scenario: Non-step lines ignored
- **GIVEN** content includes `- Just a bullet` (not GIVEN/WHEN/THEN/AND/BUT)
- **WHEN** `parseScenarioSteps()` is called
- **THEN** that line SHALL be ignored

### Requirement: Delta-Spec Merging

The system SHALL merge delta-specs into live specs using a three-way merge strategy:
1. If a base fingerprint matches the live spec fingerprint → fast path: delta replaces base  
2. Otherwise → section-level merge via heading trees with conflict detection  

- **Source:** `src/core/delta-merge.ts:40-63` `mergeDeltaSpec()`  
- **Confidence:** HIGH

#### Scenario: Fast path — fingerprint match
- **GIVEN** `baseFingerprint` equals `fingerprint(baseSpec)`  
- **WHEN** `mergeDeltaSpec(baseSpec, deltaSpec, baseFingerprint)` is called
- **THEN** `{ type: 'ok', merged: deltaSpec }` SHALL be returned

#### Scenario: Section merge — no conflicts
- **GIVEN** `baseFingerprint` does not match and delta adds a new section not in base
- **WHEN** `mergeDeltaSpec()` is called
- **THEN** `{ type: 'ok', merged: <combined content> }` SHALL be returned

#### Scenario: Section merge — conflicts detected
- **GIVEN** `baseFingerprint` does not match and base and delta modify the same section
- **WHEN** `mergeDeltaSpec()` is called
- **THEN** `{ type: 'conflict', conflicts: [...] }` SHALL be returned with conflicting sections

### Requirement: SHA-256 Fingerprinting

The system SHALL compute SHA-256 fingerprints of spec content for change detection.

- **Source:** `src/core/delta-merge.ts:23-26` `fingerprint()`, `src/core/delta-merge.ts:28-32` `captureBaseFingerprint()`  
- **Confidence:** HIGH

#### Scenario: Fingerprint computed
- **GIVEN** spec content "Hello World"
- **WHEN** `fingerprint("Hello World")` is called
- **THEN** a 64-character hex string SHALL be returned

#### Scenario: Missing file returns null
- **GIVEN** spec file does not exist
- **WHEN** `captureBaseFingerprint("/nonexistent/spec.md")` is called
- **THEN** `null` SHALL be returned

### Requirement: Merge and Write

The system SHALL provide `mergeAndWrite(liveSpecPath, deltaSpecPath, baseFingerprint?)` that reads both files, merges, and writes the result.

- **Source:** `src/core/delta-merge.ts:181-195` `mergeAndWrite()`  
- **Confidence:** HIGH

#### Scenario: New spec file created from delta
- **GIVEN** `liveSpecPath` does not exist but delta spec does
- **WHEN** `mergeAndWrite()` is called
- **THEN** the delta content SHALL be written as the new live spec

### Requirement: Code Cognition Extraction

The system SHALL extract behavior and constraint keywords from git diffs during archiving and backfill them into spec files as `AUTO-EXTRACTED` sections.

- **Source:** `src/core/code-extract.ts:28-50` `extractFromGitDiff()`, `src/core/code-extract.ts:158-185` `generateAutoExtractedSection()`  
- **Confidence:** MEDIUM

#### Scenario: Extraction from git diff
- **GIVEN** a git repository with staged changes
- **WHEN** `extractFromGitDiff(repoDir, changeDir)` is called
- **THEN** behaviors and constraints SHALL be extracted and wrapped in `<!-- AUTO-EXTRACTED -->` markers

#### Scenario: No git diff available
- **GIVEN** no git diff can be obtained
- **WHEN** `extractFromGitDiff()` is called
- **THEN** `{ available: false, extractions: [] }` SHALL be returned

### Requirement: Domain Detection from Deltas

The system SHALL detect spec domains by scanning the change's `specs/` directory.

- **Source:** `src/core/code-extract.ts:76-87` `detectDomains()`  
- **Confidence:** MEDIUM

#### Scenario: No specs directory
- **GIVEN** change directory has no `specs/` subdirectory
- **WHEN** `detectDomains()` is called
- **THEN** `["general"]` SHALL be returned as the default domain
