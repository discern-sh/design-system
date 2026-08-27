import type { TerminalThemeVariant } from "../../../src/cli/theme.ts";
import type { RegistryEntry } from "../../generated/registry.ts";
import { catalogueRoutePaths } from "../../routes.ts";
import { compareHref, componentGroupHref } from "../shared.tsx";
import type { CatalogueSurface } from "../shared.tsx";
import { ComponentPreview } from "./component-preview.tsx";

export function ComponentDetailPage(
  {
    entry,
    surface,
    terminalTheme,
    onSurfaceChange,
  }: {
    readonly entry: RegistryEntry;
    readonly surface: CatalogueSurface;
    readonly terminalTheme: TerminalThemeVariant;
    readonly onSurfaceChange: (surface: CatalogueSurface) => void;
  },
) {
  return (
    <div className="discern-catalogue-page discern-catalogue-detail">
      <nav className="discern-catalogue-breadcrumb" aria-label="Breadcrumb">
        <a href={catalogueRoutePaths.components}>Components</a>
        <span aria-hidden="true">/</span>
        <a href={componentGroupHref(entry.meta.group)}>{entry.meta.group}</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{entry.meta.name}</span>
      </nav>
      <ComponentPreview
        entry={entry}
        surface={surface}
        terminalTheme={terminalTheme}
        headingLevel={1}
        onSurfaceChange={onSurfaceChange}
      />
      <nav
        className="discern-catalogue-detail__continuation"
        aria-label="Component continuation"
      >
        <a href={componentGroupHref(entry.meta.group)}>
          Browse {entry.meta.group}
        </a>
        <a href={compareHref({ group: entry.meta.group })}>
          Compare {entry.meta.group}
        </a>
      </nav>
    </div>
  );
}
