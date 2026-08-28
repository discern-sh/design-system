import {
  type CataloguePurpose,
  cataloguePurposes,
  type ComponentGroup,
  componentGroups,
} from "../../../src/types/component-meta.ts";
import type { RegistryEntry } from "../../generated/registry.ts";
import {
  compareHref,
  componentGroupHref,
  componentPurposeHref,
  purposeDetails,
} from "../shared.tsx";

export type ComponentCollection =
  | {
    readonly kind: "group";
    readonly id: `group:${string}`;
    readonly group: ComponentGroup;
    readonly label: ComponentGroup;
    readonly description: string;
    readonly members: readonly RegistryEntry[];
    readonly browseHref: string;
    readonly compareHref: string;
  }
  | {
    readonly kind: "purpose";
    readonly id: `purpose:${CataloguePurpose}`;
    readonly purpose: CataloguePurpose;
    readonly label: string;
    readonly description: string;
    readonly members: readonly RegistryEntry[];
    readonly browseHref: string;
    readonly compareHref: string;
  };

export interface ComponentDirectory {
  readonly components: readonly RegistryEntry[];
  readonly groups: readonly Extract<ComponentCollection, { kind: "group" }>[];
  readonly purposes: readonly Extract<
    ComponentCollection,
    { kind: "purpose" }
  >[];
}

/**
 * One projection of canonical Component membership for discovery, search,
 * Compare scopes, sidebar entries, counts, summaries, and image mosaics.
 */
export function componentDirectory(
  components: readonly RegistryEntry[],
): ComponentDirectory {
  return {
    components,
    groups: componentGroups.flatMap((group) => {
      const members = components.filter(({ meta }) => meta.group === group);
      return members.length === 0 ? [] : [{
        kind: "group" as const,
        id: `group:${group.toLowerCase()}` as const,
        group,
        label: group,
        description: `${group} Components`,
        members,
        browseHref: componentGroupHref(group),
        compareHref: compareHref({ group }),
      }];
    }),
    purposes: cataloguePurposes.flatMap((purpose) => {
      const members = components.filter(({ meta }) =>
        meta.purposes?.includes(purpose)
      );
      return members.length === 0 ? [] : [{
        kind: "purpose" as const,
        id: `purpose:${purpose}` as const,
        purpose,
        label: purposeDetails[purpose].label,
        description: purposeDetails[purpose].description,
        members,
        browseHref: componentPurposeHref(purpose),
        compareHref: compareHref({ purpose }),
      }];
    }),
  };
}
