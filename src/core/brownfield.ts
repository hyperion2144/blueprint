/**
 * 存量项目扫描 — brownfield init 模式
 * 检测Project Type + codebase mapping + spec bootstrap
 */

import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { SpecStackTemplate } from '../templates/spec-stacks/index.js';

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
    language: '',
    framework: '',
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
    if (existsSync(join(rootDir, dir)) && readdirSync(join(rootDir, dir), { withFileTypes: true }).length > 0) {
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
  return `# Tech Stack\n\n` +
    `- Project Type: ${info.type}\n` +
    `- Language: ${info.language}\n` +
    `- Framework: ${info.framework}\n` +
    `- src 目录: ${info.srcDirs.join(', ')}\n` +
    `- 测试: ${info.hasTests ? 'yes' : 'no'}\n`;
}

function buildStructureSection(rootDir: string): string {
  const lines: string[] = ['# Project Structure', ''];
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
  return `# Project Conventions\n\nDetected: ${configs.length > 0 ? configs.join(', ') : 'no'}`;
}

/** spec bootstrap — create initial specs from tech stack template */
export function bootstrapSpecs(
  rootDir: string,
  bpDir: string,
  stack: SpecStackTemplate,
): string[] {
  const specs: string[] = [];
  const specsDir = join(bpDir, 'specs');
  mkdirSync(specsDir, { recursive: true });

  for (const domain of stack.domains) {
    const domainDir = join(specsDir, domain.name);
    mkdirSync(domainDir, { recursive: true });
    writeFileSync(join(domainDir, 'spec.md'), domain.specContent, 'utf-8');
    specs.push(domain.name);
  }

  // Write conventions from stack template
  const convDir = join(bpDir, 'conventions');
  mkdirSync(convDir, { recursive: true });
  writeFileSync(join(convDir, 'coding-standards.md'), stack.conventions, 'utf-8');

  return specs;
}

/** 完整 brownfield init 流程 */
export async function runBrownfieldInit(
  rootDir: string,
  bpDir: string,
  info: ProjectInfo,
  stack: SpecStackTemplate,
): Promise<string[]> {
  // Note: specs are NOT bootstrapped here - brownfield projects get specs
  // from code scanning via codebase-scanner sub-agent (dispatched by init workflow)

  return stack.domains.map(d => d.name);
}
