/**
 * Document validation engine
 * 
 * Parses documents with PEG grammars and validates:
 * - FORM: syntax correctness
 * - FILL: required fields present, no template placeholders
 * - ENUM: status/type values in allowed set
 * - REFS: cross-references exist in linked documents
 * - COVERAGE: no orphan references (PR→DS→T chain complete)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const _require = createRequire(__filename);
// ── Types ──────────────────────────────────────────────────────────

export interface SectionRef {
  prefix: string; // "FR-", "D-", "PR-", "DS-"
  id: number;
  title: string;
  status?: string;
}

export interface TaskItem {
  id: string;         // "T-1"
  type: string;
  title: string;
  refs: string[];     // ["DS-1"]
  spec_ref?: string;
  files: string;
  checked: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  line?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  ast?: any;
}

// ── Grammar loader ─────────────────────────────────────────────────

type Parser = {
  parse(input: string, options?: any): any;
};

const grammarCache = new Map<string, Parser>();
function loadGrammar(name: string): Parser | null {
  if (grammarCache.has(name)) return grammarCache.get(name)!;
  try {
    const mod: { parse: (input: string) => any } = _require(`./grammar/${name}.cjs`);
    grammarCache.set(name, mod);
    return mod;
  } catch {
    return null;
  }
}

// ── 4-Dimension validation ─────────────────────────────────────────

export function parseAndValidate(
  type: string,
  content: string,
  context?: {
    requirementsMd?: string;
    contextMd?: string;
    proposalMd?: string;
    designMd?: string;
    tasksMd?: string;
    phaseDir?: string;
  },
): ValidationResult {
  const grammarName = grammarMap[type];
  if (!grammarName) return { valid: true, errors: [] }; // no grammar defined

  const parser = loadGrammar(grammarName);
  if (!parser) return { valid: true, errors: [] }; // grammar not yet written

  const errors: ValidationError[] = [];

  // 1. FORM — syntax check
  let ast: any;
  try {
    ast = parser.parse(content);
  } catch (e: any) {
    const loc = e.location?.start;
    errors.push({
      field: 'form',
      message: `Parse error at line ${loc?.line ?? '?'}: ${e.message}`,
      line: loc?.line,
    });
    return { valid: false, errors };
  }

  // 2. FILL — no template placeholders
  if (/\\{\\{/.test(content)) {
    errors.push({ field: 'fill', message: 'File contains unfilled template placeholders ({{...}})' });
  }

  // 3 & 4 — type-specific checks
  switch (type) {
    case 'requirements':
      errors.push(...checkRequirements(ast, content));
      break;
    case 'context':
      errors.push(...checkContext(ast, content));
      break;
    case 'proposal':
      errors.push(...checkProposal(ast, content, context));
      break;
    case 'design':
      errors.push(...checkDesign(ast, content, context));
      break;
    case 'tasks':
      errors.push(...checkTasks(ast, content, context));
      break;
    case 'spec-review':
      errors.push(...checkReviewNumbering(ast, 'R'));
      if (!/\| R\d+ \|/.test(content)) {
        errors.push({ field: 'fill', message: 'Constraint Checklist has no data rows. Add at least one "| R1 | ..." row.' });
      }
      break;
    case 'quality-review':
      errors.push(...checkReviewNumbering(ast, 'Q'));
      if (!/\| Q\d+ \|/.test(content)) {
        errors.push({ field: 'fill', message: 'Issues table has no data rows. Add at least one "| Q1 | ..." row.' });
      }
      break;
    case 'goal-review':
      errors.push(...checkReviewNumbering(ast, 'G'));
      if (!/\| G\d+ \|/.test(content)) {
        errors.push({ field: 'fill', message: 'Goal Checklist has no data rows. Add at least one "| G1 | ..." row.' });
      }
      if (!/## Completeness Assessment/.test(content)) {
        errors.push({ field: 'fill', message: 'Missing required section "## Completeness Assessment" in goal review.' });
      }
      break;
    case 'verification':
      errors.push(...checkVerification(ast, content));
      break;
    case 'roadmap':
      errors.push(...checkRoadmap(ast, content));
      break;
    case 'research-summary':
      errors.push(...checkResearchSummary(ast, content));
      break;
    case 'phase-research':
      errors.push(...checkPhaseResearch(ast, content));
      break;
    case 'change-summary':
      errors.push(...checkChangeSummary(ast, content));
      break;
  }

  return { valid: errors.length === 0, errors, ast };
}

// ── Type-specific checks ───────────────────────────────────────────

function checkRequirements(ast: any, content: string): ValidationError[] {
  const errs: ValidationError[] = [];
  if (!ast?.sections || ast.sections.length === 0) {
    errs.push({ field: 'fill', message: 'No requirements found (missing FR-/NFR- sections)' });
  }
  // Sequential FR/NFR numbering
  const frIds: number[] = [];
  const nfrIds: number[] = [];
  for (const s of ast.sections || []) {
    if (!s.title || s.title.length === 0) {
      errs.push({ field: 'fill', message: `${s.prefix}${s.id}: title is empty` });
    }
    if (s.prefix === 'FR-') frIds.push(s.id);
    else if (s.prefix === 'NFR-') nfrIds.push(s.id);
    if (s.status && !['CURRENT', 'COMPLETED', 'PENDING'].includes(s.status)) {
      errs.push({ field: 'enum', message: `${s.prefix}${s.id}: status must be CURRENT/COMPLETED/PENDING, got "${s.status}"` });
    }
  }
  for (let i = 0; i < frIds.length; i++) {
    if (frIds[i] !== i + 1) {
      errs.push({ field: 'numbering', message: `FR-${frIds[i]}: expected FR-${i + 1} (sequential numbering required)` });
      break;
    }
  }
  for (let i = 0; i < nfrIds.length; i++) {
    if (nfrIds[i] !== i + 1) {
      errs.push({ field: 'numbering', message: `NFR-${nfrIds[i]}: expected NFR-${i + 1} (sequential numbering required)` });
      break;
    }
  }
  return errs;
}

function checkContext(ast: any, content: string): ValidationError[] {
  const errs: ValidationError[] = [];
  if (!ast?.decisions || ast.decisions.length === 0) {
    errs.push({ field: 'fill', message: 'No decisions found (missing D- sections)' });
  }
  // Sequential D numbering
  const dIds: number[] = [];
  for (const d of ast.decisions || []) {
    dIds.push(d.id);
    if (!['ACCEPTED', 'REJECTED', 'DEFERRED'].includes(d.status)) {
      errs.push({ field: 'enum', message: `D-${d.id}: status must be ACCEPTED/REJECTED/DEFERRED, got "${d.status}"` });
    }
  }
  for (let i = 0; i < dIds.length; i++) {
    if (dIds[i] !== i + 1) {
      errs.push({ field: 'numbering', message: `D-${dIds[i]}: expected D-${i + 1} (sequential numbering required)` });
      break;
    }
  }
  return errs;
}

function checkProposal(ast: any, content: string, context?: any): ValidationError[] {
  const errs: ValidationError[] = [];
  if (!ast?.deliverables || ast.deliverables.length === 0) {
    errs.push({ field: 'fill', message: 'No deliverables found (missing PR- items in ## Deliverables)' });
  }
  // Sequential PR numbering
  const prIds = (ast?.deliverables || []).map((p: any) => p.id);
  for (let i = 0; i < prIds.length; i++) {
    if (prIds[i] !== i + 1) {
      errs.push({ field: 'numbering', message: `PR-${prIds[i]}: expected PR-${i + 1} (sequential numbering required)` });
      break;
    }
  }
  for (const pr of ast.deliverables || []) {
    // Source: FR-{id} (bp/requirements.md) or Source: D-{id} (context.md)
    const desc = (pr.description || '') + (pr.title || '');
    if (!/Source:\s*(FR-\d+|D-\d+|NFR-\d+)\s*\(/.test(desc)) {
      errs.push({ field: 'refs', message: `PR-${pr.id}: missing Source: annotation (e.g. Source: FR-1 (bp/requirements.md))` });
    }
    // PR must reference at least one requirement/decision (phase changes only)
    // Adhoc changes have no requirements context, so refs are optional
    if (context && (!pr.refs || pr.refs.length === 0)) {
      errs.push({ field: 'refs', message: `PR-${pr.id}: no refs found. Add refs: FR-{id} or refs: D-{id} to the item line.` });
    }
    // REFS: FR/NFR/D ids exist in requirements/context
    for (const ref of pr.refs || []) {
      if (ref.startsWith('FR-') || ref.startsWith('NFR-')) {
        if (context?.requirementsMd) {
          // Check for FR-N: or FR-N in any format (list item or heading)
          const found = context.requirementsMd.includes(` ${ref}:`) || context.requirementsMd.includes(`## ${ref}:`);
          if (!found) errs.push({ field: 'refs', message: `PR-${pr.id} refs ${ref} not found in requirements.md` });
        }
      } else if (ref.startsWith('D-')) {
        if (context?.contextMd) {
          const found = context.contextMd.includes(`## ${ref}:`);
          if (!found) errs.push({ field: 'refs', message: `PR-${pr.id} refs ${ref} not found in context.md` });
        }
      }
    }
  }
  return errs;
}

function checkDesign(ast: any, content: string, context?: any): ValidationError[] {
  const errs: ValidationError[] = [];
  if (!ast?.items || ast.items.length === 0) {
    errs.push({ field: 'fill', message: 'No design items found (missing DS- in ## Design Items)' });
  }
  // Sequential DS numbering
  const dsIds = (ast?.items || []).map((d: any) => d.id);
  for (let i = 0; i < dsIds.length; i++) {
    if (dsIds[i] !== i + 1) {
      errs.push({ field: 'numbering', message: `DS-${dsIds[i]}: expected DS-${i + 1} (sequential numbering required)` });
      break;
    }
  }
  const proposalRefs: string[] = [];
  if (context?.proposalMd) {
    const prop = parseAndValidate('proposal', context.proposalMd);
    if (prop.ast?.deliverables) {
      for (const pr of prop.ast.deliverables) proposalRefs.push(`PR-${pr.id}`);
    }
  }
  for (const ds of ast.items || []) {
    // Source: PR-{id} (proposal.md)
    const desc = (ds.description || '') + (ds.title || '');
    if (!/Source:\s*PR-\d+\s*\(/.test(desc)) {
      errs.push({ field: 'refs', message: `DS-${ds.id}: missing Source: annotation (e.g. Source: PR-1 (proposal.md))` });
    }
    // REFS: PR-N exists in proposal
    for (const ref of ds.refs || []) {
      if (ref.startsWith('PR-') && proposalRefs.length > 0 && !proposalRefs.includes(ref)) {
        errs.push({ field: 'refs', message: `DS-${ds.id} refs ${ref} not found in proposal.md` });
      }
    }
    if (!ds.title || ds.title.length === 0) {
      errs.push({ field: 'fill', message: `DS-${ds.id}: title is empty` });
    }
  }
  return errs;
}

function checkTasks(ast: any, content: string, context?: any): ValidationError[] {
  const errs: ValidationError[] = [];
  if (!ast?.tasks || ast.tasks.length === 0) {
    errs.push({ field: 'fill', message: 'No tasks found (missing T- items with checkboxes)' });
  }
  // Sequential T numbering
  const tIds = (ast?.tasks || []).map((t: any) => t.id);
  for (let i = 0; i < tIds.length; i++) {
    if (tIds[i] !== i + 1) {
      errs.push({ field: 'numbering', message: `T-${tIds[i]}: expected T-${i + 1} (sequential numbering required)` });
      break;
    }
  }
  const designRefs: string[] = [];
  if (context?.designMd) {
    const des = parseAndValidate('design', context.designMd);
    if (des.ast?.items) {
      for (const ds of des.ast.items) designRefs.push(`DS-${ds.id}`);
    }
  }
  for (const t of ast.tasks || []) {
    const f = t.fields || {};
    const refs = typeof f.refs === 'string' ? [f.refs] : (f.refs || []);
    if (!['behavior', 'config', 'refactor', 'docs', 'scaffolding'].includes(t.type)) {
      errs.push({ field: 'enum', message: `T-${t.id}: type must be behavior/config/refactor/docs/scaffolding, got "${t.type}"` });
    }
    // Validate refs format
    if (refs.length > 0) {
      for (const ref of refs) {
        // Check if ref starts with DS-N numeric pattern
        const isDsNumeric = /^DS-\d+$/.test(ref);
        if (isDsNumeric) {
          // Valid DS-N format — check if exists in design (when design context available)
          if (designRefs.length > 0 && !designRefs.includes(ref)) {
            errs.push({ field: 'refs', message: `T-${t.id} refs ${ref} not found in design.md` });
          }
        } else if (ref.startsWith('DS-')) {
          // DS-prefixed but non-numeric (e.g. DS-X)
          errs.push({ field: 'refs', message: `T-${t.id}: refs must match DS-N format (numeric ID), got "${ref}"` });
        } else if (!ref.startsWith('DS')) {
          // Doesn't start with DS at all (e.g. PR-1, XYZ)
          errs.push({ field: 'refs', message: `T-${t.id}: refs must start with DS-N, got "${ref}"` });
        }
      }
    } else {
      errs.push({ field: 'refs', message: `T-${t.id}: missing refs field` });
    }
    if (t.type === 'behavior' && !f.spec_ref) {
      errs.push({ field: 'refs', message: `T-${t.id}: behavior type requires spec_ref` });
    }
    if (typeof f.files === 'string' && f.files.trim().length === 0) {
      errs.push({ field: 'fill', message: `T-${t.id}: files field is empty` });
    } else if (!f.files) {
      errs.push({ field: 'fill', message: `T-${t.id}: missing files field` });
    } else if (typeof f.files === 'string') {
      // File path format validation
      const paths = f.files.split(',').map((p: string) => p.trim()).filter(Boolean);
      for (const p of paths) {
        if (p.startsWith('/')) {
          errs.push({ field: 'files', message: `T-${t.id}: file path "${p}" must be relative, not absolute` });
        } else if (/\s/.test(p)) {
          errs.push({ field: 'files', message: `T-${t.id}: file path "${p}" contains spaces - use hyphens` });
        }
      }
    }
    if (typeof f.acceptance === 'string' && f.acceptance.trim().length === 0) {
      errs.push({ field: 'fill', message: `T-${t.id}: acceptance field is empty` });
    } else if (!f.acceptance) {
      errs.push({ field: 'fill', message: `T-${t.id}: missing acceptance field` });
    }
  }
  return errs;
}

function checkVerification(ast: any, content: string): ValidationError[] {
  const errs: ValidationError[] = [];
  const statusMatch = content.match(/## Status:\s*(\S+)/);
  if (!statusMatch || !['passed', 'gaps_found', 'human_needed'].includes(statusMatch[1])) {
    errs.push({ field: 'enum', message: 'Status must be passed/gaps_found/human_needed' });
  }
  return errs;
}

function checkRoadmap(ast: any, content: string): ValidationError[] {
  const errs: ValidationError[] = [];
  if (!ast?.milestones || ast.milestones.length === 0) {
    errs.push({ field: 'fill', message: 'No milestones found' });
  }
  // Md sequential numbering
  const mdIds = (ast?.milestones || []).map((m: any) => m.id);
  for (let i = 0; i < mdIds.length; i++) {
    if (mdIds[i] !== i + 1) {
      errs.push({ field: 'numbering', message: `Md-${mdIds[i]}: expected Md-${i + 1} (sequential numbering required)` });
      break;
    }
  }
  for (const m of ast.milestones || []) {
    if (!['NOT_STARTED', 'ACTIVE', 'COMPLETED'].includes(m.status)) {
      errs.push({ field: 'enum', message: `Md-${m.id}: status must be NOT_STARTED/ACTIVE/COMPLETED` });
    }
    // Ph sequential numbering within milestone
    const phIds = (m.phases || []).map((p: any) => parseInt(p.id.split('.')[1] ?? '0'));
    for (let i = 0; i < phIds.length; i++) {
      if (phIds[i] !== i + 1) {
        errs.push({ field: 'numbering', message: `Ph-${m.id}.${phIds[i]}: expected Ph-${m.id}.${i + 1} (sequential numbering required)` });
        break;
      }
    }
    for (const p of m.phases || []) {
      if (!['NOT_STARTED', 'ACTIVE', 'COMPLETED'].includes(p.status)) {
        errs.push({ field: 'enum', message: `Ph-${m.id}.${p.id}: status must be NOT_STARTED/ACTIVE/COMPLETED` });
      }
    }
  }
  return errs;
}

function checkReviewNumbering(ast: any, prefix: string): ValidationError[] {
  const errs: ValidationError[] = [];
  const issues = ast?.issues || [];
  for (const issue of issues) {
    if (!issue.id) continue;
    const idStr = String(issue.id);
    if (!idStr.startsWith(prefix)) continue;
    const num = parseInt(idStr.slice(prefix.length));
    if (isNaN(num)) {
      errs.push({ field: 'numbering', message: `${issue.id}: id must be numeric after ${prefix}` });
    }
  }
  // Sequential numbering: extract numbers and check
 const numbers: number[] = [];
  for (const issue of issues) {
    if (!issue.id) continue;
    const idStr = String(issue.id);
    if (!idStr.startsWith(prefix)) continue;
    const num = parseInt(idStr.slice(prefix.length));
    if (!isNaN(num)) numbers.push(num);
  }
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] !== i + 1) {
      errs.push({ field: 'numbering', message: `${prefix}${numbers[i]}: expected ${prefix}${i + 1} (sequential numbering required)` });
      break;
    }
  }
  return errs;
}

function checkResearchSummary(ast: any, content: string): ValidationError[] {
  const errs: ValidationError[] = [];
  if (!ast?.recommendation || ast.recommendation.trim().length === 0) {
    errs.push({ field: 'fill', message: 'Missing ## Recommendation section (or empty)' });
  }
  if (!ast?.rationale || ast.rationale.trim().length === 0) {
    errs.push({ field: 'fill', message: 'Missing ## Rationale section (or empty)' });
  }
  return errs;
}

function checkPhaseResearch(ast: any, content: string): ValidationError[] {
  const errs: ValidationError[] = [];
  if (!ast?.scope || ast.scope.trim().length === 0) {
    errs.push({ field: 'fill', message: 'Missing ## Research Scope section (or empty)' });
  }
  if (!ast?.recommendation || ast.recommendation.trim().length === 0) {
    errs.push({ field: 'fill', message: 'Missing ## Recommendation section (or empty)' });
  }
  return errs;
}

function checkChangeSummary(ast: any, content: string): ValidationError[] {
  const errs: ValidationError[] = [];
  if (!ast?.intent || ast.intent.trim().length === 0) {
    errs.push({ field: 'fill', message: 'Missing ## Intent section (or empty)' });
  }
  if (!ast?.commits || ast.commits.length === 0) {
    errs.push({ field: 'fill', message: 'Missing ## Commits section (or empty) or no commits listed' });
  }
  if (!ast?.files || ast.files.length === 0) {
    errs.push({ field: 'fill', message: 'Missing ## Output Files section (or empty) or no files listed' });
  }
  return errs;
}

// ── Coverage checks ────────────────────────────────────────────────

export interface ParsedProposal {
  deliverables: Array<{ id: string; refs: string[] }>;
}

export interface ParsedDesign {
  items: Array<{ id: string; refs: string[] }>;
}

export interface ParsedTasks {
  tasks: Array<{ id: string; refs: string[]; checked: boolean }>;
}

/**
 * Check A/B: PR→DS and DS→T coverage
 * Returns orphan IDs
 */
