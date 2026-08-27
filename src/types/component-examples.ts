import type { ComponentMeta } from "./component-meta.ts";

/** Surfaces that can implement one canonical Component example. */
export const componentExampleSurfaces = ["web", "cli"] as const;

/** One browser or terminal Component-example surface. */
export type ComponentExampleSurface = (typeof componentExampleSurfaces)[number];

/** The ordinary case: one semantic example implemented by both surfaces. */
export interface SharedComponentExampleDefinition {
  readonly id: string;
  readonly label: string;
  readonly only?: never;
  readonly reason?: never;
}

/** An exceptional example that one medium literally cannot represent. */
export interface SurfaceOnlyComponentExampleDefinition {
  readonly id: string;
  readonly label: string;
  readonly only: ComponentExampleSurface;
  /** Specific incompatibility with the absent medium. */
  readonly reason?: string;
}

/** One entry in a Component's ordered, framework-neutral example vocabulary. */
export type ComponentExampleDefinition =
  | SharedComponentExampleDefinition
  | SurfaceOnlyComponentExampleDefinition;

/** A validated example with explicit applicability for generated consumers. */
export interface ResolvedComponentExampleDefinition {
  readonly id: string;
  readonly label: string;
  readonly surfaces: readonly ComponentExampleSurface[];
  readonly reason?: string;
}

type ExampleForSurface<
  Example,
  Surface extends ComponentExampleSurface,
> = Example extends { readonly only: infer Only }
  ? Only extends Surface ? Example : never
  : Example;

/** Canonical ids applicable to one surface in a literal vocabulary. */
export type ComponentExampleIdFor<
  Vocabulary extends readonly ComponentExampleDefinition[],
  Surface extends ComponentExampleSurface,
> = Extract<
  ExampleForSurface<Vocabulary[number], Surface> extends infer Example
    ? Example extends { readonly id: infer Id } ? Id : never
    : never,
  string
>;

const EXAMPLE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function specificReason(
  meta: ComponentMeta,
  definition: SurfaceOnlyComponentExampleDefinition,
): string | undefined {
  const authored = definition.reason?.trim();
  if (authored) return authored;
  if (definition.only === "web" && meta.cli.stance === "exempt") {
    const inherited = meta.cli.reason.trim();
    return inherited || undefined;
  }
  return undefined;
}

function assertSpecificReason(
  meta: ComponentMeta,
  definition: SurfaceOnlyComponentExampleDefinition,
): string {
  const reason = specificReason(meta, definition);
  if (reason === undefined || reason.length < 24 || !/\s/u.test(reason)) {
    throw new TypeError(
      `${meta.slug} example ${
        JSON.stringify(definition.id)
      } is ${definition.only}-only without a specific impossibility reason`,
    );
  }
  return reason;
}

/**
 * Validate and preserve one Component's canonical example vocabulary.
 *
 * The named export belongs beside the Component Metadata so React and CLI
 * implementations can import it without either surface owning the shared fact.
 */
export function defineComponentExampleVocabulary<
  const Vocabulary extends readonly ComponentExampleDefinition[],
>(
  meta: ComponentMeta,
  vocabulary: Vocabulary,
): Vocabulary {
  if (vocabulary.length === 0) {
    throw new TypeError(`${meta.slug} needs at least one canonical example`);
  }
  const ids = new Set<string>();
  const labels = new Set<string>();
  let shared = 0;
  for (const [index, definition] of vocabulary.entries()) {
    if (!EXAMPLE_ID.test(definition.id)) {
      throw new TypeError(
        `${meta.slug} example ids must be stable kebab-case; received ${
          JSON.stringify(definition.id)
        }`,
      );
    }
    if (ids.has(definition.id)) {
      throw new TypeError(
        `${meta.slug} repeats canonical example ${
          JSON.stringify(definition.id)
        }`,
      );
    }
    ids.add(definition.id);
    const label = definition.label.trim();
    if (label === "") {
      throw new TypeError(
        `${meta.slug} example ${
          JSON.stringify(definition.id)
        } needs a human label`,
      );
    }
    if (labels.has(label)) {
      throw new TypeError(
        `${meta.slug} repeats canonical example label ${JSON.stringify(label)}`,
      );
    }
    labels.add(label);
    if (definition.id === "default" && index !== 0) {
      throw new TypeError(
        `${meta.slug} canonical example default must be first`,
      );
    }
    if (definition.only === undefined) {
      shared += 1;
    } else {
      assertSpecificReason(meta, definition);
    }
    if (
      meta.cli.stance === "exempt" &&
      (definition.only === undefined || definition.only === "cli")
    ) {
      throw new TypeError(
        `${meta.slug} is CLI-exempt, so example ${
          JSON.stringify(definition.id)
        } must be explicitly web-only`,
      );
    }
  }
  if (meta.cli.stance === "rendered" && shared === 0) {
    throw new TypeError(
      `${meta.slug} has a rendered CLI stance but no shared Web/CLI example`,
    );
  }
  return vocabulary;
}

