/**
 * Stable Builder registry authority. Generated Component facts enter here
 * once; discovery and inspector expose consumer-specific projections.
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
import {
  applyBuilderCreationDefaults,
  assertBuilderSeedSlugs,
  type BuilderIdFactory,
} from "./defaults.ts";
import type { ExportNaming, RequiredFunctionProp } from "./export.ts";
import type { BuilderNode, BuilderPropValue } from "./model.ts";
import { newChildId } from "./model.ts";
import type { BuilderDocumentPolicy } from "./policy.ts";
import { deriveBuilderCompatibilityPolicy } from "./tree/compatibility.ts";

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

/** Registry entries in canonical Catalogue order. */
export const componentEntries: readonly RegistryEntry[] = registry
  .slice()
  .sort((left, right) =>
    componentGroups.indexOf(left.meta.group) -
      componentGroups.indexOf(right.meta.group) ||
    left.meta.order - right.meta.order ||
    left.meta.slug.localeCompare(right.meta.slug)
  );

/** Canonical generated entry lookup by Component slug. */
export const entryBySlug: ReadonlyMap<string, RegistryEntry> = new Map(
  componentEntries.map((entry) => [entry.meta.slug, entry]),
);

/** Every placeable Component slug. */
export const knownSlugs: ReadonlySet<string> = new Set(entryBySlug.keys());

assertBuilderSeedSlugs(knownSlugs);

/** Variant unions visible to controls, first declaration winning per name. */
export const builderSharedVariants: readonly CatalogueVariant[] = [
  ...[
    ...componentEntries.flatMap((entry) => entry.variants),
    ...sharedModuleVariants,
  ].reduce(
    (byName, variant) =>
      byName.has(variant.typeName)
        ? byName
        : byName.set(variant.typeName, variant),
    new Map<string, CatalogueVariant>(),
  ).values(),
];

/** Object interfaces visible to controls, first declaration winning. */
export const builderObjectTypes: ReadonlyMap<string, CatalogueObjectType> = [
  ...componentEntries.flatMap((entry) => entry.objectTypes),
  ...sharedModuleObjectTypes,
].reduce(
  (byName, objectType) =>
    byName.has(objectType.typeName)
      ? byName
      : byName.set(objectType.typeName, objectType),
  new Map<string, CatalogueObjectType>(),
);

/** One complete, immutable core entry from which feature adapters project. */
export interface BuilderRegistryCoreEntry {
  readonly registry: RegistryEntry;
  readonly component: ComponentType<Record<string, unknown>>;
  readonly controls: readonly PropControl[];
  readonly modeledProps: ReadonlySet<string>;
  readonly reservedProps: ReadonlySet<string>;
  readonly requiredFunctionProps: readonly RequiredFunctionProp[];
}

function coreEntry(entry: RegistryEntry): BuilderRegistryCoreEntry {
  const controls = deriveControls({
    ...entry,
    sharedVariants: builderSharedVariants,
    objectTypes: builderObjectTypes,
  });
  const modeledProps = new Set(controls.map(({ name }) => name));
  const requiredFunctionProps = entry.propDocumentation.status === "available"
    ? entry.propDocumentation.props.flatMap((prop) =>
      prop.required && !modeledProps.has(prop.name) ? [{ name: prop.name }] : []
    )
    : [];
  const reservedProps = new Set([
    ...modeledProps,
    ...(entry.propDocumentation.status === "available"
      ? entry.propDocumentation.props.map(({ name }) => name)
      : []),
  ]);
  return Object.freeze({
    registry: entry,
    component: resolveAdapter(entry),
    controls,
    modeledProps,
    reservedProps,
    requiredFunctionProps,
  });
}

/** Complete Builder registry core in canonical order. */
export const registryCoreEntries: readonly BuilderRegistryCoreEntry[] = Object
  .freeze(componentEntries.map(coreEntry));

/** Core lookup used by render, policy, discovery, and inspector adapters. */
export const registryCoreBySlug: ReadonlyMap<
  string,
  BuilderRegistryCoreEntry
> = new Map(
  registryCoreEntries.map((entry) => [entry.registry.meta.slug, entry]),
);

