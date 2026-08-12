/**
 * v2 artifact-validator - lightweight regex-based validation
 * Replaces PEG grammar validation with simple structural checks.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseContextJsonl, validateContextJsonl } from './context-jsonl-io.js';
import type { ContextJsonlError, ContextRefRow } from '../types/context-jsonl-io.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ContextArtifactValidation {
  valid: boolean;
  rows: ContextRefRow[];
  errors: ContextJsonlError[];
  filteredOut: {
    total: number;
    byPhase: number;
  };
}

export interface ChangeValidationResults {
  [artifact: string]: ValidationResult | ContextArtifactValidation | undefined;
  contextJsonl?: ContextArtifactValidation;
}

/** Read and validate one context.jsonl artifact for a workflow phase. */
export function validateContextJsonlFile(
  contextPath: string,
  bpDir: string,
  currentPhase: 'plan' | 'apply' | 'check' | 'archive',
): ContextArtifactValidation {
  const parsed = parseContextJsonl(readFileSync(contextPath, 'utf-8'));
  const checked = validateContextJsonl(parsed.rows, { bpDir, currentPhase });
  const errors = [...parsed.errors, ...checked.errors].sort((left, right) => left.line - right.line);
  return {
    valid: errors.length === 0,
    rows: checked.rows,
    errors,
    filteredOut: checked.filteredOut,
  };
}

function loadContextJsonlValidation(
  contextPath: string,
  bpDir: string,
): ContextArtifactValidation | undefined {
  if (!existsSync(contextPath)) return undefined;
  return validateContextJsonlFile(contextPath, bpDir, 'plan');
}

/** Check if a file has any unreplaced template placeholders */
export function hasPlaceholders(content: string): boolean {
  return /\{\{[^}]+\}\}/.test(content);
}

/** Check if a file has a specific markdown section */
export function hasSection(content: string, sectionPattern: string): boolean {
  const regex = new RegExp(`^##\\s+${sectionPattern}`, 'm');
  return regex.test(content);
}

