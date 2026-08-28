/** Discovery-only projection over the stable Builder registry core. */
import type {
  CataloguePurpose,
  ComponentGroup,
} from "../../../src/types/component-meta.ts";
import {
  componentExampleImagePresentation,
  representativeComponentExampleImage,
} from "../../example-images.ts";
import type {
  ComponentExampleImageManifestEntry,
  ComponentExampleImageTheme,
} from "../../example-images/contract.ts";
import {
  type SearchRecord,
  searchRecords,
  type SearchResult,
} from "../../search/mod.ts";
import {
  type BuilderRegistryCoreEntry,
  registryCoreEntries,
} from "../registry-core.ts";

/** Generated representative imagery available to later discovery UI. */
export type BuilderDiscoveryImages = Readonly<
  Partial<
    Record<ComponentExampleImageTheme, ComponentExampleImageManifestEntry>
  >
>;

/** Payload retained beside the universal search record. */
export interface BuilderDiscoveryPayload {
  readonly core: BuilderRegistryCoreEntry;
  readonly images: BuilderDiscoveryImages;
}

/** One source-backed Component candidate for Builder discovery. */
export type BuilderDiscoveryRecord = SearchRecord<BuilderDiscoveryPayload>;

function imagesFor(slug: string): BuilderDiscoveryImages {
  return Object.fromEntries(
    (["light", "dark"] as const).flatMap((theme) => {
      const image = representativeComponentExampleImage(slug, theme);
      return image === undefined ? [] : [[theme, image] as const];
    }),
  );
}

/** Canonically ordered discovery records derived from core, search, and images. */
export const builderDiscoveryRecords: readonly BuilderDiscoveryRecord[] = Object
  .freeze(registryCoreEntries.map((core, order) => {
    const { meta, canonicalExamples } = core.registry;
    return Object.freeze({
      id: `builder-component:${meta.slug}`,
      href: `/catalogue/builder/#component-${meta.slug}`,
      title: meta.name,
      context: "Component",
      slug: meta.slug,
      group: meta.group,
      description: meta.description,
      purposes: meta.purposes ?? [],
      keywords: canonicalExamples.map(({ label }) => label),
      order,
      payload: Object.freeze({ core, images: imagesFor(meta.slug) }),
    });
  }));

/** Universal-search results over the purpose-constrained Builder population. */
export function discoverBuilderComponents(
  query: string,
  purpose: CataloguePurpose | undefined,
): readonly SearchResult<BuilderDiscoveryPayload>[] {
  const candidates = builderDiscoveryRecords.filter((record) =>
    purpose === undefined || record.purposes?.includes(purpose)
  );
  return query.trim() === ""
    ? candidates.map((record) => ({ record, score: 0, reasons: [] }))
    : searchRecords(candidates, query);
}

/** Legacy palette filtering retained until the discovery redesign owns search. */
export function filterBuilderComponents(
  query: string,
  purpose: CataloguePurpose | undefined,
): readonly SearchResult<BuilderDiscoveryPayload>[] {
  const normalized = query.trim().toLowerCase();
  return builderDiscoveryRecords
    .filter((record) =>
      purpose === undefined || record.purposes?.includes(purpose)
    )
    .filter((record) =>
      normalized === "" ||
      [record.title, record.slug, record.group, record.description]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    )
    .map((record) => ({ record, score: 0, reasons: [] }));
}

/** Records for one canonical Group without another authored order. */
export function discoveryRecordsForGroup(
  results: readonly SearchResult<BuilderDiscoveryPayload>[],
  group: ComponentGroup,
): readonly SearchResult<BuilderDiscoveryPayload>[] {
  return results.filter(({ record }) => record.group === group);
}

/** Presentation inputs derive from the generated image authority. */
export function discoveryImagePresentation(
  record: BuilderDiscoveryRecord,
  theme: ComponentExampleImageTheme,
) {
  const image = record.payload?.images[theme];
  return image === undefined
    ? undefined
    : componentExampleImagePresentation(image);
}
