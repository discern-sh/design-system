import {
  type ComponentBehavior,
  componentBehaviors,
} from "../../../src/types/component-meta.ts";
import {
  catalogueGroupFromSlug,
  catalogueGroupSlug,
  catalogueRoutePaths,
} from "../../routes.ts";
import { catalogueHref, cataloguePurpose } from "../shared.tsx";
import type {
  CataloguePurpose,
  ComponentGroup,
} from "../../../src/types/component-meta.ts";

export interface ComponentExplorerState {
  readonly query: string;
  readonly group?: ComponentGroup;
  readonly purpose?: CataloguePurpose;
  readonly showAll: boolean;
  readonly availability?: "web" | "cli";
  readonly behavior?: ComponentBehavior;
}

/** Parse only valid, reproducible discovery controls from one Components URL. */
export function parseComponentExplorerState(url: URL): ComponentExplorerState {
  const group = catalogueGroupFromSlug(url.searchParams.get("group"));
  const purpose = cataloguePurpose(url.searchParams.get("purpose"));
  const availability = url.searchParams.get("availability");
  const behavior = componentBehaviors.find((value) =>
    value === url.searchParams.get("behavior")
  );
  return {
    ...(availability === "web" || availability === "cli"
      ? { availability }
      : {}),
    ...(behavior === undefined ? {} : { behavior }),
    query: url.searchParams.get("q") ?? "",
    ...(group === undefined ? {} : { group }),
    ...(purpose === undefined ? {} : { purpose }),
    showAll: url.searchParams.get("all") === "1",
  };
}

/** Serialize discovery state in one stable parameter order. */
export function componentExplorerHref(state: ComponentExplorerState): string {
  return catalogueHref(catalogueRoutePaths.components, {
    q: state.query === "" ? undefined : state.query,
    group: state.group === undefined
      ? undefined
      : catalogueGroupSlug(state.group),
    purpose: state.purpose,
    all: state.showAll ? "1" : undefined,
    availability: state.availability,
    behavior: state.behavior,
  });
}
