# Delta Spec: {{domain}}

<!--
  Behavioral contract for this change. Produced by the planner agent.
  This is NOT implementation documentation - it describes WHAT the system does, not HOW.

  Quality bar:
  - Requirements describe observable behavior (inputs, outputs, error conditions)
  - NOT implementation details (class names, library choices, function signatures)
  - Each requirement has at least 1 scenario (happy path)
  - Requirements with error conditions have error scenarios
  - SHALL/MUST used for absolute requirements, SHOULD for recommended, MAY for optional
  - MODIFIED requirements include the full new version + "was:" annotation
  - REMOVED requirements include the reason

  On archive:
  - ADDED -> appended to bp/specs/<domain>/spec.md
  - MODIFIED -> replaces existing requirement in bp/specs/<domain>/spec.md
  - REMOVED -> deleted from bp/specs/<domain>/spec.md
-->

> Change: {{change-name}} | Domain: {{domain}}

## ADDED Requirements

<!--
  New behavior being introduced by this change.
  These will be appended to the global spec on archive.

  Requirement naming: use a noun phrase describing the capability.
  Good: "Theme Selection", "Two-Factor Authentication", "Session Expiration"
  Bad: "ThemeFeature", "2FA", "SessionStuff"
-->

### Requirement: {{requirement-name}}

<!--
  Use RFC 2119 keywords:
  - MUST / SHALL: absolute requirement, no exceptions
  - SHOULD: recommended, exceptions documented
  - MAY: optional capability

  Describe the behavior, not the implementation.
  Good: "The system SHALL allow users to choose between light and dark themes."
  Bad: "The system SHALL use React Context to manage theme state."
-->

The system SHALL {{behavior-description}}.

<!--
  Scenarios: concrete examples of the requirement in action.
  Use Given/When/Then format.

  Minimum scenarios:
  - 1 happy path (always)
  - 1 edge case (if boundary conditions exist)
  - 1 error case (if the requirement can fail)

  Good scenario:
    GIVEN a user on any page
    WHEN the user clicks the theme toggle
    THEN the theme switches immediately
    AND the preference persists across sessions

  Bad scenario:
    GIVEN some state
    WHEN something happens
    THEN it works correctly
-->

#### Scenario: {{scenario-name}}

- **GIVEN** {{precondition}}
- **WHEN** {{action}}
- **THEN** {{observable-result}}
- **AND** {{additional-assertion}}

#### Scenario: {{edge-case-name}}

- **GIVEN** {{edge-precondition}}
- **WHEN** {{edge-action}}
- **THEN** {{edge-result}}

#### Scenario: {{error-case-name}}

- **GIVEN** {{error-precondition}}
- **WHEN** {{error-action}}
- **THEN** {{error-result - e.g., "an error message is displayed"}}
- **AND** {{side-effect - e.g., "no state change occurs"}}

## MODIFIED Requirements

<!--
  Existing behavior being changed.
  Include the FULL new requirement (not just the diff).
  Add "← (was: ...)" annotation showing what changed.

  The requirement header MUST match the existing one in bp/specs/<domain>/spec.md
  so the merge can find and replace it.
-->

### Requirement: {{existing-requirement-name}}

The system SHALL {{new-behavior}}.
← (was: {{old-behavior-summary}})

#### Scenario: {{updated-scenario-name}}

- **GIVEN** {{precondition}}
- **WHEN** {{action}}
- **THEN** {{new-result}}

## REMOVED Requirements

<!--
  Existing behavior being removed.
  List the requirement header (must match global spec) and reason.
  Do NOT include scenarios - they're being deleted.

  Verify before removing:
  - No other code depends on this behavior
  - The removal is intentional, not accidental
-->

### Requirement: {{removed-requirement-name}}

**Reason**: {{why this behavior is being removed - e.g., "Deprecated in favor of Two-Factor Authentication. Users should re-authenticate each session."}}
