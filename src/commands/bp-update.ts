/**
 * bp update — 更新平台文件（commands + agents + hooks）
 */

import { join } from 'node:path';
import { rmSync, readdirSync, existsSync } from 'node:fs';
import { Command } from 'commander';
import { loadConfig } from '../core/config.js';
import { generateAll } from '../generators/index.js';
import { writeGeneratedFiles } from './_utils.js';

/** Remove stale generated files that no longer exist in the current v2 generation set. */

function cleanupStaleFiles(baseDir: string, generatedPaths: string[]): void {
  const generatedSet = new Set(generatedPaths.map(p => p.replace(/^\.\//, '')));

  // V2 step names for directory-based check (.agent/skills/ entries don't match generatedSet directly)
  const v2Steps: Record<string, true> = { init: true, roadmap: true, propose: true, plan: true, apply: true, review: true, archive: true, continue: true, ff: true, loop: true };

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

  // .codex/hooks.json — only remove the exact generated hooks config;
  // arbitrary files under .codex/ are user-owned and must be preserved.
  const codexHooksPath = join(baseDir, '.codex', 'hooks.json');
  if (existsSync(codexHooksPath) && !generatedSet.has('.codex/hooks.json')) {
    rmSync(codexHooksPath);
    console.log('  ✓ Removed stale: .codex/hooks.json');
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

  // .claude/settings.json — only remove the exact generated settings config;
  // arbitrary files under .claude/ are user-owned and must be preserved.
  const claudeSettingsPath = join(baseDir, '.claude', 'settings.json');
  if (existsSync(claudeSettingsPath) && !generatedSet.has('.claude/settings.json')) {
    rmSync(claudeSettingsPath);
    console.log('  ✓ Removed stale: .claude/settings.json');
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
