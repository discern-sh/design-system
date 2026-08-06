import { Component, useEffect, useMemo, useState } from "react";
import type { CSSProperties, DragEvent, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeSwitcher } from "../../src/components/core/theme-switcher/theme-switcher.tsx";
import type { ThemeSwitcherMode } from "../../src/components/core/theme-switcher/theme-switcher.tsx";
import { CopyButton } from "../../src/components/docs/copy-button/copy-button.tsx";
import {
  type CataloguePurpose,
  cataloguePurposes,
  componentGroups,
} from "../../src/types/component-meta.ts";
import { packageVersion } from "../generated/registry.ts";
import { compositionCost } from "./cost.ts";
import type { PropControl } from "./controls.ts";
import { createNode } from "./controls.ts";
import {
  BuilderDocumentError,
  documentSelectionSnippet,
  documentToTsx,
  parseDocument,
  serializeDocument,
} from "./export.ts";
import type {
  BuilderDocument,
  BuilderLocation,
  BuilderNode,
  BuilderPropValue,
  BuilderSlotChild,
} from "./model.ts";
import {
  componentCount,
  duplicateChild,
  emptyDocument,
  findChild,
  insertChild,
  moveChild,
  newChildId,
  nudgeChild,
  removeChild,
  updateNodeExtra,
  updateNodeProp,
  updateTextChild,
  usedSlugs,
} from "./model.ts";
import {
  componentEntries,
  controlsBySlug,
  entryBySlug,
  exportNaming,
  knownSlugs,
} from "./registry-index.ts";
import { renderBuilderChild } from "./render.tsx";

const DOCUMENT_STORAGE_KEY = "discern-builder-document";
const THEME_STORAGE_KEY = "discern-builder-theme";
const DRAG_MIME = "application/x-discern-builder";
const HISTORY_LIMIT = 100;

type DragPayload =
  | { readonly type: "palette"; readonly slug: string }
  | { readonly type: "child"; readonly id: string };

interface InsertionPoint {
  readonly location: BuilderLocation;
  readonly index: number;
}

interface HistoryState {
  readonly past: readonly BuilderDocument[];
  readonly present: BuilderDocument;
  readonly future: readonly BuilderDocument[];
}

const canvasWidths = {
  fluid: { label: "Fluid", width: undefined },
  desktop: { label: "1200px", width: "1200px" },
  tablet: { label: "768px", width: "768px" },
  phone: { label: "390px", width: "390px" },
} as const;
type CanvasWidth = keyof typeof canvasWidths;

function builderTheme(value: string | null): ThemeSwitcherMode | undefined {
  return value === "system" || value === "light" || value === "dark"
    ? value
    : undefined;
}

function loadInitialDocument(): BuilderDocument {
  try {
    const raw = localStorage.getItem(DOCUMENT_STORAGE_KEY);
    if (raw !== null) return parseDocument(raw, knownSlugs);
  } catch {
    // A missing or outdated saved document falls back to a fresh one.
  }
  return emptyDocument("Untitled page");
}

function fileStem(name: string): string {
  const stem = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(
    /^-|-$/g,
    "",
  );
  return stem === "" ? "composition" : stem;
}

function readPayload(event: DragEvent): DragPayload | undefined {
  try {
    const raw = event.dataTransfer.getData(DRAG_MIME);
    if (raw === "") return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return undefined;
    const payload = parsed as { type?: unknown; slug?: unknown; id?: unknown };
    if (payload.type === "palette" && typeof payload.slug === "string") {
      return { type: "palette", slug: payload.slug };
    }
    if (payload.type === "child" && typeof payload.id === "string") {
      return { type: "child", id: payload.id };
    }
  } catch {
    // Foreign drag data is ignored.
  }
  return undefined;
}

function primaryChildrenSlot(node: BuilderNode): boolean {
  return controlsBySlug(node.slug).some(
    (control) => control.control === "slot" && control.name === "children",
  );
}

