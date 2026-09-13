/** An explicit caller-owned routine label; omission is a boundary. */
export interface RoutineRecord {
  readonly routineGroup?: string;
}

/** One record's place in an adjacent, compatible routine run. */
export interface RoutinePosition {
  readonly label: string;
  readonly size: number;
  readonly continued: boolean;
}

/** Group only adjacent, explicitly marked compatible records; never reorder them. */
export function routinePositions<T extends RoutineRecord>(
  records: readonly T[],
  compatible: (left: T, right: T) => boolean,
): readonly (RoutinePosition | undefined)[] {
  const positions: (RoutinePosition | undefined)[] = records.map(() =>
    undefined
  );
  for (let start = 0; start < records.length;) {
    const first = records[start]!;
    const label = first.routineGroup;
    let end = start + 1;
    if (label !== undefined && label.trim() !== "") {
      while (
        end < records.length && records[end]!.routineGroup === label &&
        compatible(records[end - 1]!, records[end]!)
      ) end++;
      if (end - start > 1) {
        for (let index = start; index < end; index++) {
          positions[index] = {
            label,
            size: end - start,
            continued: index > start,
          };
        }
      }
    }
    start = end;
  }
  return positions;
}
