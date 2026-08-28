import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent } from "react";
import {
  type CataloguePurpose,
  cataloguePurposes,
  type ComponentGroup,
  componentGroups,
} from "../../../src/types/component-meta.ts";
import { Select } from "../../../src/components/forms/select/select.tsx";
import type { ComponentExampleImageTheme } from "../../example-images/contract.ts";
import { type SearchResult, supportingMatchReason } from "../../search/mod.ts";
import type { AcceptedDocumentStore } from "../workspace/document-store.ts";
import type { BuilderTreeController } from "../tree/controller.ts";
import { writeBuilderDragPayload } from "../tree/drag.ts";
import {
  builderDiscoveryMatchReason,
  type BuilderDiscoveryPayload,
  builderDiscoveryRecordById,
  builderPurposeLabel,
  compatibleBuilderDiscoverySlugs,
  discoverBuilderComponents,
  discoveryImagePresentation,
} from "./registry.ts";
import {
  builderBlocks,
  type BuilderTemplate,
  builderTemplateByRecordId,
  builderTemplateImagePresentation,
  discoverBuilderTemplates,
} from "./templates.ts";
import {
  builderPaletteDensities,
  type BuilderPaletteDensity,
  useBuilderDiscoveryPreferences,
} from "./preferences.ts";

type DiscoveryCategory = "starters" | "blocks" | "components";

interface ComponentCardEntry {
  readonly kind: "component";
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly group: ComponentGroup;
  readonly surface: string;
  readonly needsConfiguration: boolean;
  readonly image: ReturnType<typeof discoveryImagePresentation>;
  readonly matchReason: string | undefined;
}

interface TemplateCardEntry {
  readonly kind: "starter" | "block";
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly surface: string;
  readonly needsConfiguration: false;
  readonly image: ReturnType<typeof builderTemplateImagePresentation>;
  readonly matchReason: string | undefined;
  readonly template: BuilderTemplate;
}

type DiscoveryCardEntry = ComponentCardEntry | TemplateCardEntry;

function templateMatchReason(
  result: SearchResult<BuilderTemplate>,
  query: string,
): string | undefined {
  if (query.trim() === "") return undefined;
  const reason = supportingMatchReason(result) ?? result.reasons[0];
  return reason === undefined ? undefined : `${reason.label}: ${reason.value}`;
}

function componentCard(
  result: SearchResult<BuilderDiscoveryPayload>,
  query: string,
  theme: ComponentExampleImageTheme,
): ComponentCardEntry | undefined {
  const payload = result.record.payload;
  const slug = result.record.slug;
  const group = result.record.group;
  if (payload === undefined || slug === undefined || group === undefined) {
    return undefined;
  }
  return {
    kind: "component",
    id: result.record.id,
    slug,
    title: result.record.title,
    description: result.record.description ?? "Design system Component.",
    group: group as ComponentGroup,
    surface: payload.surface,
    needsConfiguration: payload.needsConfiguration,
    image: discoveryImagePresentation(result.record, theme),
    matchReason: builderDiscoveryMatchReason(result, query),
  };
}

function templateCard(
  result: SearchResult<BuilderTemplate>,
  query: string,
  theme: ComponentExampleImageTheme,
): TemplateCardEntry | undefined {
  const template = result.record.payload;
  if (template === undefined) return undefined;
  return {
    kind: template.kind,
    id: template.recordId,
    title: template.title,
    description: template.description,
    surface: template.kind === "starter"
      ? `${String(template.components.length)} Components`
      : "Insertable block",
    needsConfiguration: false,
    image: builderTemplateImagePresentation(template, theme),
    matchReason: templateMatchReason(result, query),
    template,
  };
}

function accelerationEntry(
  id: string,
  theme: ComponentExampleImageTheme,
): DiscoveryCardEntry | undefined {
  const component = builderDiscoveryRecordById.get(id);
  if (component !== undefined) {
    const payload = component.payload;
    const slug = component.slug;
    const group = component.group;
    if (payload === undefined || slug === undefined || group === undefined) {
      return undefined;
    }
    return {
      kind: "component",
      id,
      slug,
      title: component.title,
      description: component.description ?? "Design system Component.",
      group: group as ComponentGroup,
      surface: payload.surface,
      needsConfiguration: payload.needsConfiguration,
      image: discoveryImagePresentation(component, theme),
      matchReason: undefined,
    };
  }
  const template = builderTemplateByRecordId.get(id);
  if (template === undefined || template.kind !== "block") return undefined;
  return {
    kind: "block",
    id,
    title: template.title,
    description: template.description,
    surface: "Insertable block",
    needsConfiguration: false,
    image: builderTemplateImagePresentation(template, theme),
    matchReason: undefined,
    template,
  };
}

