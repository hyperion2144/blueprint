/**
 * specwf spec 结构类型
 * 对应 specs/<domain>/spec.md 的结构化解析
 */

/** Markdown heading tree 节点 */
export interface HeadingNode {
  /** heading 级别 1-6 */
  level: number;
  /** heading 文本 */
  text: string;
  /** 行号（1-indexed） */
  line: number;
  /** 子 heading */
  children: HeadingNode[];
  /** 该 heading 下的内容（不含子 heading 的内容） */
  content: string;
}

/** Scenario 步骤类型 */
export type ScenarioStepType = 'GIVEN' | 'WHEN' | 'THEN' | 'AND' | 'BUT';

/** Scenario 步骤 */
export interface ScenarioStep {
  type: ScenarioStepType;
  text: string;
}

/** Scenario — #### Scenario: xxx */
export interface Scenario {
  name: string;
  steps: ScenarioStep[];
}

/** Requirement — ### Requirement: xxx */
export interface Requirement {
  name: string;
  /** RFC 2119 关键词（SHALL/MUST/SHOULD/MAY） */
  keywords: string[];
  scenarios: Scenario[];
}

/** Spec section — 一个 spec.md 的结构化表示 */
export interface SpecSection {
  /** ## Purpose 段落内容 */
  purpose: string;
  /** ### Requirement 列表 */
  requirements: Requirement[];
}

/** Delta spec — change 中的 delta-specs */
export interface DeltaSpec {
  /** 域名（如 auth, payments） */
  domain: string;
  /** 操作类型 */
  operation: 'add' | 'modify' | 'remove';
  /** spec 内容（结构化） */
  section: SpecSection;
  /** 源文件路径 */
  sourcePath: string;
}

/** 合并后的 spec 文件 */
export interface MergedSpec {
  domain: string;
  section: SpecSection;
  /** 合并来源（哪些 change 贡献了此 spec） */
  sources: string[];
}