function slotChildrenOf(
  node: BuilderNode,
  prop: string,
): readonly BuilderSlotChild[] {
  const value = node.props[prop];
  return value !== undefined && value.kind === "slot" ? value.children : [];
}

function slotLength(node: BuilderNode, prop: string): number {
  return slotChildrenOf(node, prop).length;
}

/** Where a new child should land, given the current selection. */
function insertionPoint(
  document: BuilderDocument,
  selectionId: string | null,
): InsertionPoint {
  const atRootEnd: InsertionPoint = {
    location: { parent: "root" },
    index: document.children.length,
  };
  if (selectionId === null) return atRootEnd;
  const found = findChild(document, selectionId);
  if (found === undefined) return atRootEnd;
  if (found.child.kind === "component" && primaryChildrenSlot(found.child)) {
    return {
      location: { parent: "node", nodeId: found.child.id, prop: "children" },
      index: slotLength(found.child, "children"),
    };
  }
  return { location: found.location, index: found.index + 1 };
}

function childLabel(child: BuilderSlotChild): string {
  if (child.kind === "text") {
    const text = child.text.trim();
    return text === ""
      ? "Empty text"
      : `“${text.length > 24 ? `${text.slice(0, 24)}…` : text}”`;
  }
  return entryBySlug.get(child.slug)?.meta.name ?? child.slug;
}

interface OutlineRow {
  readonly child: BuilderSlotChild;
  readonly depth: number;
  readonly location: BuilderLocation;
  readonly index: number;
  readonly slotName: string | undefined;
}

function outlineRows(document: BuilderDocument): readonly OutlineRow[] {
  const rows: OutlineRow[] = [];
  const visit = (
    children: readonly BuilderSlotChild[],
    location: BuilderLocation,
    depth: number,
    slotName: string | undefined,
  ): void => {
    for (const [index, child] of children.entries()) {
      rows.push({ child, depth, location, index, slotName });
      if (child.kind !== "component") continue;
      for (const [prop, value] of Object.entries(child.props)) {
        if (value.kind !== "slot") continue;
        visit(
          value.children,
          { parent: "node", nodeId: child.id, prop },
          depth + 1,
          prop === "children" ? undefined : prop,
        );
      }
    }
  };
  visit(document.children, { parent: "root" }, 0, undefined);
  return rows;
}

function formatBytes(bytes: number): string {
  return bytes >= 1000
    ? `${(bytes / 1000).toFixed(1)} kB`
    : `${String(bytes)} B`;
}

interface CanvasBoundaryProps {
  readonly label: string;
  readonly children: ReactNode;
}

interface CanvasBoundaryState {
  readonly message: string | null;
}

/** Keeps one broken instance from blanking the whole canvas. */
class CanvasBoundary extends Component<
  CanvasBoundaryProps,
  CanvasBoundaryState
