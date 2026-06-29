/**
 * Spec 结构化解析器
 * 从 Markdown heading tree 提取 spec 结构：
 * ## Purpose → ### Requirement → #### Scenario
 */

import type { HeadingNode, SpecSection, Requirement, Scenario, ScenarioStep, ScenarioStepType } from '../types/index.js';
import { findHeading, findHeadingsByPrefix, parseHeadings } from './heading-tree.js';

/** RFC 2119 关键词 */
const RFC2119_KEYWORDS = ['SHALL', 'MUST', 'SHOULD', 'MAY', 'SHALL NOT', 'MUST NOT', 'SHOULD NOT'];

/**
 * 解析 spec Markdown 为结构化数据
 * @param markdown spec.md 文件内容
 */
export function parseSpec(markdown: string): SpecSection {
  const tree = parseHeadings(markdown);
  return extractSpecFromTree(tree);
}

/**
 * 从 heading tree 提取 spec 结构
 * @param root 顶层 heading 列表
 */
export function extractSpecFromTree(root: HeadingNode[]): SpecSection {
  // 查找 ## Purpose
  const purposeNode = findHeading(root, 'Purpose');
  const purpose = purposeNode?.content ?? '';

  // 查找所有 ### Requirement: xxx
  const requirementNodes = findHeadingsByPrefix(root, 'Requirement:');
  const requirements: Requirement[] = requirementNodes.map((node) => {
    const name = node.text.replace(/^Requirement:\s*/, '');
    const keywords = extractKeywords(node.content);
    const scenarios = extractScenarios(node.children);
    return { name, keywords, scenarios };
  });

  return { purpose, requirements };
}


/**
 * 从内容中提取 RFC 2119 关键词
 */
function extractKeywords(content: string): string[] {
  const found: Record<string, true> = {};
  for (const kw of RFC2119_KEYWORDS) {
    if (content.includes(kw)) found[kw] = true;
  }
  return Object.keys(found);
}

/**
 * 从子 heading 中提取 scenarios
 * 查找 #### Scenario: xxx
 */
function extractScenarios(children: HeadingNode[]): Scenario[] {
  const scenarioNodes = findHeadingsByPrefix(children, 'Scenario:');
  return scenarioNodes.map((node) => {
    const name = node.text.replace(/^Scenario:\s*/, '');
    const steps = parseScenarioSteps(node.content);
    return { name, steps };
  });
}

/**
 * 解析 scenario 步骤
 * - GIVEN / WHEN / THEN / AND / BUT
 */
function parseScenarioSteps(content: string): ScenarioStep[] {
  const steps: ScenarioStep[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const match = line.match(/^\s*-\s*(GIVEN|WHEN|THEN|AND|BUT)\s+(.+)$/i);
    if (match) {
      const type = match[1].toUpperCase() as ScenarioStepType;
      const text = match[2].trim();
      steps.push({ type, text });
    }
  }

  return steps;
}
