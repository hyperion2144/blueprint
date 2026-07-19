/**
 * Compact context types for the <bp-context> markdown block
 * and JSON-format output. Each spec/convention entry carries only
 * path, title, and lineCount — no file content.
 */

export interface CompactSpecRef {
  path: string;
  title: string;
  lineCount: number;
}

export interface CompactConventionRef {
  path: string;
  title: string;
  lineCount: number;
}

export type ChangeStatus = 'proposed' | 'in_progress' | 'reviewed' | 'archived';

export interface ActiveChangeRef {
  name: string;
  status: ChangeStatus;
  proposalPath?: string | null;
  designPath?: string | null;
  tasksPath?: string | null;
  specsPath?: string | null;
  contextJsonlPath?: string | null;
}

export interface CompactRuleRef {
  artifact: string;
  text: string;
}

export interface CompactContext {
  specs: CompactSpecRef[];
  conventions: CompactConventionRef[];
  activeChange: ActiveChangeRef | null;
  rules: CompactRuleRef[];
  generatedAt: string;
}
