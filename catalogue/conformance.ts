/** Shared authored contracts for Catalogue examples and conformance. */
import type { ComponentType } from "react";
import type {
  ComponentExampleDefinition,
  ComponentExampleIdFor,
} from "../src/types/component-examples.ts";
import { validateComponentExampleImplementations } from "../src/types/component-examples.ts";
import type { ComponentMeta } from "../src/types/component-meta.ts";

/** One Web implementation bound to a canonical Component example id. */
export interface CatalogueExampleImplementation<Id extends string = string> {
  readonly id: Id;
  readonly Example: ComponentType;
}

/** Bind React implementations to one neutral Component example vocabulary. */
export function defineCatalogueExamples<
  const Vocabulary extends readonly ComponentExampleDefinition[],
  const Implementations extends readonly CatalogueExampleImplementation<
    ComponentExampleIdFor<Vocabulary, "web">
  >[],
>(
  meta: ComponentMeta,
  vocabulary: Vocabulary,
  implementations: Implementations,
): Implementations {
  validateComponentExampleImplementations(
    meta,
    vocabulary,
    "web",
    implementations.map(({ id }) => id),
  );
  return implementations;
}

/** One stable, labelled Web example in the canonical Catalogue registry. */
export interface CatalogueExample {
  readonly id: string;
  readonly label: string;
  readonly Example: ComponentType;
}

/** One stable, linkable state exported by an existing examples module. */
export interface CatalogueExampleState {
  readonly name: string;
  readonly label: string;
  readonly Example: ComponentType;
}

/** One component-specific prop extracted from its authored TypeScript source. */
export interface CatalogueProp {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly description?: string;
}

/** Source-derived prop documentation or an explicit reason it is unavailable. */
export type CataloguePropDocumentation =
  | {
    readonly status: "available";
    readonly typeName: string;
    readonly inheritedTypes: readonly string[];
    readonly props: readonly CatalogueProp[];
  }
  | {
    readonly status: "unavailable";
    readonly typeName: string;
    readonly reason: string;
  };

/** One source-declared literal union exposed as a component variant. */
export interface CatalogueVariant {
  readonly typeName: string;
  readonly values: readonly string[];
}

/** One exported object interface that component props may reference. */
export interface CatalogueObjectType {
  readonly typeName: string;
  readonly props: readonly CatalogueProp[];
}

/** A catalogue element found either by CSS selector or accessible role. */
export type ConformanceTarget =
  | {
    readonly selector: string;
    readonly role?: never;
    readonly name?: never;
  }
  | {
    readonly role: string;
    readonly name?: string;
    readonly selector?: never;
  };

/** One serializable browser action or observable assertion. */
export type ConformanceStep =
  | {
    readonly action: "click" | "focus" | "hover";
    readonly target: ConformanceTarget;
  }
  | {
    readonly action: "press";
    readonly key: string;
    readonly target?: ConformanceTarget;
  }
  | {
    readonly expect: "visible" | "hidden" | "focused";
    readonly target: ConformanceTarget;
  }
  | {
    readonly expect: "attribute";
    readonly target: ConformanceTarget;
    readonly attribute: string;
    readonly value: string;
  }
  | {
    readonly expect: "clipboard";
    readonly value: string;
  }
  | {
    readonly expect: "describes";
    readonly target: ConformanceTarget;
    readonly description: ConformanceTarget;
  }
  | {
    readonly expect: "aligned";
    readonly target: ConformanceTarget;
    readonly edge: "top" | "bottom";
    readonly tolerance?: number;
  }
  | {
    readonly expect: "balanced-rows";
    readonly target: ConformanceTarget;
    readonly tolerance?: number;
  }
  | {
    readonly expect: "within-viewport";
    readonly target: ConformanceTarget;
    readonly tolerance?: number;
  }
  | {
    readonly expect: "contained-x";
    readonly target: ConformanceTarget;
    readonly tolerance?: number;
  }
  | {
    readonly expect: "scrollable-x";
    readonly target: ConformanceTarget;
  };

/** A browser path exported beside one component's catalogue example. */
export interface ConformanceScenario {
  readonly name: string;
  readonly viewport?: {
    readonly width: number;
    readonly height: number;
  };
  readonly steps: readonly ConformanceStep[];
}
