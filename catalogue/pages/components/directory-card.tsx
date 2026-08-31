import type { RegistryEntry } from "../../generated/registry.ts";
import { catalogueDecisionCopyProps } from "../../metadata-copy.ts";
import { Tag } from "../../../src/components/display/tag/tag.tsx";
import {
  componentExampleImagePresentation,
  type ComponentExampleImageTheme,
  representativeComponentExampleImage,
} from "../../example-images.ts";
import { catalogueComponentPath } from "../../routes.ts";
import { catalogueHref, CatalogueIndexCard } from "../shared.tsx";
import type { ComponentCollection } from "./collections.ts";

function ThemedRepresentativeImage(
  { entry, collection = false }: {
    readonly entry: RegistryEntry;
    readonly collection?: boolean;
  },
) {
  return (
    <>
      {(["light", "dark"] as const).map((theme) => {
        const image = representativeComponentExampleImage(
          entry.meta.slug,
          theme,
        );
        if (image === undefined) return null;
        const presentation = componentExampleImagePresentation(image);
        return (
          <img
            className="discern-catalogue-index-card__theme-image"
            data-discern-image-theme={theme}
            data-discern-collection-image={collection
              ? entry.meta.slug
              : undefined}
            src={presentation.src}
            width={presentation.width}
            height={presentation.height}
            alt={collection ? "" : presentation.alt}
            loading="lazy"
            key={theme}
          />
        );
      })}
    </>
  );
}

/** One source-backed collection card with independent browse and Compare links. */
export function ComponentCollectionCard(
  { collection }: { readonly collection: ComponentCollection },
) {
  const visibleNames = collection.members.slice(0, 4);
  const remaining = collection.members.length - visibleNames.length;
  return (
    <CatalogueIndexCard
      className="discern-catalogue-collection-card"
      href={collection.browseHref}
      title={collection.label}
      description={collection.description}
      action="Browse collection"
      headingLevel={3}
      primaryAriaLabel={`Browse ${collection.label}, ${collection.members.length} Components`}
      primaryClassName="discern-catalogue-collection-card__browse"
      {...(collection.kind === "purpose"
        ? {
          descriptionClassName:
            "discern-catalogue-collection-card__description",
        }
        : {})}
      media={
        <span
          className="discern-catalogue-collection-card__mosaic"
          aria-hidden="true"
        >
          {collection.members.slice(0, 3).map((entry) => (
            <span key={entry.meta.slug}>
              <ThemedRepresentativeImage entry={entry} collection />
            </span>
          ))}
        </span>
      }
      metadata={
        <>
          <span className="discern-catalogue-collection-card__count">
            {collection.members.length}{" "}
            Component{collection.members.length === 1 ? "" : "s"}
          </span>
          <span className="discern-catalogue-collection-card__members">
            {visibleNames.map(({ meta }) => meta.name).join(", ")}
            {remaining > 0 ? ` +${remaining} more` : ""}
          </span>
        </>
      }
      secondaryActions={[{
        href: collection.compareHref,
        label: "Compare this collection",
        ariaLabel: `Compare ${collection.label}`,
        className: "discern-catalogue-collection-card__compare",
      }]}
    />
  );
}

/** Lightweight discovery result: generated pixels, never a live specimen. */
export function ComponentResultCard(
  { entry, showGroup, matchReason }: {
    readonly entry: RegistryEntry;
    readonly showGroup: boolean;
    readonly matchReason?: Readonly<{ label: string; value: string }>;
  },
) {
  const detailHref = catalogueComponentPath(entry.meta.slug);
  const compareHref = catalogueHref("/catalogue/review/", {
    components: entry.meta.slug,
  });
  const supplementaryMatchReason = matchReason?.value ===
      entry.meta.description
    ? undefined
    : matchReason;
  return (
    <CatalogueIndexCard
      className="discern-catalogue-component-card"
      href={detailHref}
      title={entry.meta.name}
      description={entry.meta.description}
      descriptionClassName="discern-catalogue-component-card__description"
      action="Inspect Component"
      headingLevel={3}
      eyebrow={showGroup ? entry.meta.group : undefined}
      primaryClassName="discern-catalogue-component-card__inspect"
      media={
        <span className="discern-catalogue-component-card__image">
          <ThemedRepresentativeImage entry={entry} />
        </span>
      }
      metadata={
        <>
          {supplementaryMatchReason === undefined ? null : (
            <p
              className="discern-catalogue-component-card__match"
              {...catalogueDecisionCopyProps}
            >
              Matched {supplementaryMatchReason.label.toLowerCase()}:{" "}
              {supplementaryMatchReason.value}
            </p>
          )}
          <Tag>
            {entry.cli.stance === "rendered" ? "Web and CLI" : "Web only"}
          </Tag>
        </>
      }
      secondaryActions={[{
        href: compareHref,
        label: "Compare",
        ariaLabel: `Compare ${entry.meta.name}`,
        className: "discern-catalogue-component-card__compare",
      }]}
    />
  );
}

export type { ComponentExampleImageTheme };
