import {
  ComponentDetailBreadcrumb,
  ComponentDetailNavigation,
} from "./detail-navigation.tsx";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { SegmentedControl } from "../../../src/components/forms/segmented-control/segmented-control.tsx";
import type { RegistryEntry } from "../../generated/registry.ts";
import { catalogueDecisionCopyProps } from "../../metadata-copy.ts";
import type { CatalogueTerminalPresentation } from "../../terminal-theme.ts";
import { announceCatalogueLocationChange } from "../../shell/location.ts";
import { preserveComponentReturnHref } from "./return-context.ts";
import { CopyableCode } from "../shared.tsx";
import type { CatalogueSurface } from "../shared.tsx";
import {
  ComponentEvidence,
  ComponentExampleControl,
  ComponentSourceActions,
  ComponentSpecimen,
} from "./component-preview.tsx";
import { ComponentDetailPlayground } from "./detail-playground.tsx";
import { ComponentStateStrip } from "./detail-states.tsx";
import { DetailStage } from "./detail-stage.tsx";
import {
  componentDetailFitWidth,
  componentDetailHref,
  type ComponentDetailState,
  type ComponentDetailView,
  componentDetailView,
  parseComponentDetailState,
} from "./detail-state.ts";

function ViewUnavailable(
  { view }: { readonly view: ComponentDetailView },
) {
  return (
    <div
      className="discern-catalogue-component__unavailable"
      data-discern-view-unavailable={view}
      role="status"
    >
      <strong>The Playground edits the Web adapter.</strong>
      <p {...catalogueDecisionCopyProps}>
        Switch to the Web surface to adjust the starter; the CLI surface renders
        canonical example frames.
      </p>
    </div>
  );
}

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

  const navigate = (
    next: ComponentDetailState,
    options: Readonly<{ anchor?: boolean; replace?: boolean }> = {},
  ): void => {
    // Filter-style inspection controls replace the current entry; selection
    // changes push, matching the Catalogue-wide URL-state convention.
    globalThis.history[options.replace === true ? "replaceState" : "pushState"](
      null,
      "",
      preserveComponentReturnHref(
        new URL(globalThis.location.href),
        componentDetailHref(entry, next, { anchor: options.anchor ?? true }),
      ),
    );
    setState(next);
    announceCatalogueLocationChange();
  };

  const view = state.view;
  const width = state.width ?? componentDetailFitWidth;
  const expanded = state.expanded === true;
  const stage = (canvas: ReactNode) => (
    <DetailStage
      slug={entry.meta.slug}
      label={entry.meta.name}
      width={width}
      expanded={expanded}
      widthApplies={state.surface === "web"}
      onWidthChange={(next) =>
        navigate({ ...state, width: next }, { anchor: false, replace: true })}
      onExpandedChange={(next) =>
        navigate({ ...state, expanded: next }, {
          anchor: false,
          replace: true,
        })}
    >
      {canvas}
    </DetailStage>
  );

  return (
    <div
      className={`discern-catalogue-page discern-catalogue-detail${
        expanded ? " discern-catalogue-detail--expanded" : ""
      }`}
    >
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
        </header>
        <div className="discern-catalogue-detail__controls">
          <SegmentedControl
            className="discern-catalogue-detail__control"
            label="Surface"
            name={`detail-surface-${entry.meta.slug}`}
            value={state.surface}
            onValueChange={(candidate) => {
              const next: CatalogueSurface = candidate === "cli"
                ? "cli"
                : "web";
              onSurfaceChange(next);
              navigate({ ...state, surface: next });
            }}
            items={[
              { value: "web", label: "Web" },
              { value: "cli", label: "CLI" },
            ]}
          />
          <SegmentedControl
            className="discern-catalogue-detail__control"
            label="View"
            name={`detail-view-${entry.meta.slug}`}
            value={view}
            onValueChange={(candidate) =>
              navigate(
                { ...state, view: componentDetailView(candidate) },
                { anchor: false },
              )}
            items={[
              { value: "single", label: "One example" },
              {
                value: "all",
                label: `All ${String(entry.canonicalExamples.length)}`,
              },
              { value: "states", label: "States" },
              { value: "playground", label: "Playground" },
            ]}
          />
          {view === "single" || view === "all"
            ? (
              <ComponentExampleControl
                entry={entry}
                surface={state.surface}
                exampleId={state.exampleId}
                onChange={(exampleId) => navigate({ ...state, exampleId })}
              />
            )
            : null}
        </div>
        {view === "playground"
          ? state.surface === "cli"
            ? <ViewUnavailable view="playground" />
            : (
              <ComponentDetailPlayground
                entry={entry}
                renderStage={stage}
                key={entry.meta.slug}
              />
            )
          : view === "states"
          ? (
            <ComponentStateStrip
              entry={entry}
              theme={terminalPresentation.theme}
              state={state}
            />
          )
          : stage(
            <ComponentSpecimen
              entry={entry}
              surface={state.surface}
              exampleId={state.exampleId}
              view={view === "all" ? "all" : "single"}
              terminalPresentation={terminalPresentation}
              headingLevel={2}
            />,
          )}
        <section
          className="discern-catalogue-detail__adopt"
          aria-label={`Adopt ${entry.meta.name}`}
        >
          <header>
            <h2>Use this Component</h2>
            {view === "playground" ? null : (
              <button
                type="button"
                className="discern-catalogue-detail__adopt-playground"
                onClick={() =>
                  navigate({ ...state, view: "playground" }, {
                    anchor: false,
                  })}
              >
                Open the Playground for editable starter code
              </button>
            )}
          </header>
          <CopyableCode
            label="React import"
            value={entry.selection.reactImport}
          />
          <CopyableCode
            label="Component selection"
            value={entry.selection.component}
          />
          <CopyableCode
            label="Group selection"
            value={entry.selection.group}
          />
        </section>
        <ComponentEvidence entry={entry} sections={["guidance", "api"]} />
        <div className="discern-catalogue-detail__sources">
          <span {...catalogueDecisionCopyProps}>
            Implementation evidence
          </span>
          <ComponentSourceActions entry={entry} />
        </div>
      </article>
      <ComponentDetailNavigation entry={entry} state={state} />
    </div>
  );
}
