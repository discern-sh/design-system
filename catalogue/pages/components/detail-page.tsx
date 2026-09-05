import {
  ComponentDetailBreadcrumb,
  ComponentDetailNavigation,
} from "./detail-navigation.tsx";
import { useEffect, useState } from "react";
import type { RegistryEntry } from "../../generated/registry.ts";
import { catalogueDecisionCopyProps } from "../../metadata-copy.ts";
import type { CatalogueTerminalPresentation } from "../../terminal-theme.ts";
import { announceCatalogueLocationChange } from "../../shell/location.ts";
import { preserveCatalogueAppearanceHref } from "../../shell/appearance-state.ts";
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
} from "./detail-state.ts";

export function ComponentDetailPage(
  { entry, surface, terminalPresentation, onSurfaceChange }: {
    readonly entry: RegistryEntry;
    readonly surface: CatalogueSurface;
    readonly terminalPresentation: CatalogueTerminalPresentation;
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
      preserveCatalogueAppearanceHref(
        new URL(globalThis.location.href),
        componentDetailHref(entry, next, { anchor }),
      ),
    );
    setState(next);
    announceCatalogueLocationChange();
  };

  return (
    <div className="discern-catalogue-page discern-catalogue-detail">
      <ComponentDetailBreadcrumb entry={entry} />
      <article
        className="discern-catalogue-component discern-catalogue-component--detail"
        id={`component-${entry.meta.slug}`}
        data-discern-component={entry.meta.slug}
      >
        <header className="discern-catalogue-detail__identity">
          <div className="discern-catalogue-component__identity">
            <h1>{entry.meta.name}</h1>
            <p {...catalogueDecisionCopyProps}>{entry.meta.description}</p>
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
          terminalPresentation={terminalPresentation}
          headingLevel={2}
        />
        <ComponentEvidence entry={entry} />
      </article>
      <ComponentDetailNavigation entry={entry} state={state} />
    </div>
  );
}
