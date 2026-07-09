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
import { join } from 'node:path';

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
    const mod = require(`./grammar/${name}.js`) as { parse: (input: string) => any };
    grammarCache.set(name, mod as any);
    return mod as any;
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
    case 'quality-review':
    case 'goal-review':
      break; // basic FORM + FILL for now
    case 'verification':
      errors.push(...checkVerification(ast, content));
      break;
    case 'roadmap':
      errors.push(...checkRoadmap(ast, content));
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
  for (const s of ast.sections || []) {
    if (!s.title || s.title.length === 0) {
      errs.push({ field: 'fill', message: `${s.prefix}${s.id}: title is empty` });
    }
    if (!['CURRENT', 'COMPLETED', 'PENDING'].includes(s.status)) {
      errs.push({ field: 'enum', message: `${s.prefix}${s.id}: status must be CURRENT/COMPLETED/PENDING, got "${s.status}"` });
    }
  }
  return errs;
}

function checkContext(ast: any, content: string): ValidationError[] {
  const errs: ValidationError[] = [];
  if (!ast?.decisions || ast.decisions.length === 0) {
    errs.push({ field: 'fill', message: 'No decisions found (missing D- sections)' });
  }
  for (const d of ast.decisions || []) {
    if (!['ACCEPTED', 'REJECTED', 'DEFERRED'].includes(d.status)) {
      errs.push({ field: 'enum', message: `D-${d.id}: status must be ACCEPTED/REJECTED/DEFERRED, got "${d.status}"` });
    }
  }
  return errs;
}

function checkProposal(ast: any, content: string, context?: any): ValidationError[] {
  const errs: ValidationError[] = [];
  if (!ast?.deliverables || ast.deliverables.length === 0) {
    errs.push({ field: 'fill', message: 'No deliverables found (missing PR- items in ## Deliverables)' });
  }
  for (const pr of ast.deliverables || []) {
    // REFS: FR/NFR/D ids exist in requirements/context
    for (const ref of pr.refs || []) {
      if (ref.startsWith('FR-') || ref.startsWith('NFR-')) {
        if (context?.requirementsMd) {
          const found = context.requirementsMd.includes(`## ${ref}:`);
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
  const proposalRefs: string[] = [];
  if (context?.proposalMd) {
    const prop = parseAndValidate('proposal', context.proposalMd);
    if (prop.ast?.deliverables) {
      for (const pr of prop.ast.deliverables) proposalRefs.push(`PR-${pr.id}`);
    }
  }
  for (const ds of ast.items || []) {
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
  const designRefs: string[] = [];
  if (context?.designMd) {
    const des = parseAndValidate('design', context.designMd);
    if (des.ast?.items) {
      for (const ds of des.ast.items) designRefs.push(`DS-${ds.id}`);
    }
  }
  for (const t of ast.tasks || []) {
    if (!['behavior', 'config', 'refactor', 'docs', 'scaffolding'].includes(t.type)) {
      errs.push({ field: 'enum', message: `T-${t.id}: type must be behavior/config/refactor/docs/scaffolding, got "${t.type}"` });
    }
    // REFS: DS-N exists in design
    if (t.refs?.length > 0) {
      for (const ref of t.refs) {
        if (ref.startsWith('DS-') && designRefs.length > 0 && !designRefs.includes(ref)) {
          errs.push({ field: 'refs', message: `T-${t.id} refs ${ref} not found in design.md` });
        }
      }
    } else {
      errs.push({ field: 'refs', message: `T-${t.id}: missing refs field` });
    }
    if (t.type === 'behavior' && !t.spec_ref) {
      errs.push({ field: 'refs', message: `T-${t.id}: behavior type requires spec_ref` });
    }
    if (!t.files) {
      errs.push({ field: 'fill', message: `T-${t.id}: missing files field` });
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
  for (const m of ast.milestones || []) {
    if (!['NOT_STARTED', 'ACTIVE', 'COMPLETED'].includes(m.status)) {
      errs.push({ field: 'enum', message: `Md-${m.id}: status must be NOT_STARTED/ACTIVE/COMPLETED` });
    }
    for (const p of m.phases || []) {
      if (!['NOT_STARTED', 'ACTIVE', 'COMPLETED'].includes(p.status)) {
        errs.push({ field: 'enum', message: `Ph-${m.id}.${p.id}: status must be NOT_STARTED/ACTIVE/COMPLETED` });
      }
    }
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

  const prIds = new Set((proposalAst?.deliverables || []).map((p: any) => `PR-${p.id}`));
  const dsIds = new Set((designAst?.items || []).map((d: any) => `DS-${d.id}`));
  const tIds = new Set((tasksAst?.tasks || []).map((t: any) => `T-${t.id}`));

  // PRs referenced by DSs
  const prInDs = new Set<string>();
  for (const ds of designAst?.items || []) {
    for (const ref of ds.refs || []) {
      if (ref.startsWith('PR-')) prInDs.add(ref);
    }
  }

  // Orphan PRs: in proposal but not referenced by any DS
  for (const prId of prIds) {
    if (!prInDs.has(prId)) {
      errs.push({ field: 'coverage', message: `${prId} is not referenced by any Design Item` });
    }
  }

  // DSs referenced by tasks
  const dsInT = new Set<string>();
  for (const t of tasksAst?.tasks || []) {
    for (const ref of t.refs || []) {
      if (ref.startsWith('DS-')) dsInT.add(ref);
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

// ── Grammar name map ───────────────────────────────────────────────

const grammarMap: Record<string, string> = {
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
};
