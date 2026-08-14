/**
 * bp update — 更新平台文件（commands + agents + hooks）
 */

import { join } from 'node:path';
import { rmSync, readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { Command } from 'commander';
import { loadConfig } from '../core/config.js';
import { generateAll } from '../generators/index.js';
import { writeGeneratedFiles } from './_utils.js';
import {
  isCommandHookGroup,
  mergeHookConfig,
  containsBpHookGroups,
  isEmptyJsonObject,
} from '../core/config-merge.js';
import { CLAUDE_HANDLER_MARKER } from '../integrations/claude-code/hooks.js';
import { CODEX_HANDLER_MARKER } from '../integrations/codex/hooks.js';

/**
 * Strip bp-owned hook groups from a shared hook config file whose platform
 * is no longer in the generation set. User-owned keys/groups are preserved;
 * a backup copy is written before any modification. A file that ends up
 * with no user content at all is removed. Unparseable files are left alone.
 */
function stripStaleHookConfig(baseDir: string, relPath: string, marker: string): void {
  const fullPath = join(baseDir, relPath);
  if (!existsSync(fullPath)) return;
  let existing: unknown;
  try {
    existing = JSON.parse(readFileSync(fullPath, 'utf-8'));
  } catch {
    return; // Not JSON — not a file bp generated; leave untouched.
  }
  const isBpGroup = isCommandHookGroup(marker);
  if (!containsBpHookGroups(existing, isBpGroup)) return;
  const merged = mergeHookConfig(existing, {}, isBpGroup);
  if (isEmptyJsonObject(merged)) {
    rmSync(fullPath);
    console.log(`  ✓ Removed stale: ${relPath}`);
    return;
  }
  const rendered = JSON.stringify(merged, null, 2) + '\n';
  const original = readFileSync(fullPath, 'utf-8');
  if (rendered !== original) {
    writeFileSync(`${fullPath}.bak`, original, 'utf-8');
    writeFileSync(fullPath, rendered, 'utf-8');
    console.log(`  ✓ Removed bp hooks from ${relPath} (preserved user content)`);
  }
}

/** Remove stale generated files that no longer exist in the current v2 generation set. */

function cleanupStaleFiles(baseDir: string, generatedPaths: string[]): void {
  const generatedSet = new Set(generatedPaths.map(p => p.replace(/^\.\//, '')));

  // V2 step names for directory-based check (.agent/skills/ entries don't match generatedSet directly)
  const v2Steps: Record<string, true> = { init: true, roadmap: true, propose: true, plan: true, apply: true, check: true, archive: true, continue: true, ff: true, loop: true, refactor: true };

  // Helper: remove a single file if it isn't in the generated set
  function checkRemove(dir: string, relPrefix: string, file: string): void {
    // Only touch BP files (bp-* prefix), leave other tools' files alone
    if (!file.startsWith('bp-')) return;
    const relPath = `${relPrefix}/${file}`;
    if (!generatedSet.has(relPath)) {
      rmSync(join(dir, file));
      console.log(`  ✓ Removed stale: ${relPath}`);
    }
  }

  // .omp/commands/
  const ompCmdDir = join(baseDir, '.omp', 'commands');
  if (existsSync(ompCmdDir)) {
    for (const file of readdirSync(ompCmdDir)) {
      checkRemove(ompCmdDir, '.omp/commands', file);
    }
  }

  // .omp/agents/
  const ompAgentDir = join(baseDir, '.omp', 'agents');
  if (existsSync(ompAgentDir)) {
    for (const file of readdirSync(ompAgentDir)) {
      checkRemove(ompAgentDir, '.omp/agents', file);
    }
  }

  // .omp/skills/ — only remove stale bp-* skills, leave other tools' skills alone
  const ompSkillsDir = join(baseDir, '.omp', 'skills');
  if (existsSync(ompSkillsDir)) {
    for (const file of readdirSync(ompSkillsDir)) {
      checkRemove(ompSkillsDir, '.omp/skills', file);
    }
  }

  // .claude/commands/
  const claudeCmdDir = join(baseDir, '.claude', 'commands');
  if (existsSync(claudeCmdDir)) {
    for (const file of readdirSync(claudeCmdDir)) {
      checkRemove(claudeCmdDir, '.claude/commands', file);
    }
  }

  // .claude/agents/
  const claudeAgentDir = join(baseDir, '.claude', 'agents');
  if (existsSync(claudeAgentDir)) {
    for (const file of readdirSync(claudeAgentDir)) {
      checkRemove(claudeAgentDir, '.claude/agents', file);
    }
  }

  // .agent/skills/ — entries are directories like bp-<step>/
  const agentSkillsDir = join(baseDir, '.agent', 'skills');
  if (existsSync(agentSkillsDir)) {
    for (const entry of readdirSync(agentSkillsDir)) {
      // Extract step name from "bp-<step>" directory name
      const match = /^bp-(.+)$/.exec(entry);
      if (match && !v2Steps[match[1]]) {
        rmSync(join(agentSkillsDir, entry), { recursive: true, force: true });
        console.log(`  ✓ Removed stale: .agent/skills/${entry}/`);
      }
    }
  }

  // .agent/agents/
  const agentAgentDir = join(baseDir, '.agent', 'agents');
  if (existsSync(agentAgentDir)) {
    for (const file of readdirSync(agentAgentDir)) {
      checkRemove(agentAgentDir, '.agent/agents', file);
    }
  }

  // .codex/hooks.json — when codex is no longer configured, strip bp-owned
  // hook groups and keep any user-owned hooks/settings (backed up first).
  // Arbitrary files under .codex/ are user-owned and must be preserved.
  if (!generatedSet.has('.codex/hooks.json')) {
    stripStaleHookConfig(baseDir, '.codex/hooks.json', CODEX_HANDLER_MARKER);
  }

  // .agents/skills/bp-* — directory-based cleanup; non-bp skill
  // directories must remain untouched.
  const agentsSkillsDir = join(baseDir, '.agents', 'skills');
  if (existsSync(agentsSkillsDir)) {
    for (const entry of readdirSync(agentsSkillsDir)) {
      const match = /^bp-(.+)$/.exec(entry);
      if (!match) continue; // skip non-bp skills
      // Stale = bp- directory not part of current generation set
      const isCurrent = generatedSet.has(`.agents/skills/${entry}/SKILL.md`);
      if (!isCurrent) {
        rmSync(join(agentsSkillsDir, entry), { recursive: true, force: true });
        console.log(`  ✓ Removed stale: .agents/skills/${entry}/`);
      }
    }
  }
  // .pi/skills/bp-* — directory-based cleanup; non-bp skill directories
  // must remain untouched (mirror of the .agents/skills/ block).
  const piSkillsDir = join(baseDir, '.pi', 'skills');
  if (existsSync(piSkillsDir)) {
    for (const entry of readdirSync(piSkillsDir)) {
      const match = /^bp-(.+)$/.exec(entry);
      if (!match) continue; // skip non-bp skills
      // Stale = bp- directory not part of current generation set
      const isCurrent = generatedSet.has(`.pi/skills/${entry}/SKILL.md`);
      if (!isCurrent) {
        rmSync(join(piSkillsDir, entry), { recursive: true, force: true });
        console.log(`  ✓ Removed stale: .pi/skills/${entry}/`);
      }
    }
  }

  // .pi/agents/ — file-based, bp- prefix guard (only bp-generated agents)
  const piAgentsDir = join(baseDir, '.pi', 'agents');
  if (existsSync(piAgentsDir)) {
    for (const file of readdirSync(piAgentsDir)) {
      checkRemove(piAgentsDir, '.pi/agents', file);
    }
  }

  // .pi/extensions/bp/ — only the bp-generated extension dir is removed;
  // arbitrary files under .pi/extensions/ are user-owned and preserved.
  const piExtensionDir = join(baseDir, '.pi', 'extensions', 'bp');
  if (existsSync(piExtensionDir) && !generatedSet.has('.pi/extensions/bp/index.ts')) {
    rmSync(piExtensionDir, { recursive: true, force: true });
    console.log('  ✓ Removed stale: .pi/extensions/bp/');
  }

  // .claude/settings.json — when claude-code is no longer configured, strip
  // bp-owned hook groups and keep any user-owned settings/hooks (backed up
  // first). Arbitrary files under .claude/ are user-owned and preserved.
  if (!generatedSet.has('.claude/settings.json')) {
    stripStaleHookConfig(baseDir, '.claude/settings.json', CLAUDE_HANDLER_MARKER);
  }

  // .claude/hooks/bp-claude-handler.mjs — only remove the bp-generated
  // handler; arbitrary files under .claude/hooks/ are user-owned.
  const claudeHandlerPath = join(baseDir, '.claude', 'hooks', 'bp-claude-handler.mjs');
  if (existsSync(claudeHandlerPath) && !generatedSet.has('.claude/hooks/bp-claude-handler.mjs')) {
    rmSync(claudeHandlerPath);
    console.log('  ✓ Removed stale: .claude/hooks/bp-claude-handler.mjs');
  }
}

export function register(program: Command): void {
  program
    .command('update')
    .description('Regenerate platform files (commands + agents + hooks)')
    .option('--dir <path>', 'bp directory', 'bp')
    .action(updateHandler);
}

function updateHandler(options: { dir: string }) {
  const bpDir = join(process.cwd(), options.dir);
  const cwd = process.cwd();

  const config = loadConfig(bpDir);
  const files = generateAll(config);
  const generatedPaths = files.map(f => f.path);

  console.log('Regenerating platform files...');
  writeGeneratedFiles(files);
  // Cleanup stale files
  cleanupStaleFiles(cwd, generatedPaths);

  console.log(`✓ Update complete (${files.length} files)`);
}
