/**
 * bp dispatch <role> — output platform-specific sub-agent dispatch instructions.
 *
 * Each platform integration registers its dispatch format.
 * Templates use this instead of hardcoding platform-specific tool calls.
 */

import { join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { loadConfig, resolveModelsForLevel } from '../core/config.js';
import { shouldDisableDegradation } from '../core/degradation.js';
import { findBpDir } from './_utils.js';
import type { Command } from 'commander';

interface IsolationInfo {
  type: 'auto' | 'param' | 'none';
  /** Spawn tool field name when type=param */
  field?: string;
  /** Field value when type=param */
  fieldValue?: string;
  /** Human description of isolation behavior */
  description: string;
}

/** Platform-specific isolation info for executor role only */
const EXECUTOR_ISOLATION: Record<string, IsolationInfo> = {
  omp: {
    type: 'param',
    field: 'isolated',
    fieldValue: 'true',
    description: 'Pass "isolated: true" per task item — OMP automatically creates an isolated worktree for the sub-agent.',
  },
  'claude-code': {
    type: 'param',
    field: 'worktree',
    fieldValue: '<change>-<wave>',
    description: 'Pass "worktree: <change>-<wave>" — Claude Code automatically creates an isolated worktree at .claude/worktrees/ and cleans up on completion.',
  },
  agent: {
    type: 'none',
    description: 'No built-in isolation. Orchestrator must manually create a git worktree (git worktree add) and include "cd <worktree>" in the sub-agent prompt. Merge back and clean up after completion.',
  },
};

interface DispatchFormat {
  tool: string;
  params: Record<string, string>;
}

/** Agent role -> artifact template IDs for output files */
const ROLE_TEMPLATES: Record<string, string[]> = {
  planner: ['design', 'tasks', 'spec', 'global-spec'],
  executor: [],  // produces code, no artifact templates
  reviewer: ['review'],
};

const FORMATS: Record<string, DispatchFormat> = {
  omp: {
    tool: 'task',
    params: {
      agent: 'bp-<role>',
      role: '<role>',
      assignment: '<prompt>',
    },
  },
  'claude-code': {
    tool: 'agent',
    params: {
      subagent_type: 'bp-<role>',
      prompt: '<prompt>',
    },
  },
  agent: {
    tool: 'task',
    params: {
      agent: 'bp-<role>',
      role: '<role>',
      assignment: '<prompt>',
    },
  },
};

export function register(program: Command): void {
  program
    .command('dispatch <role>')
    .description('Output platform-specific sub-agent dispatch instructions')
    .option('--change <name>', 'change name to pass to the sub-agent')
    .option('--dir <path>', 'bp directory', 'bp')
    .action(dispatchHandler);
}

/** Detect current review round from review.md Review History (v2.1 P2) */
function detectReviewRound(bpDir: string, changeName: string | null): number {
  if (!changeName) return 1;
  const reviewPath = join(bpDir, 'changes', changeName, 'review.md');
  if (!existsSync(reviewPath)) return 1;
  try {
    const content = readFileSync(reviewPath, 'utf-8');
    const rounds = (content.match(/\|\s*(\d+)\s*\|/g) || []).map((m) => parseInt(m.match(/\d+/)![0], 10));
    return rounds.length > 0 ? Math.max(...rounds) : 1;
  } catch { return 1; }
}
function dispatchHandler(role: string, options: { change?: string; dir: string }) {
  const bpDir = findBpDir() ?? join(process.cwd(), options.dir);
  const config = loadConfig(bpDir);
  const platforms: string[] = config.platform || ['omp'];

  for (const platform of platforms) {
    const fmt = FORMATS[platform];
    if (!fmt) continue;

    const changeName = options.change || null;
    const lines: string[] = [];

    lines.push(`## Dispatch: bp-${role} (${platform})`);
    lines.push('');
    lines.push(`Call the \`${fmt.tool}\` tool with these parameters:`);
    lines.push('');

    for (const [key, value] of Object.entries(fmt.params)) {
      const resolved = value.replace('<role>', role);
      lines.push(`  ${key}: ${resolved}`);
    }
    if (changeName) {
      lines.push('  context: Change ' + changeName + ' at bp/changes/' + changeName + '/');
    }
    // Isolation info
    lines.push('');
    lines.push('### Isolation');
    const isolation: IsolationInfo = role === 'executor'
      ? (EXECUTOR_ISOLATION[platform] ?? { type: 'none', description: 'No isolation configured for this platform.' })
      : { type: 'none', description: 'Read-only role — no isolation needed.' };
    if (isolation.type === 'param') {
      lines.push(`- Support: yes`);
      lines.push(`- Type: param`);
      lines.push(`- Mechanism: pass \`${isolation.field}: ${isolation.fieldValue}\` to the \`${fmt.tool}\` tool`);
      lines.push(`- ${isolation.description}`);
    } else if (isolation.type === 'auto') {
      lines.push(`- Support: auto (platform isolates sub-agents by default)`);
      lines.push(`- Type: auto`);
      lines.push(`- ${isolation.description}`);
    } else {
      lines.push(`- Support: no`);
      lines.push(`- Type: none`);
      lines.push(`- Read-only role — no isolation needed.`);
    }

    lines.push('');
    lines.push('The sub-agent reads its own system prompt (see platform agent file).');

    // v2.1 P2: Model selection based on level and review round
    const round = detectReviewRound(bpDir, changeName);
    const models = resolveModelsForLevel(config, config.profile, round);
    const modelForRole = models[role];
    lines.push('');
    lines.push('### Model Selection (v2.1 P2)');
    lines.push(`- Role: ${role}`);
    lines.push(`- Level: ${config.profile}`);
    lines.push(`- Review round: ${round}`);
    if (modelForRole) {
      lines.push(`- Model: ${modelForRole}`);
    }
    // Check if degradation disabled for this role
    if (changeName && shouldDisableDegradation(bpDir, changeName, role)) {
      lines.push(`- ⚠ Degradation disabled for ${role} (2+ failures after downgrade). Use full-strength model.`);
    }
    if (config.profile === 'trivial' || config.profile === 'light') {
      lines.push(`- All roles downgraded to fast (trivial/light level).`);
    }
    if (round >= 2 && role === 'reviewer') {
      lines.push(`- Reviewer round ${round}: downgraded to fast (if no BLOCKER in prior round).`);
      lines.push(`- If BLOCKER found this round: upgrade back + record degradation_failed.`);
    }
    // Template instructions
    const templates = ROLE_TEMPLATES[role];
    if (templates && templates.length > 0) {
      lines.push('Output templates for the sub-agent to use:');
      for (const t of templates) {
        lines.push(`  bp template ${t}`);
      }
    }

    if (platforms.length > 1) {
      console.log(`=== ${platform} ===`);
    }
    console.log(lines.join('\n'));
    if (platforms.length > 1) console.log('');
  }
}
