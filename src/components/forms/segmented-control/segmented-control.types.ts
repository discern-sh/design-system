/** Framework-neutral identity of one peer choice. */
export interface SegmentedControlChoice {
  /** Stable submitted value; independent of the visible label and item order. */
  readonly value: string;
  /** Visible, non-empty name of this choice. */
  readonly label: string;
  readonly disabled?: boolean;
}

/** Validate identity and resolve the initial selection without inventing a choice. */
export function resolveSegmentedControlValue(
  items: readonly SegmentedControlChoice[],
  value: string | undefined,
): string | undefined {
  const values = new Set<string>();
  if (items.length === 0) {
    throw new TypeError("SegmentedControl needs at least one item");
  }
  for (const item of items) {
    if (!item.value.trim() || !item.label.trim() || values.has(item.value)) {
      throw new TypeError(
        "SegmentedControl needs unique non-empty values and non-empty labels",
      );
    }
    values.add(item.value);
  }
  if (value !== undefined && !values.has(value)) {
    throw new TypeError("SegmentedControl value must identify an item");
  }
  return value ?? items.find((item) => !item.disabled)?.value;
}
