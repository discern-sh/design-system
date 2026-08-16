/**
 * Builder-facing index over the generated catalogue registry: canonical
 * ordering, slug lookups, adapter component resolution, and memoized
 * inspector controls, all derived — never authored — facts.
 */
import type { ComponentType } from "react";
import * as reactSurface from "../../src/react.ts";
import { componentGroups } from "../../src/types/component-meta.ts";
import type { CatalogueObjectType, CatalogueVariant } from "../conformance.ts";
import type { RegistryEntry } from "../generated/registry.ts";
import {
  registry,
  sharedModuleObjectTypes,
  sharedModuleVariants,
} from "../generated/registry.ts";
import type { PropControl } from "./controls.ts";
import { defaultProps, deriveControls } from "./controls.ts";
import type { ExportNaming, RequiredFunctionProp } from "./export.ts";
import type { BuilderNode } from "./model.ts";
import { newChildId } from "./model.ts";
import type { BuilderDocumentPolicy } from "./policy.ts";

/** Registry entries in canonical catalogue order (group, then meta order). */
export const componentEntries: readonly RegistryEntry[] = registry
  .slice()
  .sort((a, b) =>
    componentGroups.indexOf(a.meta.group) -
      componentGroups.indexOf(b.meta.group) ||
    a.meta.order - b.meta.order ||
    a.meta.slug.localeCompare(b.meta.slug)
  );

/** Registry entry lookup by component slug. */
export const entryBySlug: ReadonlyMap<string, RegistryEntry> = new Map(
  componentEntries.map((entry) => [entry.meta.slug, entry]),
);

/** Every placeable component slug. */
export const knownSlugs: ReadonlySet<string> = new Set(entryBySlug.keys());

const adapterSurface = reactSurface as Record<string, unknown>;

function resolveAdapter(
  entry: RegistryEntry,
): ComponentType<Record<string, unknown>> {
  const candidate = adapterSurface[entry.reactExport];
  if (
    typeof candidate !== "function" &&
    (typeof candidate !== "object" || candidate === null)
  ) {
    throw new Error(
      `The react adapter surface is missing ${entry.reactExport} for "${entry.meta.slug}".`,
    );
  }
  return candidate as ComponentType<Record<string, unknown>>;
}

const adapterBySlug = new Map<string, ComponentType<Record<string, unknown>>>(
  componentEntries.map((entry) => [entry.meta.slug, resolveAdapter(entry)]),
);

/** The live React adapter for a placed slug. */
export function componentBySlug(
  slug: string,
): ComponentType<Record<string, unknown>> {
  const component = adapterBySlug.get(slug);
  if (component === undefined) {
    throw new Error(`Unknown component slug "${slug}".`);
  }
  return component;
}

/**
 * Variant unions from every entry and shared module, first declaration
 * winning per name.
 */
const sharedVariants: readonly CatalogueVariant[] = [
  ...[
    ...componentEntries.flatMap((entry) => entry.variants),
    ...sharedModuleVariants,
  ]
    .reduce(
      (byName, variant) =>
        byName.has(variant.typeName)
          ? byName
          : byName.set(variant.typeName, variant),
      new Map<string, CatalogueVariant>(),
    )
    .values(),
];

/** Object interfaces exported anywhere in the component tree, by name. */
const objectTypes: ReadonlyMap<string, CatalogueObjectType> = [
  ...componentEntries.flatMap((entry) => entry.objectTypes),
  ...sharedModuleObjectTypes,
].reduce(
  (byName, objectType) =>
    byName.has(objectType.typeName)
      ? byName
      : byName.set(objectType.typeName, objectType),
  new Map<string, CatalogueObjectType>(),
);

const controlsCache = new Map<string, readonly PropControl[]>();

/** Memoized inspector controls for a component slug. */
export function controlsBySlug(slug: string): readonly PropControl[] {
  const cached = controlsCache.get(slug);
  if (cached !== undefined) return cached;
  const entry = entryBySlug.get(slug);
  if (entry === undefined) {
    throw new Error(`Unknown component slug "${slug}".`);
  }
  const controls = deriveControls({
    ...entry,
    sharedVariants,
    objectTypes,
  });
  controlsCache.set(slug, controls);
  return controls;
}

/** Every prop the builder models for each Component, derived from controls. */
export const modeledPropsBySlug: ReadonlyMap<string, ReadonlySet<string>> =
  new Map(
    componentEntries.map((entry) => [
      entry.meta.slug,
      new Set(controlsBySlug(entry.meta.slug).map((control) => control.name)),
    ]),
  );

/** Required callbacks source documents cannot serialize, derived from types. */
export const requiredFunctionPropsBySlug: ReadonlyMap<
  string,
  readonly RequiredFunctionProp[]
> = new Map(
  componentEntries.map((entry) => [
    entry.meta.slug,
    entry.propDocumentation.status === "available"
      ? entry.propDocumentation.props.flatMap((prop) =>
        prop.required &&
          !(modeledPropsBySlug.get(entry.meta.slug)?.has(prop.name) ?? false)
          ? [{ name: prop.name }]
          : []
      )
      : [],
  ]),
);

/** Canonical prop names additional JSON may never shadow. */
export const reservedPropsBySlug: ReadonlyMap<
  string,
  ReadonlySet<string>
> = new Map(
  componentEntries.map((entry) => [
    entry.meta.slug,
    new Set([
      ...controlsBySlug(entry.meta.slug).map((control) => control.name),
      ...(entry.propDocumentation.status === "available"
        ? entry.propDocumentation.props.map((prop) => prop.name)
        : []),
    ]),
  ]),
);

/** The single registry-derived policy for every accepted builder document. */
export const documentPolicy: BuilderDocumentPolicy = {
  knownSlugs,
  modeledPropsBySlug,
  reservedPropsBySlug,
};

/** Registry naming and callback facts for trustworthy TSX generation. */
export const exportNaming: ExportNaming = {
  ...documentPolicy,
  slugToExport: new Map(
    componentEntries.map((entry) => [entry.meta.slug, entry.reactExport]),
  ),
  requiredFunctionPropsBySlug,
};

// Table's required ReactNode is native row-group markup that inert documents
// cannot author. An empty text node satisfies its type without producing an
// invalid text child inside <table>; raw row markup remains outside the model.
const EMPTY_TEXT_DEFAULT_SLOTS: ReadonlyMap<string, ReadonlySet<string>> =
  new Map([["table", new Set(["children"])]]);

/** A fresh instance of a component with its required defaults configured. */
export function instantiateComponent(slug: string): BuilderNode {
  const props = { ...defaultProps(controlsBySlug(slug)) };
  for (const slot of EMPTY_TEXT_DEFAULT_SLOTS.get(slug) ?? []) {
    props[slot] = {
      kind: "slot",
      children: [{ kind: "text", id: newChildId(), text: "" }],
    };
  }
  return {
    kind: "component",
    id: newChildId(),
    slug,
    props,
  };
}
