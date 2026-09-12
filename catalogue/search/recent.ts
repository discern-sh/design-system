import type { SearchRecord } from "./search.ts";

export const catalogueRecentStorageKey =
  "discern-catalogue-recent-destinations";
export const catalogueRecentLimit = 5;

/** History stores only identities; current route records supply every label and URL. */
export function recentCatalogueRecords(
  records: readonly SearchRecord[],
  stored: string | null,
): readonly SearchRecord[] {
  if (stored === null || stored.length > 4096) return [];
  try {
    const ids: unknown = JSON.parse(stored);
    if (!Array.isArray(ids)) return [];
    const byId = new Map(records.map((record) => [record.id, record]));
    return [...new Set(ids.slice(0, 100))].flatMap((id) => {
      const record = typeof id === "string" ? byId.get(id) : undefined;
      return record === undefined ? [] : [record];
    }).slice(0, catalogueRecentLimit);
  } catch {
    return [];
  }
}

export function rememberCatalogueRecord(
  recent: readonly SearchRecord[],
  record: SearchRecord,
): readonly SearchRecord[] {
  return [record, ...recent.filter((item) => item.id !== record.id)].slice(
    0,
    catalogueRecentLimit,
  );
}
