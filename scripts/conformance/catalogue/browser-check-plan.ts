import type { CatalogueRouteDescriptor } from "../../../catalogue/routes.ts";

export const catalogueBrowserCheckPlan = Object.freeze(
  [
    Object.freeze({
      id: "components",
      familyIds: Object.freeze(["components", "compare"]),
      failureLabel: "Component contracts",
    }),
    Object.freeze({
      id: "foundations",
      familyIds: Object.freeze(["foundations"]),
      failureLabel: "Foundations Catalogue",
    }),
    Object.freeze({
      id: "compositions",
      familyIds: Object.freeze(["compositions"]),
      failureLabel: "Compositions Catalogue",
    }),
    Object.freeze({
      id: "terminal",
      familyIds: Object.freeze(["terminal"]),
      failureLabel: "Terminal Catalogue",
    }),
    Object.freeze({
      id: "appearance",
      familyIds: Object.freeze([]),
      failureLabel: "Cross-surface appearance",
    }),
    Object.freeze({
      id: "shell",
      familyIds: Object.freeze([]),
      failureLabel: "Catalogue shell",
    }),
    Object.freeze({
      id: "front-doors",
      familyIds: Object.freeze(["overview"]),
      failureLabel: "Catalogue front doors",
    }),
  ] as const,
);

export type CatalogueBrowserCheckId =
  (typeof catalogueBrowserCheckPlan)[number]["id"];

/** Ensure every routed family has exactly one family-owned browser check. */
export function assertCatalogueFamilyBrowserCoverage(
  families: readonly Pick<CatalogueRouteDescriptor, "id">[],
  plan: readonly {
    readonly id: string;
    readonly familyIds: readonly string[];
  }[] = catalogueBrowserCheckPlan,
): void {
  const knownFamilies = new Set(families.map(({ id }) => id));
  const checkIds = new Set<string>();
  const owners = new Map<string, string[]>();
  for (const check of plan) {
    if (checkIds.has(check.id)) {
      throw new Error(`Duplicate Catalogue browser check: ${check.id}`);
    }
    checkIds.add(check.id);
    for (const familyId of check.familyIds) {
      if (!knownFamilies.has(familyId as CatalogueRouteDescriptor["id"])) {
        throw new Error(
          `Catalogue browser check ${check.id} owns unknown family ${familyId}`,
        );
      }
      owners.set(familyId, [...(owners.get(familyId) ?? []), check.id]);
    }
  }
  for (const { id } of families) {
    const familyOwners = owners.get(id) ?? [];
    if (familyOwners.length !== 1) {
      throw new Error(
        `Catalogue route family ${id} needs exactly one family browser check; found ${
          familyOwners.length === 0 ? "none" : familyOwners.join(", ")
        }`,
      );
    }
  }
}

/** Keep the executable runner registry equal to the declared browser plan. */
export function assertCatalogueBrowserCheckRunners(
  runnerIds: readonly string[],
  plan: readonly { readonly id: string }[] = catalogueBrowserCheckPlan,
): void {
  const expected = plan.map(({ id }) => id).sort();
  const actual = [...new Set(runnerIds)].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Catalogue browser runners differ from the plan; expected ${
        expected.join(", ")
      }, received ${actual.join(", ")}`,
    );
  }
}