/** Resolve explicit applicability and inherited CLI-exemption reasons. */
export function resolveComponentExampleVocabulary(
  meta: ComponentMeta,
  vocabulary: readonly ComponentExampleDefinition[],
): readonly ResolvedComponentExampleDefinition[] {
  defineComponentExampleVocabulary(meta, vocabulary);
  return Object.freeze(vocabulary.map((definition) => {
    if (definition.only === undefined) {
      return Object.freeze({
        id: definition.id,
        label: definition.label,
        surfaces: componentExampleSurfaces,
      });
    }
    return Object.freeze({
      id: definition.id,
      label: definition.label,
      surfaces: [definition.only] as const,
      reason: assertSpecificReason(meta, definition),
    });
  }));
}

/** Canonical entries implemented by one surface, preserving relative order. */
export function componentExamplesForSurface(
  meta: ComponentMeta,
  vocabulary: readonly ComponentExampleDefinition[],
  surface: ComponentExampleSurface,
): readonly ResolvedComponentExampleDefinition[] {
  return resolveComponentExampleVocabulary(meta, vocabulary).filter(
    ({ surfaces }) => surfaces.includes(surface),
  );
}

/**
 * Fail closed when one surface omits, duplicates, reorders, or invents an
 * implementation beside the canonical vocabulary.
 */
export function validateComponentExampleImplementations(
  meta: ComponentMeta,
  vocabulary: readonly ComponentExampleDefinition[],
  surface: ComponentExampleSurface,
  implementationIds: readonly string[],
  source = `${meta.slug} ${surface} examples`,
): void {
  const canonical = resolveComponentExampleVocabulary(meta, vocabulary);
  const expected = canonical
    .filter(({ surfaces }) => surfaces.includes(surface))
    .map(({ id }) => id);
  const seen = new Set<string>();
  for (const id of implementationIds) {
    if (seen.has(id)) {
      throw new TypeError(
        `${meta.slug} ${surface} examples in ${source} duplicate ${
          JSON.stringify(id)
        }`,
      );
    }
    seen.add(id);
    const definition = canonical.find((candidate) => candidate.id === id);
    if (definition === undefined) {
      throw new TypeError(
        `${meta.slug} ${surface} examples in ${source} contain undeclared ${
          JSON.stringify(id)
        }; declare it in componentExampleVocabulary`,
      );
    }
    if (!definition.surfaces.includes(surface)) {
      throw new TypeError(
        `${meta.slug} ${surface} examples in ${source} implement ${
          JSON.stringify(id)
        }, which is declared for ${
          definition.surfaces.join(" and ")
        } only: ${definition.reason}`,
      );
    }
  }
  const missing = expected.filter((id) => !seen.has(id));
  if (missing.length > 0) {
    throw new TypeError(
      `${meta.slug} ${surface} examples in ${source} omit canonical ${
        missing.map((id) => JSON.stringify(id)).join(", ")
      }`,
    );
  }
  if (
    implementationIds.length !== expected.length ||
    implementationIds.some((id, index) => id !== expected[index])
  ) {
    throw new TypeError(
      `${meta.slug} ${surface} examples in ${source} are reordered; expected [${
        expected.join(", ")
      }], received [${implementationIds.join(", ")}]`,
    );
  }
}