> {
  override state: CanvasBoundaryState = { message: null };

  static getDerivedStateFromError(error: unknown): CanvasBoundaryState {
    return {
      message: error instanceof Error ? error.message : String(error),
    };
  }

  override render(): ReactNode {
    if (this.state.message !== null) {
      return (
        <div className="discern-builder-node-error" role="note">
          <strong>{this.props.label} needs attention</strong>
          <span>{this.state.message}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

interface PaletteProps {
  readonly query: string;
  readonly purpose: CataloguePurpose | undefined;
  readonly pendingSlotLabel: string | null;
  readonly onPlace: (slug: string) => void;
  readonly onDragStart: (slug: string, event: DragEvent) => void;
}

function Palette(
  { query, purpose, pendingSlotLabel, onPlace, onDragStart }: PaletteProps,
) {
  const normalized = query.trim().toLowerCase();
  const entries = componentEntries
    .filter(({ meta }) =>
      normalized === "" ||
      [meta.name, meta.slug, meta.group, meta.description].join(" ")
        .toLowerCase().includes(normalized)
    )
    .filter(({ meta }) =>
      purpose === undefined || (meta.purposes ?? []).includes(purpose)
    );
  const grouped = componentGroups
    .map((group) => ({
      group,
      entries: entries.filter(({ meta }) => meta.group === group),
    }))
    .filter(({ entries: groupEntries }) => groupEntries.length > 0);

  return (
    <div className="discern-builder-palette">
      {pendingSlotLabel !== null
        ? (
          <p className="discern-builder-palette__pending" role="status">
            Pick a component for <strong>{pendingSlotLabel}</strong>{" "}
            — Esc cancels.
          </p>
        )
        : null}
      {grouped.map(({ group, entries: groupEntries }) => (
        <section key={group}>
          <h3>{group}</h3>
          <ul>
            {groupEntries.map((entry) => (
              <li key={entry.meta.slug}>
                <button
                  type="button"
                  draggable
                  title={entry.meta.description}
                  onClick={() => onPlace(entry.meta.slug)}
                  onDragStart={(event) => onDragStart(entry.meta.slug, event)}
                >
                  <span>{entry.meta.name}</span>
                  <small>{entry.meta.description}</small>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {grouped.length === 0 ? <p>No components match.</p> : null}
    </div>
  );
}

interface ControlFieldProps {
  readonly node: BuilderNode;
  readonly control: PropControl;
  readonly onChange: (value: BuilderPropValue | undefined) => void;
}

function ControlField({ node, control, onChange }: ControlFieldProps) {
  const value = node.props[control.name];
  const inputId = `control-${node.id}-${control.name}`;
  const requirement = control.required
    ? null
    : <small className="discern-builder-control__optional">optional</small>;

  if (control.control === "toggle") {
    return (
      <label className="discern-builder-control discern-builder-control--row">
        <input
          type="checkbox"
          checked={value !== undefined && value.kind === "boolean" &&
            value.value}
          onChange={(event) =>
            onChange(
              event.currentTarget.checked
                ? { kind: "boolean", value: true }
                : control.required
                ? { kind: "boolean", value: false }
                : undefined,
            )}
        />
        <span>{control.label}</span>
        {requirement}
      </label>
    );
  }
  if (control.control === "select") {
    const currentIndex = value === undefined
      ? -1
      : control.options.findIndex((option) =>
        (value.kind === "string" && option === value.value) ||
        (value.kind === "number" && option === value.value)
      );
    return (
      <label className="discern-builder-control" htmlFor={inputId}>
        <span>{control.label} {requirement}</span>
        <select
          id={inputId}
          value={String(currentIndex)}
          onChange={(event) => {
            const option = control.options[Number(event.currentTarget.value)];
            onChange(
              option === undefined
                ? undefined
                : typeof option === "number"
                ? { kind: "number", value: option }
                : { kind: "string", value: option },
            );
          }}
        >
          {control.required ? null : <option value="-1">(not set)</option>}
          {control.options.map((option, index) => (
            <option value={String(index)} key={String(option)}>
              {String(option)}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (control.control === "number") {
    return (
      <label className="discern-builder-control" htmlFor={inputId}>
        <span>{control.label} {requirement}</span>
        <input
          id={inputId}
          type="number"
          value={value !== undefined && value.kind === "number"
            ? String(value.value)
            : ""}
          onChange={(event) => {
            const raw = event.currentTarget.value;
            onChange(
              raw === "" ? undefined : {
                kind: "number",
                value: event.currentTarget.valueAsNumber,
              },
            );
          }}
        />
      </label>
    );
  }
  if (control.control === "json") {
    const source = value !== undefined && value.kind === "json"
      ? value.source
      : "";
    let jsonError: string | null = null;
    if (source.trim() !== "") {
      try {
        JSON.parse(source);
      } catch {
        jsonError = "Invalid JSON.";
      }
    }
    return (
      <label className="discern-builder-control" htmlFor={inputId}>
        <span>
          {control.label} {requirement}
          <code>{control.typeText}</code>
        </span>
        <textarea
          id={inputId}
          rows={3}
          spellCheck={false}
          value={source}
          placeholder={control.typeText.includes("[]") ? "[]" : "{}"}
          onChange={(event) => {
            const raw = event.currentTarget.value;
            onChange(
              raw.trim() === "" ? undefined : {
                kind: "json",
                source: raw,
              },
            );
          }}
        />
        {jsonError !== null
          ? (
            <small className="discern-builder-control__error">
              {jsonError}
            </small>
          )
          : null}
      </label>
    );
  }
  return (
    <label className="discern-builder-control" htmlFor={inputId}>
      <span>{control.label} {requirement}</span>
      <input
        id={inputId}
        type="text"
        value={value !== undefined && value.kind === "string"
          ? value.value
          : ""}
        placeholder={control.typeText === "string" ? "" : control.typeText}
        onChange={(event) => {
          const raw = event.currentTarget.value;
          onChange(
            raw === "" && !control.required
              ? undefined
              : { kind: "string", value: raw },
          );
        }}
      />
    </label>
  );
}

function App() {
  const [history, setHistory] = useState<HistoryState>(() => ({
    past: [],
    present: loadInitialDocument(),
    future: [],
  }));
  const [selection, setSelection] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<
    { readonly nodeId: string; readonly prop: string } | null
  >(null);
  const [dropHint, setDropHint] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [purpose, setPurpose] = useState<CataloguePurpose | undefined>(
    undefined,
  );
  const [canvasWidth, setCanvasWidth] = useState<CanvasWidth>("fluid");
  const [theme, setTheme] = useState<ThemeSwitcherMode>(() =>
    builderTheme(localStorage.getItem(THEME_STORAGE_KEY)) ?? "system"
  );
  const [accentHue, setAccentHue] = useState(255);

  const document = history.present;

  useEffect(() => {
    localStorage.setItem(DOCUMENT_STORAGE_KEY, serializeDocument(document));
  }, [document]);

  const apply = (update: (current: BuilderDocument) => BuilderDocument): void =>
    setHistory((state) => {
      const next = update(state.present);
      if (next === state.present) return state;
      return {
        past: [...state.past.slice(-HISTORY_LIMIT), state.present],
        present: next,
        future: [],
      };
    });

  const rename = (name: string): void =>
    setHistory((state) => ({
      ...state,
      present: { ...state.present, name },
    }));

  const undo = (): void =>
    setHistory((state) => {
      const previous = state.past.at(-1);
      if (previous === undefined) return state;
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
    });

  const redo = (): void =>
    setHistory((state) => {
      const [next, ...rest] = state.future;
      if (next === undefined) return state;
      return {
        past: [...state.past, state.present],
        present: next,
        future: rest,
      };
    });

  const changeTheme = (next: ThemeSwitcherMode): void => {
    setTheme(next);
    if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, next);
  };

  const placeComponent = (slug: string, at?: InsertionPoint): void => {
    const entry = entryBySlug.get(slug);
    if (entry === undefined) return;
    const target = at ??
      (pendingSlot !== null
        ? {
          location: {
            parent: "node",
            nodeId: pendingSlot.nodeId,
            prop: pendingSlot.prop,
          } as const,
          index: Number.MAX_SAFE_INTEGER,
        }
        : insertionPoint(document, selection));
    const instance = createNode(slug, entry);
    apply((current) =>
      insertChild(current, target.location, target.index, instance)
    );
    setPendingSlot(null);
    setSelection(instance.id);
  };

  const handleDrop = (
    payload: DragPayload,
    location: BuilderLocation,
    index: number,
  ): void => {
    if (payload.type === "palette") {
      placeComponent(payload.slug, { location, index });
      return;
    }
    apply((current) => moveChild(current, payload.id, location, index));
    setSelection(payload.id);
  };

  const dropOnNode = (payload: DragPayload, nodeId: string): void => {
    const found = findChild(document, nodeId);
    if (found === undefined) return;
    if (
      found.child.kind === "component" && primaryChildrenSlot(found.child) &&
      !(payload.type === "child" && payload.id === nodeId)
    ) {
      handleDrop(
        payload,
        { parent: "node", nodeId, prop: "children" },
        slotLength(found.child, "children"),
      );
      return;
    }
    handleDrop(payload, found.location, found.index + 1);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target;
      const inField = target instanceof Element &&
        target.closest("input, textarea, select, [contenteditable]") !== null;
      if (event.key === "Escape") {
        setPendingSlot(null);
        if (!inField) setSelection(null);
        return;
      }
      if (inField) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selection !== null
      ) {
        event.preventDefault();
        apply((current) => removeChild(current, selection));
        setSelection(null);
      }
    };
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [selection]);

  const slugs = useMemo(() => usedSlugs(document), [document]);
  const cost = useMemo(() => compositionCost(slugs), [slugs]);
  const exported = useMemo(() => {
    try {
      return {
        tsx: documentToTsx(document, exportNaming),
        selection: documentSelectionSnippet(document),
        error: null,
      };
    } catch (error) {
      return {
        tsx: null,
        selection: null,
        error: error instanceof BuilderDocumentError
          ? error.message
          : String(error),
      };
    }
  }, [document]);

  const decorate = (
    node: BuilderNode,
    props: Record<string, unknown>,
  ): Record<string, unknown> => ({
    ...props,
    "data-discern-builder-node": node.id,
    ...(node.id === selection ? { "data-discern-builder-selected": "" } : {}),
    ...(node.id === dropHint ? { "data-discern-builder-drop": "" } : {}),
    draggable: true,
    onDragStart: (event: DragEvent) => {
      event.stopPropagation();
      event.dataTransfer.setData(
        DRAG_MIME,
        JSON.stringify({ type: "child", id: node.id }),
      );
      event.dataTransfer.effectAllowed = "move";
      setDragging(true);
    },
  });

  const nodeIdAt = (target: EventTarget | null): string | null => {
    if (!(target instanceof Element)) return null;
    return target.closest("[data-discern-builder-node]")
      ?.getAttribute("data-discern-builder-node") ?? null;
  };

  const selectedContext = selection === null
    ? undefined
    : findChild(document, selection);
  const selectedNode =
    selectedContext !== undefined && selectedContext.child.kind === "component"
      ? selectedContext.child
      : undefined;
  const selectedText =
    selectedContext !== undefined && selectedContext.child.kind === "text"
      ? selectedContext.child
      : undefined;
  const selectedEntry = selectedNode === undefined
    ? undefined
    : entryBySlug.get(selectedNode.slug);
  const pendingSlotLabel = pendingSlot === null ? null : (() => {
    const owner = findChild(document, pendingSlot.nodeId)?.child;
    const ownerLabel = owner === undefined ? "slot" : childLabel(owner);
    return `${ownerLabel} · ${pendingSlot.prop}`;
  })();

  const rows = outlineRows(document);
  const shellStyle = {
    "--discern-accent-hue": accentHue,
  } as CSSProperties;
  const pageStyle: CSSProperties = {
    ...(canvasWidths[canvasWidth].width === undefined
      ? {}
      : { maxWidth: canvasWidths[canvasWidth].width }),
  };

  return (
    <div
      className="discern-builder-shell"
      data-discern-root
      data-discern-theme={theme}
      style={shellStyle}
    >
      <header className="discern-builder-toolbar">
        <a className="discern-builder-brand" href="../">
          <span aria-hidden="true">◮</span>
          <span>
            <strong>discern</strong>
            <small>Interface builder</small>
          </span>
        </a>
        <input
          className="discern-builder-name"
          type="text"
          value={document.name}
          aria-label="Composition name"
          onChange={(event) => rename(event.currentTarget.value)}
        />
        <div
          className="discern-builder-toolbar__group"
          role="group"
          aria-label="History"
        >
          <button
            type="button"
            onClick={undo}
            disabled={history.past.length === 0}
          >
            ↺ Undo
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={history.future.length === 0}
          >
            ↻ Redo
          </button>
        </div>
        <label className="discern-builder-width">
          <span>Width</span>
          <select
            value={canvasWidth}
            onChange={(event) =>
              setCanvasWidth(event.currentTarget.value as CanvasWidth)}
          >
            {Object.entries(canvasWidths).map(([key, { label }]) => (
              <option value={key} key={key}>{label}</option>
            ))}
          </select>
        </label>
        <ThemeSwitcher
          className="discern-builder-theme"
          mode={theme}
          onModeChange={changeTheme}
          label="Builder colour theme"
        />
        <label className="discern-builder-accent">
          <span>Accent</span>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={accentHue}
            onInput={(event) => setAccentHue(event.currentTarget.valueAsNumber)}
            aria-label="Accent hue"
          />
        </label>
        <span className="discern-builder-version">v{packageVersion}</span>
      </header>

      <aside className="discern-builder-sidebar">
        <label className="discern-builder-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            placeholder="Search components"
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
        <label className="discern-builder-purpose">
          <span className="discern-visually-hidden">Filter by purpose</span>
          <select
            value={purpose ?? ""}
            onChange={(event) =>
              setPurpose(
                cataloguePurposes.find(
                  (candidate) => candidate === event.currentTarget.value,
                ),
              )}
          >
            <option value="">All purposes</option>
            {cataloguePurposes.map((candidate) => (
              <option value={candidate} key={candidate}>{candidate}</option>
            ))}
          </select>
        </label>
        <Palette
          query={query}
          purpose={purpose}
          pendingSlotLabel={pendingSlotLabel}
          onPlace={placeComponent}
          onDragStart={(slug, event) => {
            event.dataTransfer.setData(
              DRAG_MIME,
              JSON.stringify({ type: "palette", slug }),
            );
            event.dataTransfer.effectAllowed = "copy";
            setDragging(true);
          }}
        />
      </aside>

      <main
        className={`discern-builder-canvas${
          dragging ? " discern-builder-canvas--dragging" : ""
        }`}
        onClickCapture={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setSelection(nodeIdAt(event.target));
        }}
        onDragOverCapture={(event) => {
          event.preventDefault();
          setDropHint(nodeIdAt(event.target));
        }}
        onDragLeave={() => setDropHint(null)}
        onDropCapture={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const payload = readPayload(event);
          setDropHint(null);
          setDragging(false);
          if (payload === undefined) return;
          const nodeId = nodeIdAt(event.target);
          if (nodeId === null) {
            handleDrop(
              payload,
              { parent: "root" },
              document.children.length,
            );
          } else {
            dropOnNode(payload, nodeId);
          }
        }}
        onDragEndCapture={() => {
          setDropHint(null);
          setDragging(false);
        }}
      >
        <div className="discern-builder-canvas__page" style={pageStyle}>
          {document.children.length === 0
            ? (
              <div className="discern-builder-empty">
                <h2>Blank canvas</h2>
                <p>
                  Drag components in from the palette, or click one to place it.
                  Select anything on the canvas to edit its props.
                </p>
              </div>
            )
            : document.children.map((child) => (
              <CanvasBoundary
                key={`${child.id}:${JSON.stringify(child)}`}
                label={childLabel(child)}
              >
                {renderBuilderChild(child, { decorate })}
              </CanvasBoundary>
            ))}
        </div>
      </main>

      <aside className="discern-builder-inspector">
        {selectedNode !== undefined && selectedEntry !== undefined
          ? (
            <div className="discern-builder-inspector__body">
              <header>
                <h2>{selectedEntry.meta.name}</h2>
                <p>{selectedEntry.meta.description}</p>
              </header>
              <div
                className="discern-builder-toolbar__group"
                role="group"
                aria-label="Instance actions"
              >
                {selectedContext !== undefined &&
                    selectedContext.location.parent === "node"
                  ? (
                    <button
                      type="button"
                      onClick={() => {
                        const location = selectedContext.location;
                        if (location.parent === "node") {
                          setSelection(location.nodeId);
                        }
                      }}
                    >
                      Parent
                    </button>
                  )
                  : null}
                <button
                  type="button"
                  onClick={() =>
                    apply((current) =>
                      nudgeChild(current, selectedNode.id, -1)
                    )}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() =>
                    apply((current) => nudgeChild(current, selectedNode.id, 1))}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() =>
                    apply((current) =>
                      duplicateChild(current, selectedNode.id)
                    )}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="discern-builder-danger"
                  onClick={() => {
                    apply((current) => removeChild(current, selectedNode.id));
                    setSelection(null);
                  }}
                >
                  Delete
                </button>
              </div>
              {controlsBySlug(selectedNode.slug).map((control) =>
                control.control === "slot"
                  ? (
                    <section
                      className="discern-builder-slot"
                      key={control.name}
                    >
                      <h3>
                        {control.label}
                        {control.required
                          ? null
                          : (
                            <small className="discern-builder-control__optional">
                              optional
                            </small>
                          )}
                      </h3>
                      <ul>
                        {slotChildrenOf(selectedNode, control.name).map((
                          child,
                        ) => (
                          <li key={child.id}>
                            <button
                              type="button"
                              onClick={() => setSelection(child.id)}
                            >
                              {childLabel(child)}
                            </button>
                            <button
                              type="button"
                              aria-label={`Remove ${childLabel(child)}`}
                              onClick={() =>
                                apply((current) =>
                                  removeChild(current, child.id)
                                )}
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                      <div className="discern-builder-toolbar__group">
                        {control.elementOnly ? null : (
                          <button
                            type="button"
                            onClick={() =>
                              apply((current) =>
                                insertChild(
                                  current,
                                  {
                                    parent: "node",
                                    nodeId: selectedNode.id,
                                    prop: control.name,
                                  },
                                  Number.MAX_SAFE_INTEGER,
                                  {
                                    kind: "text",
                                    id: newChildId(),
                                    text: "Text",
                                  },
                                )
                              )}
                          >
                            ＋ Text
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setPendingSlot({
                              nodeId: selectedNode.id,
                              prop: control.name,
                            })}
                        >
                          ＋ Component…
                        </button>
                      </div>
                    </section>
                  )
                  : (
                    <ControlField
                      key={control.name}
                      node={selectedNode}
                      control={control}
                      onChange={(value) =>
                        apply((current) =>
                          updateNodeProp(
                            current,
                            selectedNode.id,
                            control.name,
                            value,
                          )
                        )}
                    />
                  )
              )}
              <label className="discern-builder-control">
                <span>
                  Additional props <code>JSON object</code>
                </span>
                <textarea
                  rows={2}
                  spellCheck={false}
                  value={selectedNode.extra ?? ""}
                  placeholder='{"aria-label": "…"}'
                  onChange={(event) =>
                    apply((current) => updateNodeExtra(
                      current,
                      selectedNode.id,
                      event.currentTarget.value,
                    ))}
                />
              </label>
            </div>
          )
          : selectedText !== undefined
          ? (
            <div className="discern-builder-inspector__body">
              <header>
                <h2>Text</h2>
                <p>Literal text placed in a slot.</p>
              </header>
              <label className="discern-builder-control">
                <span>Content</span>
                <textarea
                  rows={4}
                  value={selectedText.text}
                  onChange={(event) =>
                    apply((current) =>
                      updateTextChild(
                        current,
                        selectedText.id,
                        event.currentTarget.value,
                      )
                    )}
                />
              </label>
              <button
                type="button"
                className="discern-builder-danger"
                onClick={() => {
                  apply((current) => removeChild(current, selectedText.id));
                  setSelection(null);
                }}
              >
                Delete
              </button>
            </div>
          )
          : (
            <div className="discern-builder-inspector__body">
              <header>
                <h2>Composition</h2>
                <p>
                  {componentCount(document)} component instances ·{" "}
                  {cost.resolved.length} shipped components
                </p>
              </header>
              <dl className="discern-builder-cost">
                <div>
                  <dt>Component CSS</dt>
                  <dd>{formatBytes(cost.componentCssBytes)}</dd>
                </div>
                <div>
                  <dt>Behavior script</dt>
                  <dd>
                    {cost.needsBehaviorScript ? "required" : "not needed"}
                  </dd>
                </div>
              </dl>
              {cost.breakdown.length > 0
                ? (
                  <details className="discern-builder-cost-detail">
                    <summary>Shipped components</summary>
                    <ul>
                      {cost.breakdown.map(({ id, cssBytes }) => (
                        <li key={id}>
                          <span>{id}</span>
                          <span>{formatBytes(cssBytes)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )
                : null}
              {exported.error !== null
                ? (
                  <p className="discern-builder-control__error" role="alert">
                    {exported.error}
                  </p>
                )
                : (
                  <div className="discern-builder-exports">
                    {exported.tsx !== null
                      ? (
                        <CopyButton
                          value={exported.tsx}
                          label="Copy TSX source"
                          copiedLabel="TSX copied"
                        />
                      )
                      : null}
                    {exported.selection !== null
                      ? (
                        <CopyButton
                          value={exported.selection}
                          label="Copy runtime selection"
                          copiedLabel="Selection copied"
                        />
                      )
                      : null}
                  </div>
                )}
              <div className="discern-builder-toolbar__group">
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([serializeDocument(document)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const anchor = globalThis.document.createElement("a");
                    anchor.href = url;
                    anchor.download = `${fileStem(document.name)}.json`;
                    anchor.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Save file
                </button>
                <label className="discern-builder-file">
                  Load file
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = "";
                      if (file === undefined) return;
                      file.text().then((text) => {
                        try {
                          const loaded = parseDocument(text, knownSlugs);
                          apply(() => loaded);
                          setSelection(null);
                        } catch (error) {
                          alert(
                            error instanceof BuilderDocumentError
                              ? error.message
                              : "The file could not be loaded.",
                          );
                        }
                      });
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="discern-builder-danger"
                  onClick={() => {
                    if (
                      confirm(
                        "Replace the current composition with an empty one?",
                      )
                    ) {
                      apply(() => emptyDocument("Untitled page"));
                      setSelection(null);
                    }
                  }}
                >
                  New
                </button>
              </div>
            </div>
          )}

        <section className="discern-builder-outline">
          <h3>Outline</h3>
          {rows.length === 0 ? <p>Nothing placed yet.</p> : (
            <ul>
              {rows.map((row) => (
                <li
                  key={row.child.id}
                  style={{
                    "--discern-builder-depth": row.depth,
                  } as CSSProperties}
                >
                  <button
                    type="button"
                    draggable
                    className={row.child.id === selection
                      ? "discern-builder-outline__row is-selected"
                      : "discern-builder-outline__row"}
                    onClick={() => setSelection(row.child.id)}
                    onDragStart={(event) => {
                      event.dataTransfer.setData(
                        DRAG_MIME,
                        JSON.stringify({ type: "child", id: row.child.id }),
                      );
                      event.dataTransfer.effectAllowed = "move";
                      setDragging(true);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const payload = readPayload(event);
                      setDragging(false);
                      if (payload === undefined) return;
                      handleDrop(payload, row.location, row.index);
                    }}
                  >
                    {row.slotName !== undefined
                      ? <small>{row.slotName}</small>
                      : null}
                    <span>{childLabel(row.child)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div
            className="discern-builder-outline__end"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const payload = readPayload(event);
              setDragging(false);
              if (payload === undefined) return;
              handleDrop(payload, { parent: "root" }, document.children.length);
            }}
          >
            Drop here for end of page
          </div>
        </section>
      </aside>
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Builder root is missing");
createRoot(root).render(<App />);