export function checkCoverage(
  proposalAst: any,
  designAst: any,
  tasksAst: any,
): ValidationError[] {
  const errs: ValidationError[] = [];

  const prIds = new Set<string>((proposalAst?.deliverables || []).map((p: any) => `PR-${p.id}`));
  const dsIds = new Set<string>((designAst?.items || []).map((d: any) => `DS-${d.id}`));
  const tIds = new Set<string>((tasksAst?.tasks || []).map((t: any) => `T-${t.id}`));

  // PRs referenced by DSs
  const prInDs = new Set<string>();
  for (const ds of designAst?.items || []) {
    for (const ref of ds.refs || []) {
      if (ref.startsWith('PR-')) prInDs.add(ref);
    }
  }
  // DSs referenced by tasks
  const dsInT = new Set<string>();
  for (const t of tasksAst?.tasks || []) {
    const refVal = t.fields?.refs;
    const refs = typeof refVal === 'string' ? [refVal] : (refVal || []);
    for (const ref of refs) {
      if (ref.startsWith('DS-')) dsInT.add(ref);
    }
  }

  // Orphan PRs: in proposal but not referenced by any DS
  for (const prId of prIds) {
    if (!prInDs.has(prId)) {
      errs.push({ field: 'coverage', message: `${prId} is not referenced by any Design Item` });
    }
  }

  // Orphan DSs: in design but not referenced by any task
  for (const dsId of dsIds) {
    if (!dsInT.has(dsId)) {
      errs.push({ field: 'coverage', message: `${dsId} is not referenced by any Task` });
    }
  }

  return errs;
}
/**
 * Check D: phase completion — all D-N related tasks must be [x]
 */
