/** Discovery-only projection over shared Component, search, and image facts. */
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
import { cataloguePurposeDetails } from "../../../src/types/component-meta.ts";
import { componentSearchRecords } from "../../routes.ts";
import {
  normalizeSearchText,
  type SearchRecord,
  searchRecords,
  type SearchResult,
  supportingMatchReason,
} from "../../search/mod.ts";
import { builderSeededSlugs } from "../defaults.ts";
import type { BuilderDocument } from "../model.ts";
import { preflightInsertion } from "../placement.ts";
import {
  type BuilderRegistryCoreEntry,
  componentEntries,
  documentPolicy,
  instantiateComponent,
  registryCoreBySlug,
  registryCoreEntries,
} from "../registry-core.ts";
import { rendersFromDefaults } from "../render.tsx";
import type { InsertionTarget } from "../tree/projection.ts";

/** Generated representative imagery available to discovery UI. */
export type BuilderDiscoveryImages = Readonly<
  Partial<
    Record<ComponentExampleImageTheme, ComponentExampleImageManifestEntry>
  >
>;

/** Payload retained beside the universal search record. */
export interface BuilderDiscoveryPayload {
  readonly core: BuilderRegistryCoreEntry;
  readonly images: BuilderDiscoveryImages;
  readonly needsConfiguration: boolean;
  readonly surface: "Web + CLI" | "Web";
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

const sharedComponentRecords = componentSearchRecords(componentEntries);

/**
 * Canonically ordered records. Searchable facts come from the shared provider;
 * Builder adds only its payload and canonical example labels.
 */
export const builderDiscoveryRecords: readonly BuilderDiscoveryRecord[] = Object
  .freeze(sharedComponentRecords.map((shared, order) => {
    const slug = shared.slug;
    if (slug === undefined) {
      throw new TypeError(
        `Shared Component search record ${shared.id} has no slug`,
      );
    }
    const core = registryCoreBySlug.get(slug);
    if (core === undefined) {
      throw new TypeError(
        `Shared Component search record ${shared.id} has no Builder registry core`,
      );
    }
    const seeded = builderSeededSlugs.includes(slug);
    return Object.freeze({
      ...shared,
      id: `builder-component:${slug}`,
      href: `/catalogue/builder/#component-${slug}`,
      context: `Component · ${core.registry.meta.group}`,
      keywords: [
        ...(shared.keywords ?? []),
        ...core.registry.canonicalExamples.map(({ label }) => label),
      ],
      order,
      payload: Object.freeze({
        core,
        images: imagesFor(slug),
        needsConfiguration: !seeded && !rendersFromDefaults(slug),
        surface: core.registry.meta.cli.stance === "rendered"
          ? "Web + CLI"
          : "Web",
      }),
    });
  }));

/** Complete Component lookup shared by directory, Recent, and Favourites. */
export const builderDiscoveryRecordById: ReadonlyMap<
  string,
  BuilderDiscoveryRecord
> = new Map(builderDiscoveryRecords.map((record) => [record.id, record]));

/** One live Component lookup without a second slug population. */
export const builderDiscoveryRecordBySlug: ReadonlyMap<
  string,
  BuilderDiscoveryRecord
> = new Map(
  builderDiscoveryRecords.flatMap((record) =>
    record.slug === undefined ? [] : [[record.slug, record] as const]
  ),
);

export interface BuilderComponentDiscoveryOptions {
  /** Tree-authority compatibility result for an explicitly armed target. */
  readonly compatibleSlugs?: ReadonlySet<string>;
}

/**
 * Complete compatible population for an explicit target. Placement preflight
 * owns every rule; discovery only projects its accepted Component slugs.
 */
export function compatibleBuilderDiscoverySlugs(
  document: BuilderDocument,
  target: InsertionTarget,
): ReadonlySet<string> {
  return new Set(
    builderDiscoveryRecords.flatMap((record) => {
      const slug = record.slug;
      if (slug === undefined) return [];
      const result = preflightInsertion(
        document,
        { kind: "new", child: instantiateComponent(slug) },
        target,
        documentPolicy.compatibility,
      );
      return result.ok ? [slug] : [];
    }),
  );
}

/**
 * Universal-search results over the Builder-selected population. An explicit
 * compatibility population suspends unrelated purpose filtering.
 */
export function discoverBuilderComponents(
  query: string,
  purpose: CataloguePurpose | undefined,
  options: BuilderComponentDiscoveryOptions = {},
): readonly SearchResult<BuilderDiscoveryPayload>[] {
  const compatible = options.compatibleSlugs;
  const candidates = builderDiscoveryRecords.filter((record) => {
    if (record.slug === undefined) return false;
    if (compatible !== undefined) return compatible.has(record.slug);
    return purpose === undefined || record.payload?.core.registry.meta.purposes
      ?.includes(purpose);
  });
  return query.trim() === ""
    ? candidates.map((record) => ({ record, score: 0, reasons: [] }))
    : searchRecords(candidates, query);
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

/** Shared human purpose labels; stable values remain metadata facts. */
export function builderPurposeLabel(purpose: CataloguePurpose): string {
  return cataloguePurposeDetails[purpose].label;
}

/** Concise UI projection of the engine's strongest truthful match reason. */
export function builderDiscoveryMatchReason(
  result: SearchResult<BuilderDiscoveryPayload>,
  query: string,
): string | undefined {
  if (query.trim() === "") return undefined;
  const reason = supportingMatchReason(result) ?? result.reasons[0];
  if (reason === undefined) return undefined;
  const queryLabel = normalizeSearchText(query);
  return reason.field === "title" || reason.field === "slug"
    ? `Name matches “${queryLabel}”`
    : `${reason.label}: ${reason.value}`;
}

/** Structural parity witness used by population guards. */
export function assertBuilderDiscoveryPopulation(): void {
  if (builderDiscoveryRecords.length !== registryCoreEntries.length) {
    throw new TypeError("Builder discovery omitted a registry core member");
  }
  for (const core of registryCoreEntries) {
    const record = builderDiscoveryRecordBySlug.get(core.registry.meta.slug);
    if (record?.payload?.core !== core) {
      throw new TypeError(
        `Builder discovery projection drifted for ${core.registry.meta.slug}`,
      );
    }
  }
}

assertBuilderDiscoveryPopulation();
