/**
 * Structured editing over a json control's string source: when the source
 * matches the control's known object shape it parses into editable rows,
 * and edited rows serialize back to pretty JSON. The raw source stays the
 * single stored value — this module only interprets it.
 */
import type { JsonShape, PropControl } from "./controls.ts";

/** One editable object: member name → its current JSON value. */
export type ObjectEditorRow = Readonly<Record<string, unknown>>;

function asRow(value: unknown): ObjectEditorRow | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as ObjectEditorRow)
    : undefined;
}

/**
 * Rows parsed from a json control source, or undefined when the source is
 * invalid JSON or does not match the shape (then only raw editing works).
 * An empty source reads as the shape's empty value.
 */
export function parseShapedSource(
  source: string,
  shape: JsonShape,
): readonly ObjectEditorRow[] | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      source.trim() === "" ? (shape.list ? "[]" : "{}") : source,
    );
  } catch {
    return undefined;
  }
  if (!shape.list) {
    const row = asRow(parsed);
    return row === undefined ? undefined : [row];
  }
  if (!Array.isArray(parsed)) return undefined;
  const rows = parsed.map(asRow);
  return rows.every((row) => row !== undefined)
    ? (rows as readonly ObjectEditorRow[])
    : undefined;
}

/** Serialize rows back to the control's JSON source. */
export function serializeShapedRows(
  rows: readonly ObjectEditorRow[],
  shape: JsonShape,
): string {
  return shape.list
    ? JSON.stringify(rows, null, 2)
    : JSON.stringify(rows[0] ?? {}, null, 2);
}

/** Rows with one member of one row replaced; undefined removes the member. */
export function withRowValue(
  rows: readonly ObjectEditorRow[],
  index: number,
  member: string,
  value: unknown,
): readonly ObjectEditorRow[] {
  return rows.map((row, at) => {
    if (at !== index) return row;
    const next: Record<string, unknown> = { ...row };
    if (value === undefined) delete next[member];
    else next[member] = value;
    return next;
  });
}

/** Move one row by one place; out-of-range moves are stable no-ops. */
export function moveShapedRow(
  rows: readonly ObjectEditorRow[],
  index: number,
  direction: -1 | 1,
): readonly ObjectEditorRow[] {
  const destination = index + direction;
  if (
    index < 0 || index >= rows.length || destination < 0 ||
    destination >= rows.length
  ) return rows;
  const next = [...rows];
  const moving = next[index];
  const displaced = next[destination];
  if (moving === undefined || displaced === undefined) return rows;
  next[destination] = moving;
  next[index] = displaced;
  return next;
}

/** Compact human summary for a collapsed structured row. */
export function summarizeShapedRow(
  row: ObjectEditorRow,
  shape: JsonShape,
): string {
  const members = [...shape.members].sort((left, right) =>
    Number(/^(?:label|title|name|heading)$/i.test(right.name)) -
    Number(/^(?:label|title|name|heading)$/i.test(left.name))
  );
  for (const member of members) {
    const value = row[member.name];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
    if (typeof value === "number") return `${member.label}: ${String(value)}`;
  }
  return `Empty ${shape.typeName}`;
}

/**
 * True when the member's control is scalar and the row's current value is
 * absent or matches it, so the cell can edit without destroying structure.
 * Structural members (nested arrays and objects) are never cell-editable —
 * a text cell would store a string where structure belongs.
 */
export function editableCell(
  row: ObjectEditorRow,
  member: PropControl,
): boolean {
  const value = row[member.name];
  switch (member.control) {
    case "text":
      return value === undefined || typeof value === "string";
    case "number":
      return value === undefined || typeof value === "number";
    case "toggle":
      return value === undefined || typeof value === "boolean";
    case "select":
      return value === undefined || typeof value === "string" ||
        typeof value === "number";
    default:
      return false;
  }
}
