import { describe, it, expect } from 'vitest';
import { detectProjectInfo, generateCodebaseReport, type ProjectInfo } from '../../src/core/brownfield.js';

describe('detectProjectInfo', () => {
  it('检测 TypeScript/Node 项目', () => {
    const info = detectProjectInfo(process.cwd());
    expect(info.type).toBe('node');
    expect(info.language).toBe('typescript');
    expect(info.hasPackageJson).toBe(true);
    expect(info.srcDirs).toContain('src');
  });

  it('空目录返回 unknown', () => {
    // detectProjectInfo 接受 rootDir，用当前不存在的路径测试
    const info = detectProjectInfo('/nonexistent/path/for/testing');
    expect(info.type).toBe('unknown');
    expect(info.language).toBe('');
    expect(info.hasPackageJson).toBe(false);
  });
});

describe('generateCodebaseReport', () => {
  it('生成含 stack/structure/conventions 的报告', () => {
    const info: ProjectInfo = {
      type: 'node',
      language: 'typescript',
      framework: 'react',
      hasPackageJson: true,
      hasTests: true,
      srcDirs: ['src'],
      structFiles: ['tsconfig.json'],
    };
    const cwd = process.cwd();
    const report = generateCodebaseReport(cwd, info);
    expect(report.stack).toContain('node');
    expect(report.stack).toContain('react');
    expect(report.structure).toContain('Project Structure');
    expect(report.conventions).toContain('Conventions');
  });
});