/** Validate proposal.md */
export function validateProposal(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (hasPlaceholders(content)) {
    errors.push('Unreplaced template placeholders ({{...}}) found');
  }
  if (!hasSection(content, 'Intent')) {
    errors.push('Missing ## Intent section');
  }
  if (!hasSection(content, 'Scope')) {
    errors.push('Missing ## Scope section');
  }
  if (!hasSection(content, 'Deliverables')) {
    errors.push('Missing ## Deliverables section');
  }

  // Check for PR-N deliverables
  if (!/###\s+PR-\d+/.test(content)) {
    warnings.push('No PR-N deliverables found in ## Deliverables');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ── Helpers for design quality checks ────────────────

/** Extract the content of a named ## section from markdown. */
function getSectionBody(content: string, sectionName: string): string | undefined {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^## ${escaped}\\n([\\s\\S]*?)(?=\\n## |\\n*$)`, 'm');
  const match = content.match(regex);
  return match?.[1]?.trim();
}

/** Extract individual DS-N blocks from a section body. */
function extractDSBlocks(section: string): string[] {
  const parts = section.split(/(?=### DS-\d+:)/);
  return parts.filter((p) => /^### DS-\d+:/.test(p.trim())).map((p) => p.trim());
}

/** Extract individual D-N blocks from a section body. */
function extractDNBlocks(section: string): string[] {
  const parts = section.split(/(?=### D-\d+:)/);
  return parts.filter((p) => /^### D-\d+:/.test(p.trim())).map((p) => p.trim());
}

/** Check whether a DS-N field has been filled (not template placeholder). */
function fieldHasContent(block: string, fieldName: string): boolean {
  const regex = new RegExp(`- \\*\\*${fieldName}\\*\\*:\\s*(\\S.*)`);
  const match = block.match(regex);
  if (!match) return false;
  return !/^\{\{.*\}\}\s*$/.test(match[1].trim());
}

/** Extract the DS-N name from a block heading. */
function dsName(block: string): string {
  return block.match(/^### (DS-\d+):\s*(.*)/)?.[1] ?? '(unknown)';
}

/** Extract the D-N name from a block heading. */
function dName(block: string): string {
  return block.match(/^### (D-\d+):\s*(.*)/)?.[1] ?? '(unknown)';
}

/** Validate design.md */
export function validateDesign(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (hasPlaceholders(content)) {
    errors.push('Unreplaced template placeholders ({{...}}) found');
  }
  if (!hasSection(content, 'Design Items')) {
    errors.push('Missing ## Design Items section');
  }
  if (!hasSection(content, 'Architecture Decisions')) {
    warnings.push('Missing ## Architecture Decisions section');
  }
  if (!hasSection(content, 'Technical Approach')) {
    errors.push('Missing ## Technical Approach section');
  }
  if (!hasSection(content, 'File Manifest')) {
    errors.push('Missing ## File Manifest section');
  }

  // ── DS-N quality checks ──────────────────────────────
  const designItemsSection = getSectionBody(content, 'Design Items');
  const dsBlocks = designItemsSection ? extractDSBlocks(designItemsSection) : [];

  if (dsBlocks.length === 0) {
    warnings.push('No DS-N design items found');
  }

  for (const block of dsBlocks) {
    const name = dsName(block);

    // Requirements field
    if (!fieldHasContent(block, 'Requirements')) {
      if (/- \*\*Requirements\*\*:\s*$/.test(block) || /- \*\*Requirements\*\*:\s*\{\{/.test(block)) {
        errors.push(`DS-N ${name}: Requirements field is empty or still a template placeholder — must specify observable behaviors`);
      } else {
        errors.push(`DS-N ${name}: Requirements field is missing — every DS-N must have Requirements`);
      }
    }

    // Constraints field
    if (!fieldHasContent(block, 'Constraints')) {
      warnings.push(`DS-N ${name}: Constraints field is empty or still a template placeholder — should specify hard limits`);
    }

    // Acceptance Criteria field
    if (!fieldHasContent(block, 'Acceptance Criteria')) {
      if (/- \*\*Acceptance Criteria\*\*:\s*$/.test(block) || /- \*\*Acceptance Criteria\*\*:\s*\{\{/.test(block)) {
        errors.push(`DS-N ${name}: Acceptance Criteria is empty or still a template placeholder — must define binary pass/fail criteria`);
      } else {
        errors.push(`DS-N ${name}: Acceptance Criteria field is missing — every DS-N must have Acceptance Criteria`);
      }
    }

    // Key Interfaces field
    if (!fieldHasContent(block, 'Key Interfaces')) {
      warnings.push(`DS-N ${name}: Key Interfaces field is empty or still a template placeholder — should describe public interface`);
    }

    // Source traceability: must reference PR-N
    if (!/Source:\s*PR-\d+/i.test(block)) {
      warnings.push(`DS-N ${name}: missing Source: PR-N traceability back to proposal`);
    }

    // Detailed Design quality
    if (!/^#### Detailed Design$/m.test(block)) {
      errors.push(`DS-N ${name}: missing #### Detailed Design section — this is REQUIRED for executor guidance`);
    } else {
      const ddMatch = block.match(/^#### Detailed Design\n([\s\S]*)$/m);
      if (ddMatch) {
        const ddContent = ddMatch[1].replace(/<!--[\s\S]*?-->/g, '').trim();
        if (!ddContent || ddContent === '{{detailed-design}}') {
          errors.push(`DS-N ${name}: Detailed Design section is empty — must provide implementation-level detail`);
        } else if (ddContent.length < 50) {
          warnings.push(`DS-N ${name}: Detailed Design section is very short (${ddContent.length} chars) — may lack sufficient implementation detail`);
        }
      }
    }
  }

  // ── D-N decision quality checks ──────────────────────
  const decisionsSection = getSectionBody(content, 'Architecture Decisions');
  const dnBlocks = decisionsSection ? extractDNBlocks(decisionsSection) : [];

  for (const block of dnBlocks) {
    const name = dName(block);

    // Check alternatives are genuinely considered
    const altMatch = block.match(/- \*\*Alternatives\*\*:\s*(.*)/);
    if (altMatch) {
      const altValue = altMatch[1].trim();
      if (/^\{\{.*\}\}$/.test(altValue)) {
        warnings.push(`D-N ${name}: Alternatives field is still a template placeholder — should list genuinely considered alternatives`);
      } else if (/^(N\/A|n\/a|None|none|TBD|tbd|Not applicable|No alternatives considered)$/i.test(altValue)) {
        warnings.push(`D-N ${name}: Alternatives is "${altValue}" — if no real alternatives exist, consider whether this decision is worth recording`);
      }
    } else {
      warnings.push(`D-N ${name}: missing Alternatives field — each decision should document what else was considered`);
    }

    // Check Decision has content
    if (!fieldHasContent(block, 'Decision')) {
      warnings.push(`D-N ${name}: Decision field is empty or template placeholder`);
    }

    // Check Reason has content
    if (!fieldHasContent(block, 'Reason')) {
      warnings.push(`D-N ${name}: Reason field is empty or template placeholder — must include the driving constraint or tradeoff`);
    }
  }

  // ── Architecture Diagram quality ─────────────────────
  const techSection = getSectionBody(content, 'Technical Approach');
  if (techSection) {
    if (techSection.includes('{{architecture-diagram}}')) {
      warnings.push('Architecture Diagram is still a template placeholder — should show component relationships and data flow');
    }

    // ── Interface Design quality ─────────────────--------
    // Check if Interface Design subsections exist and include error responses
    const interfaceSection = techSection.match(/^### Interface Design\n([\s\S]*?)(?=\n## |\n$)/m);
    if (interfaceSection) {
      const ifaceContent = interfaceSection[1].trim();
      if (ifaceContent && ifaceContent !== 'No external interfaces.') {
        // Has interface definitions — check for error responses
        const hasErrorResponses = /\*\*Response\s+4\d\d\*\*/.test(ifaceContent) || /error/i.test(ifaceContent);
        if (!hasErrorResponses) {
          warnings.push('Interface Design defines endpoints but no error responses (4xx/5xx) found — interfaces should include error handling');
        }
      }
    }
  }

  // ── File Manifest quality ────────────────────────────
  const manifestSection = getSectionBody(content, 'File Manifest');
  if (manifestSection) {
    const manifestLines = manifestSection.split('\n').filter((l) => l.trim().startsWith('|') && l.includes('|'));
    // Count actual entries (skip header/separator rows)
    const entryRows = manifestLines.filter(
      (l) => !/^\| File Path \|/.test(l) && !/^\|[- ]+\|/.test(l),
    );
    if (entryRows.length === 0) {
      warnings.push('File Manifest has no file entries — must list every file to be created or modified');
    }

    if (/\b(e\.?t\.?c\.?|and\s+other\s+files)\b/i.test(manifestSection)) {
      warnings.push('File Manifest contains "etc." or "and other files" — manifest must be complete, no implicit entries');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Validate tasks.md */
export function validateTasks(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (hasPlaceholders(content)) {
    errors.push('Unreplaced template placeholders ({{...}}) found');
  }
  if (!hasSection(content, 'Wave')) {
    errors.push('Missing ## Wave section');
  }

  // Check for T-N tasks
  if (!/- \[[ x]\]\s+T-\d+/.test(content)) {
    errors.push('No T-N tasks found');
  }

  // Check that behavior tasks have spec_ref
  const behaviorTasks = content.match(/- \[[ x]\] T-\d+:\s*\[type:behavior\][\s\S]*?(?=- \[|\n## |$)/g);
  if (behaviorTasks) {
    for (const task of behaviorTasks) {
      if (!task.includes('spec_ref:')) {
        warnings.push('Behavior task missing spec_ref');
      }
      if (!task.includes('RED:')) {
        warnings.push('Behavior task missing RED description');
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Validate delta spec (specs/<domain>/spec.md) */
export function validateDeltaSpec(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (hasPlaceholders(content)) {
    errors.push('Unreplaced template placeholders ({{...}}) found');
  }

  // Must have at least one delta section
  const hasAdded = hasSection(content, 'ADDED Requirements');
  const hasModified = hasSection(content, 'MODIFIED Requirements');
  const hasRemoved = hasSection(content, 'REMOVED Requirements');

  if (!hasAdded && !hasModified && !hasRemoved) {
    errors.push('Missing delta sections (ADDED/MODIFIED/REMOVED Requirements)');
  }

  // Check for SHALL/MUST keywords in requirements
  if (!/\b(SHALL|MUST|SHOULD|MAY)\b/.test(content)) {
    warnings.push('No RFC 2119 keywords (SHALL/MUST/SHOULD/MAY) found');
  }

  // Every Requirement block MUST have at least one Scenario block.
  // Split content into Requirement blocks and check each has #### Scenario:.
  const requirementBlocks = content.match(/^### Requirement:.*$(?:\n(?!### (?:Requirement:|MODIFIED|REMOVED)).*)*/gm);
  if (requirementBlocks) {
    for (const block of requirementBlocks) {
      const reqName = block.match(/^### Requirement:\s*(.*)$/m)?.[1] ?? '(unknown)';
      if (!/^#### Scenario:/m.test(block)) {
        errors.push(`Requirement "${reqName}" has no Scenario block — every Requirement MUST have at least one #### Scenario: block`);
      }
    }
  }

  // Scenarios MUST use bolded keywords (**GIVEN**/**WHEN**/**THEN**), not plain.
  // Plain unbolded keywords (line starting with "- GIVEN") are a formatting error.
  const plainKeywordLines = content.match(/^\s*-\s+(GIVEN|WHEN|THEN|AND|BUT)\s/m);
  if (plainKeywordLines) {
    errors.push('Scenario steps must use bolded keywords (**GIVEN**, **WHEN**, **THEN**) — plain unbolded keywords found');
  }

  // File-level check: must have at least one scenario somewhere
  if (!/\*\*GIVEN\*\*/.test(content)) {
    errors.push('No **GIVEN** scenarios found — every Requirement requires at least one Scenario with **GIVEN**/**WHEN**/**THEN**');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Validate review.md */
export function validateReview(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!hasSection(content, 'Overall Verdict')) {
    errors.push('Missing ## Overall Verdict section');
  }
  if (!hasSection(content, 'Spec Review')) {
    errors.push('Missing ## Spec Review section');
  }
  if (!hasSection(content, 'Quality Review')) {
    errors.push('Missing ## Quality Review section');
  }
  if (!hasSection(content, 'Goal Review')) {
    errors.push('Missing ## Goal Review section');
  }

  // Check verdict is set
  const verdictMatch = content.match(/## Overall Verdict:\s*\**\s*(PASS|FAIL|NEEDS_REVISION)/i);
  if (!verdictMatch) {
    warnings.push('Overall Verdict not set (should be PASS, FAIL, or NEEDS_REVISION)');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Validate an artifact file by type */
export function validateArtifact(
  type: string,
  content: string,
): ValidationResult {
  switch (type) {
    case 'proposal':
      return validateProposal(content);
    case 'design':
      return validateDesign(content);
    case 'tasks':
      return validateTasks(content);
    case 'spec':
      return validateDeltaSpec(content);
    case 'review':
      return validateReview(content);
    default:
      return { valid: true, errors: [], warnings: [] };
  }
}

/** Validate all artifacts in a change directory */
export function validateChange(bpDir: string, changeName: string): ChangeValidationResults {
  const dir = join(bpDir, 'changes', changeName);
  const results: ChangeValidationResults = {};

  const files: { name: string; type: string; path: string }[] = [
    { name: 'proposal', type: 'proposal', path: join(dir, 'proposal.md') },
    { name: 'design', type: 'design', path: join(dir, 'design.md') },
    { name: 'tasks', type: 'tasks', path: join(dir, 'tasks.md') },
    { name: 'review', type: 'review', path: join(dir, 'review.md') },
  ];

  for (const file of files) {
    if (existsSync(file.path)) {
      const content = readFileSync(file.path, 'utf-8');
      results[file.name] = validateArtifact(file.type, content);
    }
  }

  const contextPath = join(dir, 'context.jsonl');
  const contextValidation = loadContextJsonlValidation(contextPath, bpDir);
  if (contextValidation) results.contextJsonl = contextValidation;
  // Validate delta specs
  const specsDir = join(dir, 'specs');
  if (existsSync(specsDir)) {
    for (const domain of readdirSync(specsDir, { withFileTypes: true })) {
      if (domain.isDirectory()) {
        const specPath = join(specsDir, domain.name, 'spec.md');
        if (existsSync(specPath)) {
          const content = readFileSync(specPath, 'utf-8');
          results[`specs/${domain.name}`] = validateDeltaSpec(content);
        }
      }
    }
  }

  return results;
}
