import type { RegistryEntry } from "../../generated/registry.ts";
import { catalogueDecisionCopyProps } from "../../metadata-copy.ts";
import {
  componentExampleImagePresentation,
  type ComponentExampleImageTheme,
  representativeComponentExampleImage,
} from "../../example-images.ts";
import { catalogueComponentPath } from "../../routes.ts";
import { catalogueHref } from "../shared.tsx";
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
            className="discern-catalogue-themed-image"
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
    <article className="discern-catalogue-collection-card">
      <a
        className="discern-catalogue-collection-card__browse"
        href={collection.browseHref}
        aria-label={`Browse ${collection.label}, ${collection.members.length} Components`}
      >
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
        <span className="discern-catalogue-collection-card__identity">
          <span className="discern-catalogue-collection-card__count">
            {collection.members.length}{" "}
            Component{collection.members.length === 1 ? "" : "s"}
          </span>
          <h3>{collection.label}</h3>
          {collection.kind === "purpose"
            ? (
              <span
                className="discern-catalogue-collection-card__description"
                {...catalogueDecisionCopyProps}
              >
                {collection.description}
              </span>
            )
            : <span>{collection.description}</span>}
          <span className="discern-catalogue-collection-card__members">
            {visibleNames.map(({ meta }) => meta.name).join(", ")}
            {remaining > 0 ? ` +${remaining} more` : ""}
          </span>
          <strong>Browse collection</strong>
        </span>
      </a>
      <a
        className="discern-catalogue-collection-card__compare"
        href={collection.compareHref}
      >
        Compare this collection
      </a>
    </article>
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
    <article className="discern-catalogue-component-card">
      <a
        className="discern-catalogue-component-card__inspect"
        href={detailHref}
      >
        <span className="discern-catalogue-component-card__image">
          <ThemedRepresentativeImage entry={entry} />
        </span>
        <span className="discern-catalogue-component-card__body">
          {showGroup ? <span>{entry.meta.group}</span> : null}
          <h3>{entry.meta.name}</h3>
          <span
            className="discern-catalogue-component-card__description"
            {...catalogueDecisionCopyProps}
          >
            {entry.meta.description}
          </span>
          {supplementaryMatchReason === undefined ? null : (
            <span
              className="discern-catalogue-component-card__match"
              {...catalogueDecisionCopyProps}
            >
              Matched {supplementaryMatchReason.label.toLowerCase()}:{" "}
              {supplementaryMatchReason.value}
            </span>
          )}
          <small>
            {entry.cli.stance === "rendered" ? "Web and CLI" : "Web only"}
          </small>
          <strong>Inspect Component</strong>
        </span>
      </a>
      <a
        className="discern-catalogue-component-card__compare"
        href={compareHref}
      >
        Compare
      </a>
    </article>
  );
}

export type { ComponentExampleImageTheme };
