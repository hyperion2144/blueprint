/**
 * design-system.ts — DESIGN.md artifact template (design workflow track).
 *
 * Produced by the designer sub-agent for UI-scoped changes. Output file is
 * DESIGN.md at the project root (or the design review scratch dir).
 * Placeholders are {{name}} and {{date}} only — the CLI handler substitutes
 * both; no other {{...}} tokens may appear (T-7 acceptance: no unsubstituted
 * placeholders after rendering).
 */

export const DESIGN_SYSTEM_TEMPLATE = `# Design System: {{name}}

> Generated {{date}}. Living design-language reference for this change. The
> designer sub-agent maintains this file as the UI scope evolves; the design
> review steps (design-review, plan-design-review) audit against it.

## Design System

### Product Context

<!-- Who this system serves, what problem the design solves, and which surfaces it covers. -->

### Aesthetic Direction

<!-- Mood, tone, and visual personality. Reference patterns, inspirations, or precedent work. -->

### Typography

<!-- Font families, sizes, weights, line heights, and usage rules. -->

### Color

<!-- Palette primitives, semantic tokens, usage rules, and contrast constraints. -->

### Spacing

<!-- Spacing scale, rhythm rules, and density guidance. -->

### Layout

<!-- Grid, breakpoints, composition rules, and responsive behavior. -->

### Motion

<!-- Durations, easing curves, animation principles, and motion budget. -->

### Decisions Log

<!-- Record each design decision with the alternative considered. Append rows as the design evolves. -->

| # | Decision | Status | Reason | Alternatives |
|---|----------|--------|--------|--------------|
| 1 |  | ACCEPTED |  |  |
`;
