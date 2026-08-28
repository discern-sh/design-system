import type {
  CataloguePurpose,
  ComponentGroup,
} from "../../../src/types/component-meta.ts";
import type { RegistryEntry } from "../../generated/registry.ts";
import {
  catalogueGroupFromSlug,
  catalogueGroupSlug,
  catalogueRoutePaths,
} from "../../routes.ts";
import { catalogueHref, cataloguePurpose, purposeDetails } from "../shared.tsx";
import type { CatalogueSurface } from "../shared.tsx";

export type CompareScope =
  | {
    readonly kind: "all";
    readonly title: "Complete system";
    readonly components: readonly RegistryEntry[];
  }
  | {
    readonly kind: "group";
    readonly group: ComponentGroup;
    readonly title: ComponentGroup;
    readonly components: readonly RegistryEntry[];
  }
  | {
    readonly kind: "purpose";
    readonly purpose: CataloguePurpose;
    readonly title: string;
    readonly components: readonly RegistryEntry[];
  }
  | {
    readonly kind: "custom";
    readonly title: "Custom comparison";
    readonly components: readonly RegistryEntry[];
  };

export interface CompareState {
  readonly scope?: CompareScope;
  readonly globalSurface: CatalogueSurface;
  readonly surfaceOverrides: Readonly<Record<string, CatalogueSurface>>;
  readonly exampleOverrides: Readonly<Record<string, string>>;
  readonly current?: string;
  readonly allComponents: readonly RegistryEntry[];
}

function customComponents(
  value: string | null,
  entries: readonly RegistryEntry[],
) {
  const selected = new Set((value ?? "").split(",").filter(Boolean));
  return entries.filter(({ meta }) => selected.has(meta.slug));
}

export function resolveCompareScope(
  parameters: URLSearchParams,
  entries: readonly RegistryEntry[],
): CompareScope | undefined {
  if (parameters.has("components")) {
    return {
      kind: "custom",
      title: "Custom comparison",
      components: customComponents(parameters.get("components"), entries),
    };
  }
  if (parameters.get("scope") === "all") {
    return { kind: "all", title: "Complete system", components: entries };
  }
  const group = catalogueGroupFromSlug(parameters.get("group"));
  if (group !== undefined) {
    return {
      kind: "group",
      group,
      title: group,
      components: entries.filter(({ meta }) => meta.group === group),
    };
  }
  const purpose = cataloguePurpose(parameters.get("purpose"));
  if (purpose !== undefined) {
    return {
      kind: "purpose",
      purpose,
      title: purposeDetails[purpose].label,
      components: entries.filter(({ meta }) =>
        meta.purposes?.includes(purpose)
      ),
    };
  }
  return undefined;
}

function pairs(value: string | null): readonly (readonly [string, string])[] {
  return (value ?? "").split(",").flatMap((part) => {
    const colon = part.indexOf(":");
    return colon <= 0
      ? []
      : [[part.slice(0, colon), part.slice(colon + 1)] as const];
  });
}

/** Parse the complete reproducible Compare workspace from one URL. */
export function parseCompareState(
  url: URL,
  entries: readonly RegistryEntry[],
): CompareState {
  const scope = resolveCompareScope(url.searchParams, entries);
  const selected = new Map(
    scope?.components.map((entry) => [entry.meta.slug, entry]),
  );
  const globalSurface: CatalogueSurface =
    url.searchParams.get("surface") === "cli" ? "cli" : "web";
  const surfaceOverrides = Object.fromEntries(
    pairs(url.searchParams.get("surfaces")).filter(([slug, surface]) =>
      selected.has(slug) && (surface === "web" || surface === "cli") &&
      surface !== globalSurface
    ),
  ) as Readonly<Record<string, CatalogueSurface>>;
  const exampleOverrides = Object.fromEntries(
    pairs(url.searchParams.get("examples")).filter(([slug, id]) =>
      selected.get(slug)?.canonicalExamples.some((example) => example.id === id)
    ),
  );
  const currentMatch = /^#compare-component-([a-z0-9]+(?:-[a-z0-9]+)*)$/u.exec(
    url.hash,
  );
  const current = currentMatch?.[1];
  return {
    ...(scope === undefined ? {} : { scope }),
    globalSurface,
    surfaceOverrides,
    exampleOverrides,
    ...(current !== undefined && selected.has(current) ? { current } : {}),
    allComponents: entries,
  };
}

/** Serialize Compare state in a canonical, copyable order. */
export function compareStateHref(state: CompareState): string {
  const scope = state.scope;
  const components = scope?.kind === "custom"
    ? scope.components.map(({ meta }) => meta.slug).join(",")
    : undefined;
  const group = scope?.kind === "group"
    ? catalogueGroupSlug(scope.group)
    : undefined;
  const purpose = scope?.kind === "purpose" ? scope.purpose : undefined;
  const all = scope?.kind === "all" ? "all" : undefined;
  const selected = new Set(scope?.components.map(({ meta }) => meta.slug));
  const surfacePairs = Object.entries(state.surfaceOverrides).filter((
    [slug, value],
  ) => selected.has(slug) && value !== state.globalSurface).map((
    [slug, value],
  ) => `${slug}:${value}`).join(",");
  const examplePairs = Object.entries(state.exampleOverrides).filter(([slug]) =>
    selected.has(slug)
  ).map(([slug, value]) => `${slug}:${value}`).join(",");
  const href = catalogueHref(catalogueRoutePaths.compare, {
    components,
    group,
    purpose,
    scope: all,
    surface: state.globalSurface === "cli" ? "cli" : undefined,
    surfaces: surfacePairs || undefined,
    examples: examplePairs || undefined,
  });
  return state.current === undefined
    ? href
    : `${href}#compare-component-${state.current}`;
}

export function setCompareGlobalSurface(
  state: CompareState,
  surface: CatalogueSurface,
): CompareState {
  return { ...state, globalSurface: surface, surfaceOverrides: {} };
}

export function setCompareComponentSurface(
  state: CompareState,
  slug: string,
  surface: CatalogueSurface,
): CompareState {
  const overrides = { ...state.surfaceOverrides };
  if (surface === state.globalSurface) delete overrides[slug];
  else overrides[slug] = surface;
  return { ...state, surfaceOverrides: overrides };
}

export function setCompareCustomComponents(
  state: CompareState,
  slugs: readonly string[],
): CompareState {
  const wanted = new Set(slugs);
  const components = state.allComponents.filter(({ meta }) =>
    wanted.has(meta.slug)
  );
  const selected = new Set(components.map(({ meta }) => meta.slug));
  const { current, ...rest } = state;
  return {
    ...rest,
    scope: { kind: "custom", title: "Custom comparison", components },
    surfaceOverrides: Object.fromEntries(
      Object.entries(state.surfaceOverrides).filter(([slug]) =>
        selected.has(slug)
      ),
    ),
    exampleOverrides: Object.fromEntries(
      Object.entries(state.exampleOverrides).filter(([slug]) =>
        selected.has(slug)
      ),
    ),
    ...(current !== undefined && selected.has(current) ? { current } : {}),
  };
}
