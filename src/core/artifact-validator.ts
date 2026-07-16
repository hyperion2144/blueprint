/**
 * v2 artifact-validator - lightweight regex-based validation
 * Replaces PEG grammar validation with simple structural checks.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
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

  // Check for DS-N items
  if (!/###\s+DS-\d+/.test(content)) {
    warnings.push('No DS-N design items found');
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

  // Check for scenarios (Given/When/Then)
  if (!/\b(GIVEN|WHEN|THEN)\b/.test(content)) {
    warnings.push('No Given/When/Then scenarios found');
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
  const verdictMatch = content.match(/## Overall Verdict:\s*(PASS|FAIL|NEEDS_REVISION)/i);
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
export function validateChange(bpDir: string, changeName: string): { [artifact: string]: ValidationResult } {
  const dir = join(bpDir, 'changes', changeName);
  const results: { [artifact: string]: ValidationResult } = {};

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

  // Validate delta specs
  const specsDir = join(dir, 'specs');
  if (existsSync(specsDir)) {
    const { readdirSync } = require('node:fs');
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