export function checkPhaseCompletion(
  phaseDir: string,
): ValidationError[] {
  const errs: ValidationError[] = [];

  // Read context.md for D-N list
  const ctxPath = join(phaseDir, 'context.md');
  if (!existsSync(ctxPath)) return [{ field: 'refs', message: 'context.md not found in phase' }];
  const ctxContent = readFileSync(ctxPath, 'utf-8');
  const dRefs = ctxContent.match(/## (D-\d+):/g) || [];

  // For each D-N, find all proposals that reference it, then check tasks
  for (const dRef of dRefs) {
    const dId = dRef.replace('## ', '').replace(':', '');
    const changesDir = join(phaseDir, 'changes');
    if (!existsSync(changesDir)) continue;

    const changeDirs = require('fs').readdirSync(changesDir, { withFileTypes: true })
      .filter((d: any) => d.isDirectory())
      .map((d: any) => d.name);

    let dCompleted = true;
    const incompleteTasks: string[] = [];

    for (const changeName of changeDirs) {
      const changeDir = join(changesDir, changeName);
      const propPath = join(changeDir, 'proposal.md');
      if (!existsSync(propPath)) continue;
      const propContent = readFileSync(propPath, 'utf-8');

      // Check if this proposal's deliverables reference this D-N
      if (!propContent.includes(dId)) continue;

      // Found a proposal referencing D — check its tasks
      const tasksPath = join(changeDir, 'tasks.md');
      if (!existsSync(tasksPath)) { dCompleted = false; continue; }
      const tasksContent = readFileSync(tasksPath, 'utf-8');
      const taskLines = tasksContent.split('\n');
      let inWave = false;
      for (const line of taskLines) {
        const taskMatch = line.match(/^- \[([ x])\] T-(\d+):/);
        if (taskMatch) {
          if (taskMatch[1] === ' ') {
            dCompleted = false;
            incompleteTasks.push(`change-${changeName} T-${taskMatch[2]}`);
          }
        }
      }
    }

    if (!dCompleted) {
      errs.push({
        field: 'coverage',
        message: `${dId} not completed: ${incompleteTasks.join(', ') || 'no task found'}`,
      });
    }
  }

  return errs;
}

/**
 * Parse a roadmap.md file and return the AST.
 * Used by bp-continue to find the next phase.
 */
export function parseRoadmapFile(roadmapPath: string): { milestones: any[] } | null {
  if (!existsSync(roadmapPath)) return null;
  const parser = loadGrammar('roadmap');
  if (!parser) return null;
  try {
    const content = readFileSync(roadmapPath, 'utf-8');
    return parser.parse(content) as { milestones: any[] };
  } catch {
    return null;
  }
}

// ── Grammar name map ───────────────────────────────────────────────

export const grammarMap: Record<string, string> = {
  'requirements': 'requirements',
  'context': 'context',
  'proposal': 'proposal',
  'design': 'design',
  'tasks': 'tasks',
  'review-task': 'review-task',
  'uat': 'uat',
  'verification': 'verification',
  'spec-review': 'spec-review',
  'quality-review': 'quality-review',
  'goal-review': 'goal-review',
  'roadmap': 'roadmap',
  'research-summary': 'research-summary',
  'phase-research': 'phase-research',
  'change-summary': 'change-summary',
};

