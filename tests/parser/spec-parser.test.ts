import { describe, it, expect } from 'vitest';
import { parseSpec, extractSpecFromTree } from '../../src/parser/spec-parser.js';
import { parseHeadings } from '../../src/parser/heading-tree.js';

const sampleSpec = `# Auth Specification

## Purpose

认证和会话管理。

## Requirements

### Requirement: User Authentication

系统 SHALL 在登录成功时发放 JWT token。

#### Scenario: Valid credentials

- GIVEN a user with valid credentials
- WHEN the user submits login form
- THEN a JWT token is returned
- AND the user is redirected to dashboard

#### Scenario: Invalid credentials

- GIVEN invalid credentials
- WHEN the user submits login form
- THEN an error message is displayed
- AND no token is issued

### Requirement: Session Expiration

系统 MUST 在 30 分钟无活动后过期会话。

#### Scenario: Idle timeout

- GIVEN an authenticated session
- WHEN 30 minutes pass without activity
- THEN the session is invalidated
`;

describe('parseSpec', () => {
  it('解析完整 spec', () => {
    const result = parseSpec(sampleSpec);

    expect(result.purpose).toBe('认证和会话管理。');
    expect(result.requirements).toHaveLength(2);

    const auth = result.requirements[0];
    expect(auth.name).toBe('User Authentication');
    expect(auth.keywords).toContain('SHALL');
    expect(auth.scenarios).toHaveLength(2);

    const validCreds = auth.scenarios[0];
    expect(validCreds.name).toBe('Valid credentials');
    expect(validCreds.steps).toHaveLength(4);
    expect(validCreds.steps[0].type).toBe('GIVEN');
    expect(validCreds.steps[0].text).toBe('a user with valid credentials');
    expect(validCreds.steps[1].type).toBe('WHEN');
    expect(validCreds.steps[2].type).toBe('THEN');
    expect(validCreds.steps[3].type).toBe('AND');

    const session = result.requirements[1];
    expect(session.name).toBe('Session Expiration');
    expect(session.keywords).toContain('MUST');
  });

  it('无 Purpose 时返回空字符串', () => {
    const md = `# Spec\n\n## Requirements\n\n### Requirement: Test\n\n系统 SHOULD 工作。`;
    const result = parseSpec(md);
    expect(result.purpose).toBe('');
    expect(result.requirements).toHaveLength(1);
  });

  it('无 Requirements 时返回空数组', () => {
    const md = `# Spec\n\n## Purpose\n\n一些描述。`;
    const result = parseSpec(md);
    expect(result.purpose).toBe('一些描述。');
    expect(result.requirements).toEqual([]);
  });

  it('空 Markdown 返回空结构', () => {
    const result = parseSpec('');
    expect(result.purpose).toBe('');
    expect(result.requirements).toEqual([]);
  });
});

describe('extractSpecFromTree', () => {
  it('从 heading tree 提取', () => {
    const tree = parseHeadings(sampleSpec);
    const result = extractSpecFromTree(tree);
    expect(result.requirements).toHaveLength(2);
    expect(result.requirements[0].scenarios).toHaveLength(2);
  });
});
