import { useEffect, useState } from "react";
import type { TerminalThemeVariant } from "../../../src/cli/theme.ts";
import { registry } from "../../generated/registry.ts";
import type { RegistryEntry } from "../../generated/registry.ts";
import { catalogueRoutePaths } from "../../routes.ts";
import { announceCatalogueLocationChange } from "../../shell/location.ts";
import { catalogueHref, componentGroupHref } from "../shared.tsx";
import type { CatalogueSurface } from "../shared.tsx";
import {
  ComponentEvidence,
  ComponentExampleControl,
  ComponentSourceActions,
  ComponentSpecimen,
  ComponentSurfaceControl,
} from "./component-preview.tsx";
import {
  componentDetailHref,
  type ComponentDetailState,
  parseComponentDetailState,
} from "./state.ts";

export function ComponentDetailPage(
  { entry, surface, terminalTheme, onSurfaceChange }: {
    readonly entry: RegistryEntry;
    readonly surface: CatalogueSurface;
    readonly terminalTheme: TerminalThemeVariant;
    readonly onSurfaceChange: (surface: CatalogueSurface) => void;
  },
) {
  const readState = () =>
    parseComponentDetailState(
      entry,
      new URL(globalThis.location.href),
      surface,
    );
  const [state, setState] = useState(readState);
  useEffect(() => {
    const restore = () => setState(readState());
    globalThis.addEventListener("popstate", restore);
    globalThis.addEventListener("hashchange", restore);
    return () => {
      globalThis.removeEventListener("popstate", restore);
      globalThis.removeEventListener("hashchange", restore);
    };
  }, [entry.meta.slug, surface]);

  const navigate = (next: ComponentDetailState, anchor = true): void => {
    globalThis.history.pushState(
      null,
      "",
      componentDetailHref(entry, next, { anchor }),
    );
    setState(next);
    announceCatalogueLocationChange();
  };
  const grouped = registry.filter(({ meta }) => meta.group === entry.meta.group)
    .toSorted((left, right) => left.meta.order - right.meta.order);
  const index = grouped.findIndex(({ meta }) => meta.slug === entry.meta.slug);
  const previous = index > 0 ? grouped[index - 1] : undefined;
  const next = index >= 0 && index < grouped.length - 1
    ? grouped[index + 1]
    : undefined;
  const neighbourHref = (candidate: RegistryEntry) =>
    componentDetailHref(candidate, {
      ...state,
      exampleId: candidate.canonicalExamples.some(({ id }) =>
          id === state.exampleId
        )
        ? state.exampleId
        : candidate.canonicalExamples[0]?.id ?? "default",
    });
  const compareHref = catalogueHref(catalogueRoutePaths.compare, {
    components: entry.meta.slug,
    surface: state.surface === "cli" ? "cli" : undefined,
    examples: `${entry.meta.slug}:${state.exampleId}`,
  });

  return (
    <div className="discern-catalogue-page discern-catalogue-detail">
      <nav className="discern-catalogue-breadcrumb" aria-label="Breadcrumb">
        <a href={catalogueRoutePaths.components}>Components</a>
        <span aria-hidden="true">/</span>
        <a href={componentGroupHref(entry.meta.group)}>{entry.meta.group}</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{entry.meta.name}</span>
      </nav>
      <article
        className="discern-catalogue-component discern-catalogue-component--detail"
        id={`component-${entry.meta.slug}`}
        data-discern-component={entry.meta.slug}
      >
        <header className="discern-catalogue-detail__identity">
          <div className="discern-catalogue-component__identity">
            <h1>{entry.meta.name}</h1>
            <p>{entry.meta.description}</p>
          </div>
          <ComponentSourceActions entry={entry} />
        </header>
        <div className="discern-catalogue-detail__controls">
          <ComponentSurfaceControl
            entry={entry}
            surface={state.surface}
            onChange={(candidate) => {
              onSurfaceChange(candidate);
              navigate({ ...state, surface: candidate });
            }}
          />
          <ComponentExampleControl
            entry={entry}
            surface={state.surface}
            exampleId={state.exampleId}
            onChange={(exampleId) => navigate({ ...state, exampleId })}
          />
          <button
            type="button"
            className="discern-catalogue-detail__view-all"
            aria-pressed={state.view === "all"}
            onClick={() =>
              navigate({
                ...state,
                view: state.view === "all" ? "single" : "all",
              }, false)}
          >
            {state.view === "all"
              ? "Show selected example"
              : `View all ${entry.canonicalExamples.length} examples`}
          </button>
        </div>
        <ComponentSpecimen
          entry={entry}
          surface={state.surface}
          exampleId={state.exampleId}
          view={state.view}
          terminalTheme={terminalTheme}
          headingLevel={2}
        />
        <ComponentEvidence entry={entry} />
      </article>
      <nav
        className="discern-catalogue-detail__continuation"
        aria-label="Component continuation"
      >
        <span>
          {previous === undefined
            ? null
            : (
              <a rel="prev" href={neighbourHref(previous)}>
                ← {previous.meta.name}
              </a>
            )}
        </span>
        <a href={compareHref}>Compare {entry.meta.name}</a>
        <span>
          {next === undefined
            ? null
            : <a rel="next" href={neighbourHref(next)}>{next.meta.name} →</a>}
        </span>
      </nav>
    </div>
  );
}
