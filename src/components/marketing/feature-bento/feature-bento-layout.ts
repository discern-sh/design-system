/** Canonical footprint names accepted by Feature bento items. */
export type FeatureBentoSize = "standard" | "wide" | "tall" | "large";

/** One source-ordered position in a strict Feature bento matrix. */
export interface FeatureBentoPlacement {
  readonly column: number;
  readonly row: number;
  readonly columnSpan: number;
  readonly rowSpan: number;
}

/** A complete rectangular Feature bento matrix. */
export interface FeatureBentoLayout {
  readonly columns: 2 | 4;
  readonly rows: number;
  readonly placements: readonly FeatureBentoPlacement[];
}

const footprints = {
  standard: { columnSpan: 1, rowSpan: 1 },
  wide: { columnSpan: 2, rowSpan: 1 },
  tall: { columnSpan: 1, rowSpan: 2 },
  large: { columnSpan: 2, rowSpan: 2 },
} as const satisfies Readonly<
  Record<
    FeatureBentoSize,
    Pick<FeatureBentoPlacement, "columnSpan" | "rowSpan">
  >
>;

/**
 * Place Feature bento footprints at the next source-order cell and require a
 * complete rectangle. A layout that needs backfilling is not a bento matrix.
 */
export function createFeatureBentoLayout(
  sizes: readonly FeatureBentoSize[],
  columns: 2 | 4,
): FeatureBentoLayout {
  if (sizes.length === 0) {
    throw new TypeError("Feature bento requires at least one item");
  }

  const occupied: boolean[][] = [];
  const placements: FeatureBentoPlacement[] = [];
  const isOccupied = (row: number, column: number): boolean =>
    occupied[row]?.[column] ?? false;

  for (const size of sizes) {
    const footprint = footprints[size];
    if (footprint === undefined) {
      throw new TypeError(`Feature bento received an unknown size: ${size}`);
    }

    let row = 0;
    let column = 0;
    let found = false;
    for (row = 0; !found; row += 1) {
      for (column = 0; column < columns; column += 1) {
        if (!isOccupied(row, column)) {
          found = true;
          break;
        }
      }
    }
    row -= 1;

    if (column + footprint.columnSpan > columns) {
      throw new TypeError(
        `Feature bento cannot place ${size} at the next source-order cell in its ${columns}-column rectangle`,
      );
    }
    for (
      let candidateRow = row;
      candidateRow < row + footprint.rowSpan;
      candidateRow += 1
    ) {
      for (
        let candidateColumn = column;
        candidateColumn < column + footprint.columnSpan;
        candidateColumn += 1
      ) {
        if (isOccupied(candidateRow, candidateColumn)) {
          throw new TypeError(
            `Feature bento cannot place ${size} at the next source-order cell in its ${columns}-column rectangle`,
          );
        }
      }
    }

    for (
      let candidateRow = row;
      candidateRow < row + footprint.rowSpan;
      candidateRow += 1
    ) {
      const cells = occupied[candidateRow] ??= [];
      for (
        let candidateColumn = column;
        candidateColumn < column + footprint.columnSpan;
        candidateColumn += 1
      ) {
        cells[candidateColumn] = true;
      }
    }
    placements.push({
      column: column + 1,
      row: row + 1,
      ...footprint,
    });
  }

  const rows = occupied.length;
  const holes = occupied.reduce(
    (count, row) =>
      count + Array.from(
        { length: columns },
        (_, column) => row[column] === true,
      ).filter((filled) => !filled).length,
    0,
  );
  if (holes > 0) {
    throw new TypeError(
      `Feature bento does not fill its ${columns}-column rectangle (${holes} empty ${
        holes === 1 ? "cell" : "cells"
      })`,
    );
  }

  return { columns, rows, placements };
}
