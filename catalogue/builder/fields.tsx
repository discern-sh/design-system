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
  type BuilderStructuredRowSeed,
  newBuilderStructuredRow,
} from "./defaults.ts";
import {
  editableCell,
  moveShapedRow,
  parseShapedSource,
  serializeShapedRows,
  summarizeShapedRow,
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
      <label
        className="discern-builder-object__cell"
        data-discern-builder-object-member={member.name}
      >
        <span>{member.label}</span>
        <input type="text" disabled value="(edit as JSON)" />
      </label>
    );
  }
  if (member.control === "toggle") {
    return (
      <label
        className="discern-builder-object__cell discern-builder-object__cell--row"
        data-discern-builder-object-member={member.name}
      >
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
      <label
        className="discern-builder-object__cell"
        data-discern-builder-object-member={member.name}
      >
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
      <label
        className="discern-builder-object__cell"
        data-discern-builder-object-member={member.name}
      >
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
    <label
      className="discern-builder-object__cell"
      data-discern-builder-object-member={member.name}
    >
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
  readonly label: string;
  readonly inputId?: string;
  readonly error?: string | null;
  readonly onSource: (source: string) => void;
  readonly onApply?: () => void;
  readonly createRow?: (
    rows: readonly Readonly<Record<string, unknown>>[],
  ) => BuilderStructuredRowSeed;
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
  {
    shape,
    source,
    label,
    inputId,
    error = null,
    onSource,
    onApply,
    createRow = (rows) => newBuilderStructuredRow(shape, rows),
  }: ShapedJsonEditorProps,
) {
  const [rawOpen, setRawOpen] = useState(false);
  const [openRows, setOpenRows] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const root = useRef<HTMLDivElement>(null);
  const rows = parseShapedSource(source, shape);
  const invalid = rows === undefined;
  const commit = (
    next: readonly Readonly<Record<string, unknown>>[],
  ): void => onSource(serializeShapedRows(next, shape));
  const toggleRow = (index: number, open: boolean): void => {
    setOpenRows((current) => {
      const next = new Set(current);
      if (open) next.add(index);
      else next.delete(index);
      return next;
    });
  };
  const addRow = (): void => {
    if (rows === undefined) return;
    const index = rows.length;
    const seed = createRow(rows);
    commit([...rows, seed.row]);
    setOpenRows((current) => new Set([...current, index]));
    globalThis.requestAnimationFrame(() => {
      const row = root.current?.querySelector<HTMLElement>(
        `[data-discern-builder-object-row="${String(index)}"]`,
      );
      const preferred = [
        ...row?.querySelectorAll<HTMLElement>(
          "[data-discern-builder-object-member]",
        ) ?? [],
      ].find((member) =>
        member.dataset.discernBuilderObjectMember === seed.focusMember
      );
      (preferred?.querySelector<HTMLInputElement | HTMLSelectElement>(
        "input:not(:disabled), select:not(:disabled)",
      ) ?? row?.querySelector<HTMLInputElement | HTMLSelectElement>(
        "input:not(:disabled), select:not(:disabled)",
      ))?.focus();
    });
  };
  return (
    <div className="discern-builder-object" ref={root}>
      {rows === undefined ? null : (
        <>
          {rows.map((row, index) => (
            <details
              className="discern-builder-object__row"
              key={index}
              open={openRows.has(index)}
              onToggle={(event) => toggleRow(index, event.currentTarget.open)}
            >
              <summary>
                <span>
                  {String(index + 1)}. {summarizeShapedRow(row, shape)}
                </span>
              </summary>
              <div
                className="discern-builder-object__cells"
                data-discern-builder-object-row={index}
              >
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
                  <div className="discern-builder-object__actions">
                    <button
                      type="button"
                      disabled={index === 0}
                      aria-label={`Move ${shape.typeName} ${
                        String(index + 1)
                      } up`}
                      onClick={() => commit(moveShapedRow(rows, index, -1))}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === rows.length - 1}
                      aria-label={`Move ${shape.typeName} ${
                        String(index + 1)
                      } down`}
                      onClick={() => commit(moveShapedRow(rows, index, 1))}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${shape.typeName} ${
                        String(index + 1)
                      }`}
                      onClick={() =>
                        commit(rows.filter((_, at) => at !== index))}
                    >
                      Remove
                    </button>
                  </div>
                )
                : null}
            </details>
          ))}
          {shape.list
            ? (
              <button
                type="button"
                className="discern-builder-object__add"
                onClick={addRow}
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
          id={inputId}
          rows={2}
          spellCheck={false}
          value={source}
          placeholder={shape.list ? "[]" : "{}"}
          aria-label={`${label} JSON`}
          aria-invalid={error !== null ? true : undefined}
          aria-describedby={error !== null && inputId !== undefined
            ? `${inputId}-error`
            : undefined}
          onBlur={onApply}
          onChange={(event) => onSource(event.currentTarget.value)}
        />
        {onApply === undefined ? null : (
          <button
            type="button"
            className="discern-builder-json-apply"
            onClick={onApply}
          >
            Apply JSON
          </button>
        )}
      </details>
      {invalid && error === null
        ? (
          <small className="discern-builder-control__hint">
            Use an object matching {shape.typeName} to return to shaped rows.
          </small>
        )
        : null}
    </div>
  );
}
