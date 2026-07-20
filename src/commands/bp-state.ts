/**
 * bp state — derive current project state from roadmap + artifact evidence.
 *
 * Reads bp/roadmap.md to find the active milestone/phase, scans bp/changes/
 * for pending/active work, and returns a machine-parseable JSON object.
 * No state.md, no state machine — pure derivation from what's on disk.
 */

import { type Command } from 'commander';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { findBpDir } from './_utils.js';

/** Regex patterns for roadmap parsing */
const MILESTONE_RE = /^##\s+Milestone:\s+(?<id>\S+)\s*-\s*(?<name>.+?)\s*\[(?<status>\S+)\]\s*$/m;
const PHASE_HEADING_RE = /^###\s+Phase:\s+(?<id>\S+)\s*-\s*(?<name>.+?)\s*\[(?<status>\S+)\]\s*$/gm;
const CHANGE_ITEM_RE = /^-\s*\[(?<done>[ x])\]\s+(?<changeName>\S+)\s+(?<state>archived|proposed|planned|implemented|reviewed)/gm;

export interface StateResult {
  project?: string;
  milestone: {
    id: string;
    name: string;
    status: string;
  } | null;
  phase: {
    id: string;
    name: string;
    status: string;
  } | null;
  pendingChanges: Array<{
    name: string;
    status: string;
  }>;
  activeChange: {
    name: string;
    status: string;
  } | null;
  specDomains: string[];
  status: 'active' | 'no_config' | 'no_roadmap';
  nextAction?: string;
}

export function register(program: Command): void {
  program
    .command('state')
    .description('Derive current project state from roadmap + artifact evidence')
    .option('--json', 'Output as JSON (default: terminal format)')
    .action(stateHandler);
}

function stateHandler(options: { json?: boolean }): void {
  const bpDir = findBpDir() ?? join(process.cwd(), 'bp');
  const result = deriveState(bpDir);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printState(result);
  }
}

/**
 * Derive project state from disk evidence.
 * Pure function — no side effects, no state machine.
 */
