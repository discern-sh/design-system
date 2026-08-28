/** Guarded comfort preferences for Builder discovery acceleration and density. */
import { useState } from "react";
import { componentGroups } from "../../../src/types/component-meta.ts";
import {
  browserBuilderStorage,
  type GuardedBuilderStorage,
} from "../persistence.ts";

export const BUILDER_DISCOVERY_STORAGE_KEY =
  "discern-builder-discovery-preferences";

export const builderPaletteDensities = ["visual", "compact"] as const;
export type BuilderPaletteDensity = (typeof builderPaletteDensities)[number];

export const BUILDER_RECENT_LIMIT = 8;
export const BUILDER_FAVOURITE_LIMIT = 40;

/** One failure-contained preference document; ids resolve through live records. */
export interface BuilderDiscoveryPreferences {
  readonly density: BuilderPaletteDensity;
  readonly collapsedGroups: readonly string[];
  readonly recentIds: readonly string[];
  readonly favouriteIds: readonly string[];
}

export const defaultBuilderDiscoveryPreferences: BuilderDiscoveryPreferences =
  Object.freeze({
    density: "visual",
    collapsedGroups: Object.freeze([]),
    recentIds: Object.freeze([]),
    favouriteIds: Object.freeze([]),
  });

function strings(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function boundedLiveIds(
  value: unknown,
  liveIds: ReadonlySet<string>,
  limit: number,
): readonly string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const id of strings(value)) {
    if (!liveIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length === limit) break;
  }
  return Object.freeze(ids);
}

/** Parse, bound, deduplicate, and remove stale ids from unknown storage data. */
export function normaliseBuilderDiscoveryPreferences(
  value: unknown,
  liveIds: ReadonlySet<string>,
): BuilderDiscoveryPreferences {
  const source = typeof value === "object" && value !== null &&
      !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const density = source.density === "compact" ? "compact" : "visual";
  const liveGroups = new Set<string>(componentGroups);
  const collapsedGroups = Object.freeze(
    [...new Set(strings(source.collapsedGroups))].filter((group) =>
      liveGroups.has(group)
    ),
  );
  return Object.freeze({
    density,
    collapsedGroups,
    recentIds: boundedLiveIds(
      source.recentIds,
      liveIds,
      BUILDER_RECENT_LIMIT,
    ),
    favouriteIds: boundedLiveIds(
      source.favouriteIds,
      liveIds,
      BUILDER_FAVOURITE_LIMIT,
    ),
  });
}

function serialized(preferences: BuilderDiscoveryPreferences): string {
  return JSON.stringify(preferences);
}

/** Restore comfort state; denied or corrupt storage becomes safe defaults. */
export function restoreBuilderDiscoveryPreferences(
  storage: GuardedBuilderStorage,
  liveIds: ReadonlySet<string>,
): BuilderDiscoveryPreferences {
  const result = storage.read(BUILDER_DISCOVERY_STORAGE_KEY);
  if (!result.ok || result.value === null) {
    return defaultBuilderDiscoveryPreferences;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.value);
  } catch {
    storage.write(
      BUILDER_DISCOVERY_STORAGE_KEY,
      serialized(defaultBuilderDiscoveryPreferences),
    );
    return defaultBuilderDiscoveryPreferences;
  }
  const preferences = normaliseBuilderDiscoveryPreferences(parsed, liveIds);
  if (serialized(preferences) !== result.value) {
    storage.write(BUILDER_DISCOVERY_STORAGE_KEY, serialized(preferences));
  }
  return preferences;
}

/** Persist a preference without allowing storage failure to affect discovery. */
export function persistBuilderDiscoveryPreferences(
  storage: GuardedBuilderStorage,
  preferences: BuilderDiscoveryPreferences,
): void {
  storage.write(BUILDER_DISCOVERY_STORAGE_KEY, serialized(preferences));
}

/** Move one successfully placed Component or Block to the front of Recent. */
export function recordRecentDiscoveryId(
  preferences: BuilderDiscoveryPreferences,
  id: string,
  liveIds: ReadonlySet<string>,
): BuilderDiscoveryPreferences {
  if (!liveIds.has(id)) return preferences;
  return Object.freeze({
    ...preferences,
    recentIds: Object.freeze(
      [id, ...preferences.recentIds.filter((candidate) => candidate !== id)]
        .slice(0, BUILDER_RECENT_LIMIT),
    ),
  });
}

/** Toggle one live Component or Block favourite, preserving bounded order. */
export function toggleFavouriteDiscoveryId(
  preferences: BuilderDiscoveryPreferences,
  id: string,
  liveIds: ReadonlySet<string>,
): BuilderDiscoveryPreferences {
  if (!liveIds.has(id)) return preferences;
  const exists = preferences.favouriteIds.includes(id);
  return Object.freeze({
    ...preferences,
    favouriteIds: Object.freeze(
      (exists
        ? preferences.favouriteIds.filter((candidate) => candidate !== id)
        : [id, ...preferences.favouriteIds]).slice(0, BUILDER_FAVOURITE_LIMIT),
    ),
  });
}

export interface BuilderDiscoveryPreferencesController {
  readonly value: BuilderDiscoveryPreferences;
  readonly setDensity: (density: BuilderPaletteDensity) => void;
  readonly toggleGroup: (group: string) => void;
  readonly recordRecent: (id: string) => void;
  readonly toggleFavourite: (id: string) => void;
}

const discoveryStorage = browserBuilderStorage();

/** Browser hook over the pure guarded preference transitions above. */
export function useBuilderDiscoveryPreferences(
  liveIds: ReadonlySet<string>,
): BuilderDiscoveryPreferencesController {
  const [value, setValue] = useState(() =>
    restoreBuilderDiscoveryPreferences(discoveryStorage, liveIds)
  );
  const update = (
    transition: (
      current: BuilderDiscoveryPreferences,
    ) => BuilderDiscoveryPreferences,
  ): void => {
    setValue((current) => {
      const next = transition(current);
      persistBuilderDiscoveryPreferences(discoveryStorage, next);
      return next;
    });
  };
  return {
    value,
    setDensity: (density) => update((current) => ({ ...current, density })),
    toggleGroup: (group) =>
      update((current) => ({
        ...current,
        collapsedGroups: current.collapsedGroups.includes(group)
          ? current.collapsedGroups.filter((candidate) => candidate !== group)
          : [...current.collapsedGroups, group],
      })),
    recordRecent: (id) =>
      update((current) => recordRecentDiscoveryId(current, id, liveIds)),
    toggleFavourite: (id) =>
      update((current) => toggleFavouriteDiscoveryId(current, id, liveIds)),
  };
}
