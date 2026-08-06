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

/** A fresh row with every required member holding its neutral value. */
export function newShapedRow(shape: JsonShape): ObjectEditorRow {
  const row: Record<string, unknown> = {};
  for (const member of shape.members) {
    if (!member.required) continue;
    switch (member.control) {
      case "text":
        row[member.name] = "";
        break;
      case "number":
        row[member.name] = 0;
        break;
      case "toggle":
        row[member.name] = false;
        break;
      case "select":
        if (member.options[0] !== undefined) {
          row[member.name] = member.options[0];
        }
        break;
      default:
        break;
    }
  }
  return row;
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

/**
 * True when the member's current value in the row is absent or matches its
 * control, so the cell can edit it without destroying structured data.
 */
export function editableCell(
  row: ObjectEditorRow,
  member: PropControl,
): boolean {
  const value = row[member.name];
  if (value === undefined) return true;
  switch (member.control) {
    case "text":
      return typeof value === "string";
    case "number":
      return typeof value === "number";
    case "toggle":
      return typeof value === "boolean";
    case "select":
      return typeof value === "string" || typeof value === "number";
    default:
      return false;
  }
}
