/**
 * Framework-neutral numbering shared by the Table of contents renderers.
 *
 * @module
 */

/** The numbering facts one Table of contents item carries on every surface. */
export interface TableOfContentsNumbering {
  readonly nested?: boolean;
  /**
   * Authored number for a top-level item: a string renders verbatim without
   * advancing the sequence, `false` leaves the number slot empty for a
   * framing section, and `undefined` takes the next sequential number.
   */
  readonly number?: string | false;
}

/**
 * Resolve the number slot of every item: sequential numbers count only the
 * top-level items left to the sequence, authored strings render verbatim,
 * an unnumbered top-level item keeps an empty slot so its label stays
 * aligned, and a nested item has no slot at all.
 */
export function tableOfContentsNumbers(
  items: readonly TableOfContentsNumbering[],
): readonly (string | undefined)[] {
  let sectionNumber = 0;
  return items.map((item) => {
    if (item.nested === true) return undefined;
    if (item.number === false) return "";
    if (item.number !== undefined) return item.number;
    sectionNumber += 1;
    return String(sectionNumber).padStart(2, "0");
  });
}
