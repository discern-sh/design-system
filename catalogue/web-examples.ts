import type { ComponentType } from "react";
import type {
  ComponentExampleDefinition,
} from "../src/types/component-examples.ts";
import {
  componentExamplesForSurface,
  validateComponentExampleImplementations,
} from "../src/types/component-examples.ts";
import type { ComponentMeta } from "../src/types/component-meta.ts";
import type { CatalogueExample } from "./conformance.ts";
import { validateComponentExampleCaptureDirective } from "./example-images/contract.ts";

/** Resolve and validate one Component's canonical Web example implementations. */
export function resolveCatalogueWebExamples(
  meta: ComponentMeta,
  vocabulary: readonly ComponentExampleDefinition[],
  module: object,
  source: string,
): readonly CatalogueExample[] {
  if (!("catalogueExamples" in module)) {
    throw new TypeError(
      `${meta.slug} Web examples in ${source} must export catalogueExamples`,
    );
  }
  const implementations = module.catalogueExamples;
  if (!Array.isArray(implementations)) {
    throw new TypeError(`${source} catalogueExamples export must be an array`);
  }
  const ids: string[] = [];
  const examples: Array<{
    readonly id: string;
    readonly Example: ComponentType;
    readonly capture?: CatalogueExample["capture"];
  }> = [];
  for (const value of implementations) {
    if (typeof value !== "object" || value === null) {
      throw new TypeError(`${source} contains a non-object Catalogue example`);
    }
    const example = value as {
      readonly id?: unknown;
      readonly Example?: unknown;
    };
    if (typeof example.id !== "string") {
      throw new TypeError(
        `${meta.slug} Web examples in ${source} contain an invalid id`,
      );
    }
    if (
      typeof example.Example !== "function" &&
      (typeof example.Example !== "object" || example.Example === null)
    ) {
      throw new TypeError(
        `${source} Catalogue example ${example.id} needs an Example`,
      );
    }
    ids.push(example.id);
    if ("capture" in example && example.capture !== undefined) {
      validateComponentExampleCaptureDirective(
        example.capture as NonNullable<CatalogueExample["capture"]>,
        `${meta.slug}/${example.id}`,
      );
    }
    examples.push(
      example as {
        readonly id: string;
        readonly Example: ComponentType;
        readonly capture?: CatalogueExample["capture"];
      },
    );
  }
  validateComponentExampleImplementations(
    meta,
    vocabulary,
    "web",
    ids,
    source,
  );
  const canonical = componentExamplesForSurface(meta, vocabulary, "web");
  return examples.map((example, index) => {
    const definition = canonical[index];
    if (definition === undefined) {
      throw new TypeError(
        `${meta.slug} Web example ${example.id} has no canonical definition`,
      );
    }
    return {
      id: definition.id,
      label: definition.label,
      Example: example.Example,
      ...(example.capture === undefined ? {} : { capture: example.capture }),
    };
  });
}