function cardSlug(entry: DiscoveryCardEntry): string | undefined {
  if (entry.kind === "component") return entry.slug;
  if (entry.kind === "block") return entry.template.representativeSlug;
  return undefined;
}

function CardImage(
  { entry }: Readonly<{ entry: DiscoveryCardEntry }>,
) {
  const presentation = entry.image;
  return (
    <span
      className="discern-builder-card__image"
      style={presentation === undefined ? undefined : {
        "--discern-builder-image-ratio": `${String(presentation.width)} / ${
          String(presentation.height)
        }`,
      } as CSSProperties}
    >
      {presentation === undefined
        ? (
          <span className="discern-builder-card__image-empty">
            {entry.kind === "starter"
              ? "Empty canvas"
              : "Configure after adding"}
          </span>
        )
        : (
          <img
            src={presentation.src}
            width={presentation.width}
            height={presentation.height}
            alt={presentation.alt}
            loading="lazy"
            decoding="async"
          />
        )}
      {entry.needsConfiguration ? <span>Configure after adding</span> : null}
    </span>
  );
}

function DiscoveryCard(
  {
    entry,
    density,
    favourite,
    compatible,
    onAdd,
    onFavourite,
    onDragStart,
    onDragEnd,
  }: Readonly<{
    entry: DiscoveryCardEntry;
    density: BuilderPaletteDensity;
    favourite: boolean;
    compatible: boolean;
    onAdd: () => void;
    onFavourite?: (() => void) | undefined;
    onDragStart?: ((event: DragEvent<HTMLButtonElement>) => void) | undefined;
    onDragEnd?: (() => void) | undefined;
  }>,
) {
  const addLabel = entry.kind === "starter"
    ? `Start with ${entry.title}`
    : `Place ${entry.title}`;
  return (
    <li
      className="discern-builder-card"
      data-discern-builder-directory-entry={entry.id}
      data-discern-builder-entry-kind={entry.kind}
    >
      <button
        type="button"
        className="discern-builder-card__add"
        draggable={onDragStart !== undefined}
        aria-label={addLabel}
        onClick={onAdd}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        {density === "visual" ? <CardImage entry={entry} /> : null}
        <span className="discern-builder-card__copy">
          <strong>{entry.title}</strong>
          <span>{entry.description}</span>
          <small>
            {entry.kind === "component" ? `${entry.group} · ` : ""}
            {entry.surface}
            {compatible ? " · Fits target" : ""}
          </small>
          {entry.matchReason === undefined
            ? null
            : <em>{entry.matchReason}</em>}
        </span>
      </button>
      {onFavourite === undefined ? null : (
        <button
          type="button"
          className="discern-builder-card__favourite"
          aria-label={`${favourite ? "Remove" : "Add"} ${entry.title} ${
            favourite ? "from" : "to"
          } favourites`}
          aria-pressed={favourite}
          onClick={onFavourite}
        >
          <span aria-hidden="true">{favourite ? "★" : "☆"}</span>
        </button>
      )}
    </li>
  );
}

