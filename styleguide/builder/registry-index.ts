/**
 * Builder-facing index over the generated catalogue registry: canonical
 * ordering, slug lookups, adapter component resolution, and memoized
 * inspector controls, all derived — never authored — facts.
 */
import type { ComponentType } from "react";
import * as reactSurface from "../../src/react.ts";
import { componentGroups } from "../../src/types/component-meta.ts";
import type { RegistryEntry } from "../generated/registry.ts";
import { registry } from "../generated/registry.ts";
import type { PropControl } from "./controls.ts";
import { deriveControls } from "./controls.ts";
import type { ExportNaming } from "./export.ts";

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

/** How exported TSX names each slug's React adapter export. */
export const exportNaming: ExportNaming = {
  slugToExport: new Map(
    componentEntries.map((entry) => [entry.meta.slug, entry.reactExport]),
  ),
};

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

const controlsCache = new Map<string, readonly PropControl[]>();

/** Memoized inspector controls for a component slug. */
export function controlsBySlug(slug: string): readonly PropControl[] {
  const cached = controlsCache.get(slug);
  if (cached !== undefined) return cached;
  const entry = entryBySlug.get(slug);
  if (entry === undefined) {
    throw new Error(`Unknown component slug "${slug}".`);
  }
  const controls = deriveControls(entry);
  controlsCache.set(slug, controls);
  return controls;
}
