/** Inspector-only control projection over the stable Builder registry core. */
import type { PropControl } from "../controls.ts";
import type { RequiredFunctionProp } from "../export.ts";
import { registryCoreBySlug, registryCoreEntries } from "../registry-core.ts";

/** The control and export facts Inspector may consume for one Component. */
export interface InspectorControlRecord {
  readonly slug: string;
  readonly exportName: string;
  readonly controls: readonly PropControl[];
  readonly builderDefaults: Readonly<Record<string, unknown>>;
  readonly requiredFunctionProps: readonly RequiredFunctionProp[];
  readonly modeledProps: ReadonlySet<string>;
  readonly reservedProps: ReadonlySet<string>;
}

/** Complete control population, automatically enrolled from registry core. */
export const inspectorControlRecords: readonly InspectorControlRecord[] = Object
  .freeze(registryCoreEntries.map((entry) =>
    Object.freeze({
      slug: entry.registry.meta.slug,
      exportName: entry.registry.reactExport,
      controls: entry.controls,
      builderDefaults: entry.registry.builderDefaults,
      requiredFunctionProps: entry.requiredFunctionProps,
      modeledProps: entry.modeledProps,
      reservedProps: entry.reservedProps,
    })
  ));

const inspectorControlsBySlug = new Map(
  inspectorControlRecords.map((record) => [record.slug, record]),
);

/** One complete Inspector control adapter by Component slug. */
export function inspectorControlBySlug(slug: string): InspectorControlRecord {
  const record = inspectorControlsBySlug.get(slug);
  if (record === undefined) {
    throw new Error(`Unknown component slug "${slug}".`);
  }
  return record;
}

/** Existing concise control lookup, now owned by the Inspector projection. */
export function controlsBySlug(slug: string): readonly PropControl[] {
  return inspectorControlBySlug(slug).controls;
}

/** Prove the projection retains identity with its core member. */
export function inspectorCoreEntry(slug: string) {
  const core = registryCoreBySlug.get(slug);
  if (core === undefined) {
    throw new Error(`Unknown component slug "${slug}".`);
  }
  return core;
}