/** Image-led palette, template discovery, and contextual Component picking. */
export function BuilderDiscovery(
  { tree, store, theme, onActive }: Readonly<{
    tree: BuilderTreeController;
    store: AcceptedDocumentStore;
    theme: ComponentExampleImageTheme;
    onActive: () => void;
  }>,
) {
  const [query, setQuery] = useState("");
  const [purpose, setPurpose] = useState<CataloguePurpose | undefined>();
  const [category, setCategory] = useState<DiscoveryCategory>("components");
  const [pendingStarter, setPendingStarter] = useState<BuilderTemplate | null>(
    null,
  );
  const rootRef = useRef<HTMLElement>(null);
  const contextInvokerRef = useRef<HTMLElement | null>(null);
  const wasContextualRef = useRef(false);
  const placementRef = useRef<
    {
      readonly id: string;
      readonly before: ReadonlySet<string>;
    } | null
  >(null);
  const pending = tree.pendingInsertionTarget;
  const contextual = pending !== null;
  const compatibleSlugs = useMemo(
    () =>
      pending === null
        ? undefined
        : compatibleBuilderDiscoverySlugs(store.document, pending),
    [store.document, pending],
  );
  const componentResults = useMemo(
    () =>
      discoverBuilderComponents(
        query,
        purpose,
        compatibleSlugs === undefined ? {} : { compatibleSlugs },
      ),
    [query, purpose, compatibleSlugs],
  );
  const contextualQueryResults = useMemo(
    () =>
      contextual && query.trim() !== ""
        ? discoverBuilderComponents(query, undefined)
        : [],
    [contextual, query],
  );
  const hiddenContextualMatches = contextualQueryResults.filter(({ record }) =>
    record.slug !== undefined && !compatibleSlugs?.has(record.slug)
  );
  const templateKind = category === "starters" ? "starter" : "block";
  const templateResults = useMemo(
    () => discoverBuilderTemplates(templateKind, query),
    [templateKind, query],
  );
  const liveAccelerationIds = useMemo(
    () =>
      new Set([
        ...builderDiscoveryRecordById.keys(),
        ...builderBlocks.map(({ recordId }) => recordId),
      ]),
    [],
  );
  const preferences = useBuilderDiscoveryPreferences(liveAccelerationIds);
  const layerIds = useMemo(
    () => new Set(tree.layers.map(({ child }) => child.id)),
    [tree.layers],
  );

  useEffect(() => {
    const attempt = placementRef.current;
    if (
      attempt !== null &&
      [...layerIds].some((id) => !attempt.before.has(id))
    ) {
      preferences.recordRecent(attempt.id);
      placementRef.current = null;
    }
  }, [layerIds]);

  useEffect(() => {
    globalThis.requestAnimationFrame(() => {
      rootRef.current?.setAttribute(
        "data-discern-builder-discovery-ready-ms",
        performance.now().toFixed(1),
      );
    });
  }, []);

  useLayoutEffect(() => {
    const wasContextual = wasContextualRef.current;
    if (contextual && !wasContextual) {
      const active = globalThis.document.activeElement;
      contextInvokerRef.current = active instanceof HTMLElement ? active : null;
    } else if (!contextual && wasContextual) {
      const invoker = contextInvokerRef.current;
      if (invoker?.isConnected) invoker.focus();
      contextInvokerRef.current = null;
    }
    wasContextualRef.current = contextual;
  }, [contextual]);

  const componentEntries = componentResults.flatMap((result) => {
    const entry = componentCard(result, query, theme);
    return entry === undefined ? [] : [entry];
  });
  const incompatibleContextualEntries = hiddenContextualMatches.flatMap(
    (result) => {
      const entry = componentCard(result, query, theme);
      return entry === undefined ? [] : [entry];
    },
  );
  const groups = componentGroups.flatMap((group) => {
    const entries = componentEntries.filter((entry) => entry.group === group);
    return entries.length === 0 ? [] : [{ group, entries }];
  });
  const templateEntries = templateResults.flatMap((result) => {
    const entry = templateCard(result, query, theme);
    return entry === undefined ? [] : [entry];
  });
  const ordinaryEntries = category === "components"
    ? componentEntries
    : templateEntries;
  const recent = preferences.value.recentIds.flatMap((id) => {
    const entry = accelerationEntry(id, theme);
    return entry === undefined ? [] : [entry];
  });
  const favourites = preferences.value.favouriteIds.flatMap((id) => {
    const entry = accelerationEntry(id, theme);
    return entry === undefined ? [] : [entry];
  });

  const beginPlacement = (entry: DiscoveryCardEntry): void => {
    const slug = cardSlug(entry);
    if (slug === undefined) return;
    placementRef.current = { id: entry.id, before: new Set(layerIds) };
    tree.placeComponent(slug);
  };
  const startDrag = (
    entry: DiscoveryCardEntry,
    event: DragEvent<HTMLButtonElement>,
  ): void => {
    const slug = cardSlug(entry);
    if (slug === undefined) return;
    placementRef.current = { id: entry.id, before: new Set(layerIds) };
    writeBuilderDragPayload(event.dataTransfer, { type: "palette", slug });
    tree.setDragging(true);
  };
  const finishDrag = (): void => {
    globalThis.requestAnimationFrame(() =>
      globalThis.requestAnimationFrame(() => {
        placementRef.current = null;
      })
    );
  };
  const startWith = (template: BuilderTemplate): void => {
    if (store.document.children.length > 0) {
      setPendingStarter(template);
      return;
    }
    if (!store.apply(() => template.createDocument()).changed) return;
    tree.resetSelection();
  };
  const replaceWithPendingStarter = (): void => {
    if (pendingStarter === null) return;
    const changed = store.apply(() => pendingStarter.createDocument()).changed;
    setPendingStarter(null);
    if (changed) tree.resetSelection();
  };
  const renderCard = (
    entry: DiscoveryCardEntry,
    compatible = false,
  ) => (
    <DiscoveryCard
      key={entry.id}
      entry={entry}
      density={preferences.value.density}
      favourite={preferences.value.favouriteIds.includes(entry.id)}
      compatible={compatible}
      onAdd={() =>
        entry.kind === "starter"
          ? startWith(entry.template)
          : beginPlacement(entry)}
      onFavourite={entry.kind === "starter"
        ? undefined
        : () => preferences.toggleFavourite(entry.id)}
      onDragStart={entry.kind === "starter"
        ? undefined
        : (event) => startDrag(entry, event)}
      onDragEnd={entry.kind === "starter" ? undefined : finishDrag}
    />
  );

  const empty = ordinaryEntries.length === 0;
  const activeCategory: DiscoveryCategory = contextual
    ? "components"
    : category;
  return (
    <aside
      ref={rootRef}
      className="discern-builder-sidebar"
      id="discern-builder-pane-palette"
      role="tabpanel"
      aria-labelledby="discern-builder-tab-palette"
      onFocusCapture={onActive}
      data-discern-builder-insertion-target={tree.insertionTarget.label}
      data-discern-builder-density={preferences.value.density}
      data-discern-builder-discovery-category={activeCategory}
    >
      {pending === null
        ? null
        : (
          <header className="discern-builder-context" role="status">
            <strong>
              Add to {pending.label.replaceAll(" · ", " › ")}
            </strong>
            <span>Showing Components for this explicit target.</span>
            <div>
              <button type="button" onClick={tree.cancelInsertionTarget}>
                Change target
              </button>
              <button type="button" onClick={tree.cancelInsertionTarget}>
                Cancel
              </button>
            </div>
          </header>
        )}
      <label className="discern-builder-search">
        <span aria-hidden="true">⌕</span>
        <span className="discern-visually-hidden">
          Search components, blocks, and starters
        </span>
        <input
          id="discern-builder-component-search"
          type="search"
          value={query}
          placeholder="Search components"
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </label>
      {contextual
        ? purpose === undefined
          ? null
          : (
            <p className="discern-builder-filter-note">
              {builderPurposeLabel(purpose)}{" "}
              is paused while choosing for this slot.
            </p>
          )
        : (
          <label className="discern-builder-purpose">
            <span className="discern-visually-hidden">Filter by purpose</span>
            <Select
              value={purpose ?? ""}
              onChange={(event) =>
                setPurpose(
                  cataloguePurposes.find(
                    (candidate) => candidate === event.currentTarget.value,
                  ),
                )}
              options={[
                { value: "", label: "All purposes" },
                ...cataloguePurposes.map((candidate) => ({
                  value: candidate,
                  label: builderPurposeLabel(candidate),
                })),
              ]}
            />
          </label>
        )}
      {contextual && hiddenContextualMatches.length > 0
        ? (
          <p className="discern-builder-filter-note" role="status">
            {hiddenContextualMatches.length} matching {hiddenContextualMatches
                .length === 1
              ? "Component does"
              : "Components do"} not fit{" "}
            {pending?.label}. Compatible matches stay first; change the target
            to use {hiddenContextualMatches
                .length === 1
              ? "it"
              : "them"}.
          </p>
        )
        : null}
      <div className="discern-builder-discovery-controls">
        {contextual ? null : (
          <nav aria-label="Discovery categories">
            {(["starters", "blocks", "components"] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item.slice(0, 1).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </nav>
        )}
        <div role="group" aria-label="Palette density">
          {builderPaletteDensities.map((density) => (
            <button
              key={density}
              type="button"
              aria-pressed={preferences.value.density === density}
              onClick={() => preferences.setDensity(density)}
            >
              {density.slice(0, 1).toUpperCase() + density.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {pendingStarter === null ? null : (
        <div
          className="discern-builder-template-confirmation"
          role="group"
          aria-label={`Replace with ${pendingStarter.title}`}
        >
          <strong>Replace the current composition?</strong>
          <p>
            Starting with {pendingStarter.title} replaces the current page.
          </p>
          <div>
            <button type="button" onClick={replaceWithPendingStarter}>
              Replace
            </button>
            <button type="button" onClick={() => setPendingStarter(null)}>
              Keep
            </button>
          </div>
        </div>
      )}
      <div className="discern-builder-palette">
        {!contextual && query.trim() === "" && activeCategory === "components"
          ? (
            <section className="discern-builder-acceleration">
              <h3>
                Recent <span>{recent.length}</span>
              </h3>
              {recent.length === 0
                ? <p>No recent placements yet.</p>
                : <ul>{recent.map((entry) => renderCard(entry))}</ul>}
            </section>
          )
          : null}
        {!contextual && query.trim() === "" && activeCategory === "components"
          ? (
            <section className="discern-builder-acceleration">
              <h3>
                Favourites <span>{favourites.length}</span>
              </h3>
              {favourites.length === 0
                ? <p>No favourites yet.</p>
                : <ul>{favourites.map((entry) => renderCard(entry))}</ul>}
            </section>
          )
          : null}
        {activeCategory === "components"
          ? query.trim() !== ""
            ? (
              <section data-discern-builder-search-results>
                <h3>
                  Search results <span>{componentEntries.length}</span>
                </h3>
                <ul>
                  {componentEntries.map((entry) =>
                    renderCard(entry, contextual)
                  )}
                </ul>
                {incompatibleContextualEntries.length === 0 ? null : (
                  <section
                    data-discern-builder-incompatible-search-results
                  >
                    <h4>
                      Does not fit target
                      <span>{incompatibleContextualEntries.length}</span>
                    </h4>
                    <p>
                      Placement is shown for explanation; the tree authority
                      will refuse it without changing the composition.
                    </p>
                    <ul>
                      {incompatibleContextualEntries.map((entry) =>
                        renderCard(entry)
                      )}
                    </ul>
                  </section>
                )}
              </section>
            )
            : groups.map(({ group, entries }) => {
              const collapsed = preferences.value.collapsedGroups.includes(
                group,
              );
              const expanded = !collapsed;
              return (
                <section
                  key={group}
                  data-discern-builder-component-group={group}
                >
                  <h3>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => preferences.toggleGroup(group)}
                    >
                      <span>{group}</span>
                      <span>{entries.length} Components</span>
                    </button>
                  </h3>
                  {expanded
                    ? (
                      <ul>
                        {entries.map((entry) => renderCard(entry, contextual))}
                      </ul>
                    )
                    : null}
                </section>
              );
            })
          : (
            <section data-discern-builder-template-directory={activeCategory}>
              <h3>
                {activeCategory === "starters" ? "Starter patterns" : "Blocks"}
                <span>{templateEntries.length}</span>
              </h3>
              <ul>{templateEntries.map((entry) => renderCard(entry))}</ul>
            </section>
          )}
        {empty
          ? (
            <div className="discern-builder-empty" role="status">
              <strong>
                {contextual
                  ? "No compatible results match."
                  : "No discovery results match."}
              </strong>
              <p>
                {contextual
                  ? "The current query does not match a Component for this target."
                  : "Try the complete Component directory or clear one filter."}
              </p>
              <div>
                {query.trim() === ""
                  ? null
                  : (
                    <button type="button" onClick={() => setQuery("")}>
                      {contextual
                        ? "Return to compatible Components"
                        : "Clear search"}
                    </button>
                  )}
                {purpose === undefined || contextual
                  ? null
                  : (
                    <button type="button" onClick={() => setPurpose(undefined)}>
                      Clear purpose
                    </button>
                  )}
                {!contextual
                  ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCategory("components");
                        setPurpose(undefined);
                        setQuery("");
                      }}
                    >
                      View all Components
                    </button>
                  )
                  : null}
              </div>
            </div>
          )
          : null}
      </div>
    </aside>
  );
}
