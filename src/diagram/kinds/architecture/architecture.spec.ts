/** Semantic authoring and validated data contracts for architecture diagrams. */

import type { ValidatedDiagramSpec } from "../../dispatch.ts";
import type { DiagramCommonSpec } from "../../spec.ts";

/** Primary reading direction for the bounded topology. */
export type ArchitectureDirection = "left-to-right" | "top-to-bottom";

/** Restrained role vocabulary for one system entity. */
export type ArchitectureNodeRole =
  | "service"
  | "store"
  | "external"
  | "boundary"
  | "focal";

/** Relationship importance, including an explicitly backwards return path. */
export type ArchitectureRelationshipEmphasis =
  | "primary"
  | "secondary"
  | "return";

/** One stable entity in the bounded system topology. */
export interface ArchitectureNodeSpec {
  readonly id: string;
  readonly label: string;
  readonly annotation?: string;
  readonly role?: ArchitectureNodeRole;
}

/** One ownership or system boundary containing nodes at exactly one level. */
export interface ArchitectureGroupSpec {
  readonly id: string;
  readonly label: string;
  readonly members: readonly string[];
}

/** One labelled directed relationship between system entities. */
export interface ArchitectureRelationshipSpec {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly label: string;
  readonly emphasis?: ArchitectureRelationshipEmphasis;
}

/** JSON-safe bounded system topology. */
export interface ArchitectureDiagramSpec extends DiagramCommonSpec {
  readonly kind: "architecture";
  readonly direction?: ArchitectureDirection;
  readonly nodes: readonly ArchitectureNodeSpec[];
  readonly relationships: readonly ArchitectureRelationshipSpec[];
  readonly groups?: readonly ArchitectureGroupSpec[];
}

/** Normalized node returned by complete architecture preflight. */
export interface ValidatedArchitectureNode {
  readonly id: string;
  readonly label: string;
  readonly annotation?: string;
  readonly role: ArchitectureNodeRole;
  readonly groupId?: string;
  readonly sourceOrder: number;
}

/** Normalized one-level ownership boundary. */
export interface ValidatedArchitectureGroup {
  readonly id: string;
  readonly label: string;
  readonly members: readonly string[];
  readonly sourceOrder: number;
}

/** Normalized relationship returned by complete architecture preflight. */
export interface ValidatedArchitectureRelationship {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly label: string;
  readonly emphasis: ArchitectureRelationshipEmphasis;
  readonly sourceOrder: number;
}

/** Fully checked architecture consumed by descriptions and layout. */
export interface ValidatedArchitectureDiagram extends ValidatedDiagramSpec {
  readonly kind: "architecture";
  readonly title: string;
  readonly summary: string;
  readonly direction: ArchitectureDirection;
  readonly nodes: readonly ValidatedArchitectureNode[];
  readonly relationships: readonly ValidatedArchitectureRelationship[];
  readonly groups: readonly ValidatedArchitectureGroup[];
}
