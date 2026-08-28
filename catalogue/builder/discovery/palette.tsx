import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import {
  type CataloguePurpose,
  cataloguePurposes,
  componentGroups,
} from "../../../src/types/component-meta.ts";
import { Select } from "../../../src/components/forms/select/select.tsx";
import { instantiateComponent } from "../registry-core.ts";
import { renderBuilderChild, rendersFromDefaults } from "../render.tsx";
import type { BuilderTreeController } from "../tree/controller.ts";
import { writeBuilderDragPayload } from "../tree/drag.ts";
import { BuilderBoundary } from "../workspace/error-boundary.tsx";
import {
  discoveryRecordsForGroup,
  filterBuilderComponents,
} from "./registry.ts";

/** Existing lazy live preview retained until the discovery redesign owns images. */
function PalettePreview({ slug }: Readonly<{ slug: string }>) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (element === null) return;
    element.inert = true;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "200px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const instance = useMemo(
    () =>
      visible && rendersFromDefaults(slug) ? instantiateComponent(slug) : null,
    [visible, slug],
  );
  const glyph = <span className="discern-builder-palette__glyph">▢</span>;
  return (
    <div
      ref={ref}
      className="discern-builder-palette__preview"
      aria-hidden="true"
    >
      {instance === null ? glyph : (
        <BuilderBoundary fallback={() => glyph}>
          <div className="discern-builder-palette__preview-stage">
            {renderBuilderChild(instance)}
          </div>
        </BuilderBoundary>
      )}
    </div>
  );
}

/** Palette search/filter state and contextual Component picking. */
export function BuilderDiscovery(
  { tree, onActive }: Readonly<{
    tree: BuilderTreeController;
    onActive: () => void;
  }>,
) {
  const [query, setQuery] = useState("");
  const [purpose, setPurpose] = useState<CataloguePurpose | undefined>();
  const results = useMemo(
    () => filterBuilderComponents(query, purpose),
    [query, purpose],
  );
  const groups = componentGroups.flatMap((group) => {
    const entries = discoveryRecordsForGroup(results, group);
    return entries.length === 0 ? [] : [{ group, entries }];
  });
  const pending = tree.pendingInsertionTarget;
  const startDrag = (slug: string, event: DragEvent): void => {
    writeBuilderDragPayload(event.dataTransfer, { type: "palette", slug });
    tree.setDragging(true);
  };
  return (
    <aside
      className="discern-builder-sidebar"
      id="discern-builder-pane-palette"
      role="tabpanel"
      aria-labelledby="discern-builder-tab-palette"
      onFocusCapture={onActive}
      data-discern-builder-insertion-target={tree.insertionTarget.label}
    >
      <label className="discern-builder-search">
        <span aria-hidden="true">⌕</span>
        <span className="discern-visually-hidden">Search components</span>
        <input
          id="discern-builder-component-search"
          type="search"
          value={query}
          placeholder="Search components"
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </label>
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
              label: candidate,
            })),
          ]}
        />
      </label>
      <div className="discern-builder-palette">
        {pending === null
          ? null
          : (
            <p className="discern-builder-palette__pending" role="status">
              Pick a component for <strong>{pending.label}</strong>{" "}
              — Esc cancels.
            </p>
          )}
        {groups.map(({ group, entries }) => (
          <section key={group}>
            <h3>{group}</h3>
            <ul>
              {entries.map(({ record }) => {
                const core = record.payload?.core;
                if (core === undefined) return null;
                const { meta } = core.registry;
                return (
                  <li key={meta.slug}>
                    <PalettePreview slug={meta.slug} />
                    <button
                      type="button"
                      draggable
                      title={meta.description}
                      aria-label={`Place ${meta.name}`}
                      onClick={() => tree.placeComponent(meta.slug)}
                      onDragStart={(event) => startDrag(meta.slug, event)}
                    >
                      <span>{meta.name}</span>
                      <small>{meta.description}</small>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {groups.length === 0 ? <p>No components match.</p> : null}
      </div>
    </aside>
  );
}
