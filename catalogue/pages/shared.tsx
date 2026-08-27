import { Kicker } from "../../src/components/display/kicker/kicker.tsx";
import { CopyButton } from "../../src/components/docs/copy-button/copy-button.tsx";
import {
  type CataloguePurpose,
  cataloguePurposes,
  type ComponentGroup,
  componentGroups,
} from "../../src/types/component-meta.ts";
import type { RegistryEntry } from "../generated/registry.ts";
import { catalogueGroupSlug, catalogueRoutePaths } from "../routes.ts";

export type CatalogueSurface = "web" | "cli";

export const purposeDetails = {
  "building-documentation": {
    label: "Building documentation",
    description: "Long-form guidance, reference, and documentation chrome.",
  },
  "displaying-tool-output": {
    label: "Displaying tool output",
    description: "Runs, diagnostics, artifacts, and machine evidence.",
  },
  "procedural-workflow": {
    label: "Procedural workflow",
    description: "Executable steps, choices, recovery, and proof.",
  },
  "marketing-site": {
    label: "Marketing site",
    description: "Product narrative, trust, comparison, and conversion.",
  },
} satisfies Record<
  CataloguePurpose,
  { readonly label: string; readonly description: string }
>;

export function cataloguePurpose(
  value: string | null,
): CataloguePurpose | undefined {
  return cataloguePurposes.find((purpose) => purpose === value);
}

export function catalogueSurface(value: string | null): CatalogueSurface {
  return value === "cli" ? "cli" : "web";
}

export function stateFragmentId(component: string, state: string): string {
  return `component-${component}--${state}`;
}

export function groupComponentEntries(entries: readonly RegistryEntry[]) {
  return componentGroups.map((group) => ({
    group,
    entries: entries.filter(({ meta }) => meta.group === group),
  })).filter(({ entries: groupedEntries }) => groupedEntries.length);
}

export function catalogueHref(
  path: string,
  parameters: Readonly<Record<string, string | undefined>> = {},
): string {
  const url = new URL(path, "https://catalogue.invalid");
  for (const [name, value] of Object.entries(parameters)) {
    if (value === undefined) url.searchParams.delete(name);
    else url.searchParams.set(name, value);
  }
  return url.pathname + url.search + url.hash;
}

export function componentGroupHref(group: ComponentGroup): string {
  return catalogueHref(catalogueRoutePaths.components, {
    group: catalogueGroupSlug(group),
  });
}

export function componentPurposeHref(purpose: CataloguePurpose): string {
  return catalogueHref(catalogueRoutePaths.components, { purpose });
}

export function compareHref(
  {
    group,
    purpose,
    all,
    surface,
  }: {
    readonly group?: ComponentGroup | undefined;
    readonly purpose?: CataloguePurpose | undefined;
    readonly all?: boolean;
    readonly surface?: CatalogueSurface;
  },
): string {
  return catalogueHref(catalogueRoutePaths.compare, {
    group: group === undefined ? undefined : catalogueGroupSlug(group),
    purpose,
    scope: all ? "all" : undefined,
    surface: surface === "cli" ? "cli" : undefined,
  });
}

export function CataloguePageHeader(
  {
    index,
    eyebrow,
    title,
    description,
  }: {
    readonly index: string;
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
  },
) {
  return (
    <header className="discern-catalogue-page__header">
      <Kicker index={index}>— {eyebrow}</Kicker>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

export function CatalogueRouteCard(
  {
    href,
    eyebrow,
    title,
    description,
    count,
  }: {
    readonly href: string;
    readonly eyebrow?: string;
    readonly title: string;
    readonly description: string;
    readonly count?: number | string;
  },
) {
  return (
    <a className="discern-catalogue-route-card" href={href}>
      {eyebrow === undefined ? null : <span>{eyebrow}</span>}
      <h2>{title}</h2>
      <p>{description}</p>
      {count === undefined ? null : <small>{count}</small>}
    </a>
  );
}

export function CopyableCode(
  { label, value }: { readonly label: string; readonly value: string },
) {
  return (
    <div className="discern-catalogue-copyable">
      <span>{label}</span>
      <code>{value}</code>
      <CopyButton
        value={value}
        label={`Copy ${label.toLowerCase()}`}
        copiedLabel={`${label} copied`}
      />
    </div>
  );
}