export function deriveState(bpDir: string): StateResult {
  const noConfig: StateResult = {
    milestone: null,
    phase: null,
    pendingChanges: [],
    activeChange: null,
    specDomains: [],
    status: 'no_config',
  };

  if (!existsSync(bpDir) || !existsSync(join(bpDir, 'config.yaml'))) {
    return noConfig;
  }

  // Read roadmap
  const roadmapPath = join(bpDir, 'roadmap.md');
  if (!existsSync(roadmapPath)) {
    return { ...noConfig, status: 'no_roadmap' };
  }

  const roadmap = readFileSync(roadmapPath, 'utf-8');

  // Match active milestone (first [ACTIVE] or [IN_PROGRESS] milestone)
  const mileMatch = roadmap.match(MILESTONE_RE);
  const milestone = mileMatch
    ? { id: mileMatch.groups!.id, name: mileMatch.groups!.name.trim(), status: mileMatch.groups!.status }
    : null;

  // Match phases under the active milestone
  // Walk headings in order; find the first non-completed phase under the active milestone
  const phaseMatches = roadmap.matchAll(PHASE_HEADING_RE);
  const phases = Array.from(phaseMatches).map((m) => ({
    id: m.groups!.id,
    name: m.groups!.name.trim(),
    status: m.groups!.status,
    startLine: m.index ?? 0,
  }));

  // Find the first phase that isn't DONE/COMPLETED
  const activePhase = phases.find(
    (p) => p.status !== 'DONE' && p.status !== 'COMPLETED',
  ) ?? null;

  // Parse pending changes for the active phase
  const pendingChanges: Array<{ name: string; status: string }> = [];
  if (activePhase) {
    // Extract the phase's section (from its heading to the next same-level heading)
    const sectionStart = roadmap.indexOf(`### Phase: ${activePhase.id}`);
    const nextSectionOffset = roadmap.indexOf('\n---\n', sectionStart);
    const sectionEnd = nextSectionOffset > sectionStart ? nextSectionOffset : roadmap.length;
    const section = roadmap.slice(sectionStart, Math.min(sectionEnd, sectionStart + 5000));

    const changeMatches = section.matchAll(CHANGE_ITEM_RE);
    for (const cm of changeMatches) {
      const name = cm.groups!.changeName;
      const state = cm.groups!.state;
      if (state !== 'archived') {
        pendingChanges.push({ name, status: state });
      }
    }
  }

  // Detect active change from bp/changes/ directories (non-archive dirs)
  const changesDir = join(bpDir, 'changes');
  let activeChange: StateResult['activeChange'] = null;
  if (existsSync(changesDir)) {
    const entries = readdirSync(changesDir);
    for (const entry of entries) {
      const fullPath = join(changesDir, entry);
      if (entry === 'archive') continue;
      if (!statSync(fullPath).isDirectory()) continue;
      // Check for proposal.md or design.md — means work has started
      if (existsSync(join(fullPath, 'proposal.md')) || existsSync(join(fullPath, 'tasks.md'))) {
        // Determine approximate status from file presence
        let status = 'proposed';
        if (existsSync(join(fullPath, 'review.md'))) status = 'reviewed';
        else if (existsSync(join(fullPath, 'tasks.md'))) status = 'applied';
        else if (existsSync(join(fullPath, 'design.md'))) status = 'planned';
        activeChange = { name: entry, status };
        break; // first active change
      }
    }
  }

  // List spec domains
  const specsDir = join(bpDir, 'specs');
  const specDomains: string[] = [];
  if (existsSync(specsDir)) {
    for (const entry of readdirSync(specsDir)) {
      if (entry.startsWith('.') || entry === 'archive') continue;
      const fullPath = join(specsDir, entry);
      if (statSync(fullPath).isDirectory()) {
        specDomains.push(entry);
      } else if (entry.endsWith('.md') && entry !== 'spec.md') {
        const stem = entry.replace(/\.md$/, '');
        specDomains.push(stem);
      }
    }
  }

  // Determine next action
  let nextAction: string | undefined;
  if (activeChange) {
    if (activeChange.status === 'proposed') nextAction = `bp plan ${activeChange.name}`;
    else if (activeChange.status === 'planned') nextAction = `bp apply ${activeChange.name}`;
    else if (activeChange.status === 'applied') nextAction = `bp review ${activeChange.name}`;
    else if (activeChange.status === 'reviewed') nextAction = `bp archive ${activeChange.name}`;
  } else if (pendingChanges.length > 0) {
    const candidate = pendingChanges[0];
    if (candidate.status === 'proposed') nextAction = `bp propose ${candidate.name}`;
    else if (candidate.status === 'planned') nextAction = `bp plan ${candidate.name}`;
  } else if (activePhase) {
    nextAction = `bp propose <new-change>`;
  }

  return {
    project: 'blueprint',
    milestone,
    phase: activePhase,
    pendingChanges,
    activeChange,
    specDomains,
    status: 'active',
    nextAction,
  };
}

function printState(result: StateResult): void {
  if (result.status === 'no_config') {
    console.log('[bp] No bp config found. Run `bp init`.');
    return;
  }
  if (result.status === 'no_roadmap') {
    console.log('[bp] bp/roadmap.md not found. Create a roadmap first.');
    return;
  }

  if (result.milestone) {
    console.log(`[bp] Milestone: ${result.milestone.id} — ${result.milestone.name} [${result.milestone.status}]`);
  }
  if (result.phase) {
    console.log(`[bp] Phase: ${result.phase.id} — ${result.phase.name} [${result.phase.status}]`);
  }
  if (result.activeChange) {
    console.log(`[bp] Active change: ${result.activeChange.name} [${result.activeChange.status}]`);
  }
  if (result.pendingChanges.length > 0) {
    for (const p of result.pendingChanges) {
      console.log(`[bp] Pending: ${p.name} [${p.status}]`);
    }
  }
  if (result.specDomains.length > 0) {
    console.log(`[bp] Spec domains: ${result.specDomains.join(', ')}`);
  }
  if (result.nextAction) {
    console.log(`[bp] Next: ${result.nextAction}`);
  }
}
