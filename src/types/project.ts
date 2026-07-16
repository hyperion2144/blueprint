/**
 * v2 entity types
 * Two-layer: Roadmap (living document) + Change (spec-driven unit)
 */

/** Change type */
export type ChangeType = 'phase' | 'adhoc';

/** Change lifecycle stage (derived from artifact existence, not stored) */
export type ChangeStage =
  | 'proposed'    // proposal.md exists
  | 'planned'     // design.md + tasks.md exist
  | 'in-progress' // some tasks [x]
  | 'implemented' // all tasks [x]
  | 'reviewed'    // review.md exists with PASS
  | 'archived';   // moved to changes/archive/

/** Change metadata (stored in .bp.yaml per change) */
export interface ChangeMeta {
  name: string;
  type: ChangeType;
  /** Optional roadmap reference */
  milestone?: string;
  phase?: string;
  /** Created timestamp */
  createdAt: string;
}
