/** Resolve how many equal columns fit while preserving a requested minimum. */
export function responsiveColumnCount(
  itemCount: number,
  width: number,
  minimum: number,
  gap: number,
): number {
  return Math.max(
    1,
    Math.min(itemCount, Math.floor((width + gap) / (minimum + gap))),
  );
}
