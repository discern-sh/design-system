/**
 * Inspector field components that carry editing behavior worth testing in
 * isolation: the auto-growing textarea and the structured object editor.
 * The builder app composes these; tests render them directly.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TextareaHTMLAttributes } from "react";
import { Select } from "../../src/components/forms/select/select.tsx";
import type { JsonShape, PropControl } from "./controls.ts";
import {
  editableCell,
  newShapedRow,
  parseShapedSource,
  serializeShapedRows,
  withRowValue,
} from "./object-editor.ts";

/** A textarea that grows with its content instead of scrolling inside 3 rows. */
export function AutoGrowTextarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const measure = (): void => {
    const element = ref.current;
    // A hidden textarea (closed <details>) measures 0 — skip rather than
    // pin the height to nothing; the resize observer re-measures on reveal.
    if (element === null || element.offsetParent === null) return;
    element.style.height = "auto";
    element.style.height = `${String(element.scrollHeight + 2)}px`;
  };
  useLayoutEffect(measure, [props.value]);
  useEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <textarea ref={ref} {...props} />;
}

interface MemberCellProps {
  readonly member: PropControl;
  readonly row: Readonly<Record<string, unknown>>;
  readonly onValue: (value: unknown) => void;
}

/** One member field inside a structured object row. */
export function MemberCell({ member, row, onValue }: MemberCellProps) {
  const value = row[member.name];
  if (!editableCell(row, member)) {
    // Structural members (nested arrays/objects) only edit as raw JSON —
    // a text cell here would store a string where structure belongs.
    return (
      <label className="discern-builder-object__cell">
        <span>{member.label}</span>
        <input type="text" disabled value="(edit as JSON)" />
      </label>
    );
  }
  if (member.control === "toggle") {
    return (
      <label className="discern-builder-object__cell discern-builder-object__cell--row">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) =>
            onValue(
              event.currentTarget.checked
                ? true
                : member.required
                ? false
                : undefined,
            )}
        />
        <span>{member.label}</span>
      </label>
    );
  }
  if (member.control === "select") {
    const options = member.options;
    const currentIndex = options.findIndex((option) => option === value);
    return (
      <label className="discern-builder-object__cell">
        <span>{member.label}</span>
        <Select
          value={String(currentIndex)}
          onChange={(event) =>
            onValue(options[Number(event.currentTarget.value)])}
          options={[
            ...(member.required ? [] : [{ value: "-1", label: "(not set)" }]),
            ...options.map((option, index) => ({
              value: String(index),
              label: String(option),
            })),
          ]}
        />
      </label>
    );
  }
  if (member.control === "number") {
    return (
      <label className="discern-builder-object__cell">
        <span>{member.label}</span>
        <input
          type="number"
          value={typeof value === "number" ? String(value) : ""}
          onChange={(event) => {
            const raw = event.currentTarget.value;
            onValue(raw === "" ? undefined : event.currentTarget.valueAsNumber);
          }}
        />
      </label>
    );
  }
  return (
    <label className="discern-builder-object__cell">
      <span>{member.label}</span>
      <input
        type="text"
        value={typeof value === "string" ? value : ""}
        onChange={(event) => {
          const raw = event.currentTarget.value;
          onValue(raw === "" && !member.required ? undefined : raw);
        }}
      />
    </label>
  );
}

interface ShapedJsonEditorProps {
  readonly shape: JsonShape;
  readonly source: string;
  readonly onSource: (source: string) => void;
}

/**
 * Row-based editing for a json control whose object shape is known. The
 * JSON string stays the stored value; rows are a view over it, and raw
 * editing stays one disclosure away. The scaffold is identical in the
 * valid and invalid states so the raw textarea never remounts (a remount
 * would drop focus mid-keystroke), and the disclosure latches open once
 * the source goes invalid so the field being typed in cannot vanish.
 */
export function ShapedJsonEditor(
  { shape, source, onSource }: ShapedJsonEditorProps,
) {
  const [rawOpen, setRawOpen] = useState(false);
  const rows = parseShapedSource(source, shape);
  const invalid = rows === undefined;
  const commit = (
    next: readonly Readonly<Record<string, unknown>>[],
  ): void => onSource(serializeShapedRows(next, shape));
  return (
    <div className="discern-builder-object">
      {rows === undefined ? null : (
        <>
          {rows.map((row, index) => (
            <div className="discern-builder-object__row" key={index}>
              <div className="discern-builder-object__cells">
                {shape.members.map((member) => (
                  <MemberCell
                    key={member.name}
                    member={member}
                    row={row}
                    onValue={(value) =>
                      commit(withRowValue(rows, index, member.name, value))}
                  />
                ))}
              </div>
              {shape.list
                ? (
                  <button
                    type="button"
                    aria-label={`Remove ${shape.typeName} ${String(index + 1)}`}
                    onClick={() =>
                      commit(rows.filter((_, at) => at !== index))}
                  >
                    ✕
                  </button>
                )
                : null}
            </div>
          ))}
          {shape.list
            ? (
              <button
                type="button"
                className="discern-builder-object__add"
                onClick={() => commit([...rows, newShapedRow(shape)])}
              >
                ＋ {shape.typeName}
              </button>
            )
            : null}
        </>
      )}
      <details
        key="raw"
        className="discern-builder-object__raw"
        open={rawOpen || invalid}
        onToggle={(event) => setRawOpen(event.currentTarget.open)}
      >
        <summary>Edit as JSON</summary>
        <AutoGrowTextarea
          rows={2}
          spellCheck={false}
          value={source}
          placeholder={shape.list ? "[]" : "{}"}
          onChange={(event) => onSource(event.currentTarget.value)}
        />
      </details>
      {invalid
        ? (
          <small className="discern-builder-control__error">
            Fix the JSON to edit it as a form.
          </small>
        )
        : null}
    </div>
  );
}