/** The live React adapter for one accepted slug. */
export function componentBySlug(
  slug: string,
): ComponentType<Record<string, unknown>> {
  const component = registryCoreBySlug.get(slug)?.component;
  if (component === undefined) {
    throw new Error(`Unknown component slug "${slug}".`);
  }
  return component;
}

/** Every prop modeled by the accepted document for each Component. */
export const modeledPropsBySlug: ReadonlyMap<string, ReadonlySet<string>> =
  new Map(
    registryCoreEntries.map((entry) => [
      entry.registry.meta.slug,
      entry.modeledProps,
    ]),
  );

/** Required callbacks inert documents cannot serialize. */
export const requiredFunctionPropsBySlug: ReadonlyMap<
  string,
  readonly RequiredFunctionProp[]
> = new Map(
  registryCoreEntries.map((entry) => [
    entry.registry.meta.slug,
    entry.requiredFunctionProps,
  ]),
);

/** Canonical prop reservations additional JSON cannot shadow. */
export const reservedPropsBySlug: ReadonlyMap<
  string,
  ReadonlySet<string>
> = new Map(
  registryCoreEntries.map((entry) => [
    entry.registry.meta.slug,
    entry.reservedProps,
  ]),
);

/** Render/content-model facts derived once from the complete registry core. */
export const builderCompatibility = deriveBuilderCompatibilityPolicy(
  registryCoreEntries.map((entry) => ({
    slug: entry.registry.meta.slug,
    name: entry.registry.meta.name,
    inheritedTypes: entry.registry.propDocumentation.status === "available"
      ? entry.registry.propDocumentation.inheritedTypes
      : [],
    propNames: new Set(
      entry.registry.propDocumentation.status === "available"
        ? entry.registry.propDocumentation.props.map(({ name }) => name)
        : [],
    ),
    controls: entry.controls,
  })),
);

/** The registry-derived policy shared by every accepted-document boundary. */
export const documentPolicy: BuilderDocumentPolicy = {
  knownSlugs,
  modeledPropsBySlug,
  reservedPropsBySlug,
  compatibility: builderCompatibility,
};

/** Naming and callback facts used by deterministic consumer TSX export. */
export const exportNaming: ExportNaming = {
  ...documentPolicy,
  slugToExport: new Map(
    registryCoreEntries.map(({ registry }) => [
      registry.meta.slug,
      registry.reactExport,
    ]),
  ),
  requiredFunctionPropsBySlug,
};

// Table's required ReactNode is native row-group markup that inert documents
// cannot author. Empty text satisfies its type without invalid table content.
const EMPTY_TEXT_DEFAULT_SLOTS: ReadonlyMap<string, ReadonlySet<string>> =
  new Map([["table", new Set(["children"])]]);

function instanceProps(
  entry: BuilderRegistryCoreEntry,
  id: BuilderIdFactory,
): BuilderNode["props"] {
  const props: Record<string, BuilderPropValue> = applyBuilderCreationDefaults(
    entry.registry.meta.slug,
    entry.controls,
    defaultProps(entry.controls, entry.registry.builderDefaults),
    id,
  );
  for (
    const slot of EMPTY_TEXT_DEFAULT_SLOTS.get(entry.registry.meta.slug) ?? []
  ) {
    props[slot] = {
      kind: "slot",
      children: [{ kind: "text", id: id(), text: "" }],
    };
  }
  const compatibility = builderCompatibility.bySlug.get(
    entry.registry.meta.slug,
  );
  for (const slot of compatibility?.slots.values() ?? []) {
    if (slot.defaultComponentSlug === undefined) continue;
    props[slot.name] = {
      kind: "slot",
      children: [instantiateComponent(slot.defaultComponentSlug)],
    };
  }
  return props;
}

/** A fresh, policy-accepted instance using the core's source-backed defaults. */
export function instantiateComponent(
  slug: string,
  id: BuilderIdFactory = newChildId,
): BuilderNode {
  const entry = registryCoreBySlug.get(slug);
  if (entry === undefined) {
    throw new Error(`Unknown component slug "${slug}".`);
  }
  return {
    kind: "component",
    id: id(),
    slug,
    props: instanceProps(entry, id),
  };
}
