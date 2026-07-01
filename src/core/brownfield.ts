/**
 * 存量项目扫描 — brownfield init 模式
 * 检测项目类型 + codebase mapping + spec bootstrap
 */

import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface ProjectInfo {
  type: string;
  language: string;
  framework: string;
  hasPackageJson: boolean;
  hasTests: boolean;
  srcDirs: string[];
  structFiles: string[];
}

/** 检测项目基本信息 */
export function detectProjectInfo(rootDir: string): ProjectInfo {
  const info: ProjectInfo = {
    type: 'unknown',
    language: 'unknown',
    framework: 'unknown',
    hasPackageJson: false,
    hasTests: false,
    srcDirs: [],
    structFiles: [],
  };

  // 检测 package.json
  if (existsSync(join(rootDir, 'package.json'))) {
    info.hasPackageJson = true;
    info.type = 'node';
    info.language = 'typescript';
    try {
      const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
      if (pkg.dependencies?.next) info.framework = 'next.js';
      else if (pkg.dependencies?.react) info.framework = 'react';
      else if (pkg.dependencies?.vue) info.framework = 'vue';
      else if (pkg.dependencies?.express) info.framework = 'express';
      else if (pkg.dependencies?.fastify) info.framework = 'fastify';
    } catch { /* ignore */ }
  }

  // 检测 Cargo.toml
  if (existsSync(join(rootDir, 'Cargo.toml'))) {
    info.type = 'rust';
    info.language = 'rust';
  }

  // 检测 go.mod
  if (existsSync(join(rootDir, 'go.mod'))) {
    info.type = 'go';
    info.language = 'go';
  }

  // 检测源码目录
  for (const dir of ['src', 'app', 'lib', 'pkg', 'cmd']) {
    if (existsSync(join(rootDir, dir)) && readdirSync(join(rootDir, dir), { withFileTypes: true }).some((e) => e.isDirectory())) {
      info.srcDirs.push(dir);
    }
  }

  // 检测测试
  if (existsSync(join(rootDir, '__tests__')) || existsSync(join(rootDir, 'tests'))) {
    info.hasTests = true;
  }
  if (existsSync(join(rootDir, 'vitest.config.ts')) || existsSync(join(rootDir, 'jest.config.ts'))) {
    info.hasTests = true;
  }

  return info;
}

/** 扫描源码结构生成 codebase 报告 */
export interface CodebaseReport {
  stack: string;
  structure: string;
  conventions: string;
}

export function generateCodebaseReport(rootDir: string, info: ProjectInfo): CodebaseReport {
  const stack = buildStackSection(info);
  const structure = buildStructureSection(rootDir);
  const conventions = detectConventions(rootDir);
  return { stack, structure, conventions };
}

function buildStackSection(info: ProjectInfo): string {
  return `# 技术栈\n\n` +
    `- 项目类型: ${info.type}\n` +
    `- 语言: ${info.language}\n` +
    `- 框架: ${info.framework}\n` +
    `- src 目录: ${info.srcDirs.join(', ')}\n` +
    `- 测试: ${info.hasTests ? '有' : '无'}\n`;
}

function buildStructureSection(rootDir: string): string {
  const lines: string[] = ['# 项目结构', ''];
  try {
    const entries = readdirSync(rootDir, { withFileTypes: true })
      .filter((e) => !e.name.startsWith('.') && !e.name.startsWith('node_modules') && e.name !== 'dist')
      .map((e) => `${e.isDirectory() ? '  [dir]  ' : '  [file] '}${e.name}`)
      .slice(0, 30);
    lines.push(...entries);
  } catch { /* ignore */ }
  return lines.join('\n');
}

function detectConventions(rootDir: string): string {
  const configs: string[] = [];
  if (existsSync(join(rootDir, 'tsconfig.json'))) configs.push('TypeScript');
  if (existsSync(join(rootDir, '.eslintrc.js')) || existsSync(join(rootDir, 'eslint.config.js'))) configs.push('ESLint');
  if (existsSync(join(rootDir, '.prettierrc'))) configs.push('Prettier');
  return `# 项目约定\n\n检测到: ${configs.length > 0 ? configs.join(', ') : '无'}`;
}

/** spec bootstrap — 从代码提取初始行为契约 */
export function bootstrapSpecs(rootDir: string, specwfDir: string): string[] {
  const specs: string[] = [];

  // 扫描 src/ 目录提取 spec 域
  if (existsSync(join(rootDir, 'src'))) {
    try {
      for (const entry of readdirSync(join(rootDir, 'src'), { withFileTypes: true })) {
        if (entry.isDirectory() && !entry.name.startsWith('_')) {
          const domainDir = join(specwfDir, 'specs', entry.name);
          mkdirSync(domainDir, { recursive: true });
          writeFileSync(
            join(domainDir, 'spec.md'),
            `# ${entry.name} Specification\n\n## Purpose\n\n[从上位代码自动提取的初始 spec — 待人工审核]\n\n## Requirements\n\n`,
            'utf-8',
          );
          specs.push(entry.name);
        }
      }
    } catch { /* ignore */ }
  }

  if (specs.length === 0) {
    // 至少创建一个默认 spec 域
    const domainDir = join(specwfDir, 'specs', 'general');
    mkdirSync(domainDir, { recursive: true });
    writeFileSync(
      join(domainDir, 'spec.md'),
      `# General Specification\n\n## Purpose\n\n[从上位代码自动提取的初始 spec — 待人工审核]\n\n## Requirements\n\n`,
      'utf-8',
    );
    specs.push('general');
  }

  return specs;
}

/** 完整 brownfield init 流程 */
export async function runBrownfieldInit(rootDir: string, specwfDir: string, info: ProjectInfo): Promise<string[]> {
  const report = generateCodebaseReport(rootDir, info);

  // 写入 codebase/
  const codebaseDir = join(specwfDir, 'codebase');
  mkdirSync(codebaseDir, { recursive: true });
  writeFileSync(join(codebaseDir, 'stack.md'), report.stack, 'utf-8');
  writeFileSync(join(codebaseDir, 'architecture.md'), report.structure, 'utf-8');

  // 写入 conventions/
  const convDir = join(specwfDir, 'conventions');
  mkdirSync(convDir, { recursive: true });
  writeFileSync(join(convDir, 'codebase-conventions.md'), report.conventions, 'utf-8');

  // bootstrap specs
  const domains = bootstrapSpecs(rootDir, specwfDir);

  return domains;
}
