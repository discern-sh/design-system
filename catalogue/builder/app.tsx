import {
  Component,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, DragEvent, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeSwitcher } from "../../src/components/core/theme-switcher/theme-switcher.tsx";
import type { ThemeSwitcherMode } from "../../src/components/core/theme-switcher/theme-switcher.tsx";
import { CopyButton } from "../../src/components/docs/copy-button/copy-button.tsx";
import { Select } from "../../src/components/forms/select/select.tsx";
import {
  type CataloguePurpose,
  cataloguePurposes,
  componentGroups,
} from "../../src/types/component-meta.ts";
import { packageVersion } from "../generated/registry.ts";
import { compositionCost } from "./cost.ts";
import type { PropControl } from "./controls.ts";
import { AutoGrowTextarea, ShapedJsonEditor } from "./fields.tsx";
import {
  documentSelectionSnippet,
  documentToTsx,
  serializeDocument,
} from "./export.ts";
import {
  type BuilderHistoryState,
  commitHistory,
  initialHistory,
  redoHistory,
  undoHistory,
} from "./history.ts";
import type {
  BuilderDocument,
  BuilderLocation,
  BuilderNode,
  BuilderPropValue,
  BuilderSlotChild,
} from "./model.ts";
import {
  ancestorsOf,
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
  wrapChild,
} from "./model.ts";
import {
  componentEntries,
  controlsBySlug,
  documentPolicy,
  entryBySlug,
  exportNaming,
  instantiateComponent,
} from "./registry-index.ts";
import type { RenderOptions } from "./render.tsx";
import { renderBuilderChild, rendersFromDefaults } from "./render.tsx";
import {
  browserBuilderStorage,
  persistBuilderDocument,
  persistBuilderTheme,
  readBuilderDocumentFile,
  restoreBuilderSession,
} from "./persistence.ts";
import {
  assertBuilderDocument,
  BUILDER_DOCUMENT_LIMITS,
  BuilderDocumentError,
  builderValueBytes,
} from "./policy.ts";
import { rootInsertionFromPointer } from "./placement.ts";

const DRAG_MIME = "application/x-discern-builder";
const builderStorage = browserBuilderStorage();
const restoredSession = restoreBuilderSession(builderStorage, documentPolicy);

type DragPayload =
  | { readonly type: "palette"; readonly slug: string }
  | { readonly type: "child"; readonly id: string };

interface InsertionPoint {
  readonly location: BuilderLocation;
  readonly index: number;
}

type DropHint =
  | { readonly kind: "node"; readonly id: string }
  | {
    readonly kind: "root";
    readonly index: number;
    readonly offset: number;
  };

type WorkspacePane = "palette" | "canvas" | "inspector";
const WORKSPACE_PANES: readonly WorkspacePane[] = [
  "palette",
  "canvas",
  "inspector",
];

interface BuilderFeedback {
  readonly kind: "status" | "error";
  readonly message: string;
  readonly serial: number;
}

interface ApplyResult {
  readonly changed: boolean;
  readonly error: string | null;
}

const canvasWidths = {
  fluid: { label: "Fluid", width: undefined },
  desktop: { label: "1200px", width: "1200px" },
  tablet: { label: "768px", width: "768px" },
  phone: { label: "390px", width: "390px" },
} as const;
type CanvasWidth = keyof typeof canvasWidths;

const SHORTCUT_OWNER_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]",
  "[role='button']",
  "[role='checkbox']",
  "[role='combobox']",
  "[role='link']",
  "[role='menuitem']",
  "[role='option']",
  "[role='radio']",
  "[role='slider']",
  "[role='spinbutton']",
  "[role='switch']",
  "[role='tab']",
  "audio[controls]",
  "video[controls]",
].join(",");

const CANVAS_FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "iframe",
  "audio[controls]",
  "video[controls]",
  "[contenteditable]",
  "[tabindex]",
].join(",");

const ADDITIONAL_PROPS_PLACEHOLDER = '{"aria-label": "…"}';

function shortcutBelongsToControl(event: KeyboardEvent): boolean {
  return event.composedPath().some((target) =>
    target instanceof Element && target.matches(SHORTCUT_OWNER_SELECTOR)
  );
}

function childrenAt(
  document: BuilderDocument,
  location: BuilderLocation,
): readonly BuilderSlotChild[] {
  if (location.parent === "root") return document.children;
  const owner = findChild(document, location.nodeId)?.child;
  if (owner === undefined || owner.kind !== "component") return [];
  return slotChildrenOf(owner, location.prop);
}

function downloadSource(source: string, filename: string): void {
  let url: string | undefined;
  let anchor: HTMLAnchorElement | undefined;
  try {
    url = URL.createObjectURL(new Blob([source], { type: "application/json" }));
    anchor = globalThis.document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    globalThis.document.body.append(anchor);
    anchor.click();
  } finally {
    anchor?.remove();
    if (url !== undefined) {
      // Keep the object URL alive through the browser's queued navigation.
      const createdUrl = url;
      globalThis.setTimeout(() => URL.revokeObjectURL(createdUrl), 0);
    }
  }
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

interface BoundaryProps {
  /** Rendered in place of the children after a render crash. */
  readonly fallback: (message: string) => ReactNode;
  readonly children: ReactNode;
}

interface BoundaryState {
  readonly message: string | null;
}

/** Contains one subtree's render crash; the key resets it. */
class Boundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { message: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return {
      message: error instanceof Error ? error.message : String(error),
    };
  }

  override render(): ReactNode {
    if (this.state.message !== null) {
      return this.props.fallback(this.state.message);
    }
    return this.props.children;
  }
}

interface AppBoundaryProps {
  readonly children: ReactNode;
}

interface AppBoundaryState {
  readonly message: string | null;
}

/** Last-resort boundary: a crash shows a recovery note, never a blank page. */
class AppBoundary extends Component<AppBoundaryProps, AppBoundaryState> {
  override state: AppBoundaryState = { message: null };

  static getDerivedStateFromError(error: unknown): AppBoundaryState {
    return {
      message: error instanceof Error ? error.message : String(error),
    };
  }

  override render(): ReactNode {
    if (this.state.message !== null) {
      return (
        <div className="discern-builder-crash" data-discern-root>
          <h1>The builder hit an unexpected error</h1>
          <p>{this.state.message}</p>
          <p>
            Your composition autosaves on every change — reload to continue.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

interface CanvasInstanceProps {
  readonly child: BuilderSlotChild;
  readonly options: RenderOptions;
}

/**
 * Renders one placed subtree inside its own component so a throw lands in
 * the enclosing CanvasBoundary instead of unmounting the whole app.
 */
function CanvasInstance({ child, options }: CanvasInstanceProps) {
  return <>{renderBuilderChild(child, options)}</>;
}

interface CanvasBoundaryProps {
  readonly label: string;
  readonly children: ReactNode;
}

/** Keeps one broken instance from blanking the whole canvas. */
function CanvasBoundary({ label, children }: CanvasBoundaryProps) {
  return (
    <Boundary
      fallback={(message) => (
        <div className="discern-builder-node-error" role="note">
          <strong>{label} needs attention</strong>
          <span>{message}</span>
        </div>
      )}
    >
      {children}
    </Boundary>
  );
}

interface PalettePreviewProps {
  readonly slug: string;
}

/**
 * A live, scaled-down render of the component's default instance, mounted
 * lazily once the palette card scrolls near the viewport. Components whose
 * defaults cannot render show a neutral glyph instead.
 */
function PalettePreview({ slug }: PalettePreviewProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (element === null) return;
    // Previews are decoration: inert removes their controls from the tab
    // order and assistive tech (React 18 has no typed inert prop yet).
    element.inert = true;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "200px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const instance = useMemo(
    () =>
      visible && rendersFromDefaults(slug) ? instantiateComponent(slug) : null,
    [visible, slug],
  );
  const glyph = <span className="discern-builder-palette__glyph">▢</span>;
  return (
    <div
      ref={ref}
      className="discern-builder-palette__preview"
      aria-hidden="true"
    >
      {instance !== null
        ? (
          <Boundary fallback={() => glyph}>
            <div className="discern-builder-palette__preview-stage">
              {renderBuilderChild(instance)}
            </div>
          </Boundary>
        )
        : glyph}
    </div>
  );
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
                <PalettePreview slug={entry.meta.slug} />
                <button
                  type="button"
                  draggable
                  title={entry.meta.description}
                  aria-label={`Place ${entry.meta.name}`}
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

interface InspectorBreadcrumbProps {
  readonly document: BuilderDocument;
  readonly selectionId: string;
  readonly currentLabel: string;
  readonly onSelect: (id: string | null) => void;
}

/** The selection's path: Composition › ancestors › current, all clickable. */
function InspectorBreadcrumb(
  { document, selectionId, currentLabel, onSelect }: InspectorBreadcrumbProps,
) {
  const ancestors = ancestorsOf(document, selectionId);
  return (
    <nav className="discern-builder-breadcrumb" aria-label="Selection path">
      <button
        type="button"
        onClick={() =>
          onSelect(null)}
      >
        Composition
      </button>
      {ancestors.map((ancestor) => (
        <button
          type="button"
          key={ancestor.id}
          onClick={() => onSelect(ancestor.id)}
        >
          {entryBySlug.get(ancestor.slug)?.meta.name ?? ancestor.slug}
        </button>
      ))}
      <strong aria-current="true">{currentLabel}</strong>
    </nav>
  );
}

/** Layout components offered by the wrap action, in offer order. */
const LAYOUT_WRAPPER_SLUGS = [
  "stack",
  "cluster",
  "section",
  "container",
] as const;

interface ControlFieldProps {
  readonly node: BuilderNode;
  readonly control: PropControl;
  readonly onChange: (value: BuilderPropValue | undefined) => string | null;
}

function ControlField({ node, control, onChange }: ControlFieldProps) {
  const value = node.props[control.name];
  const acceptedJsonSource = value !== undefined && value.kind === "json"
    ? value.source
    : "";
  const [jsonDraft, setJsonDraft] = useState(acceptedJsonSource);
  const [jsonError, setJsonError] = useState<string | null>(null);
  useEffect(() => {
    setJsonDraft(acceptedJsonSource);
    setJsonError(null);
  }, [node.id, control.name, acceptedJsonSource]);
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
        <Select
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
          options={[
            ...(control.required ? [] : [{ value: "-1", label: "(not set)" }]),
            ...control.options.map((option, index) => ({
              value: String(index),
              label: String(option),
            })),
          ]}
        />
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
    const commitJsonDraft = (next: string): void => {
      const error = onChange(
        next.trim() === "" ? undefined : { kind: "json", source: next },
      );
      if (builderValueBytes(next) <= BUILDER_DOCUMENT_LIMITS.jsonSourceBytes) {
        setJsonDraft(next);
      }
      setJsonError(error);
    };
    if (control.shape !== undefined) {
      return (
        <div className="discern-builder-control">
          <span>
            {control.label} {requirement}
            <code>{control.typeText}</code>
          </span>
          <ShapedJsonEditor
            shape={control.shape}
            source={jsonDraft}
            label={control.label}
            error={jsonError}
            onSource={commitJsonDraft}
          />
        </div>
      );
    }
    const errorId = `${inputId}-error`;
    return (
      <label className="discern-builder-control" htmlFor={inputId}>
        <span>
          {control.label} {requirement}
          <code>{control.typeText}</code>
        </span>
        <AutoGrowTextarea
          id={inputId}
          rows={3}
          spellCheck={false}
          value={jsonDraft}
          placeholder={control.typeText.includes("[]") ? "[]" : "{}"}
          aria-invalid={jsonError !== null ? true : undefined}
          aria-describedby={jsonError !== null ? errorId : undefined}
          onChange={(event) => commitJsonDraft(event.currentTarget.value)}
        />
        {jsonError !== null
          ? (
            <small
              className="discern-builder-control__error"
              id={errorId}
              role="alert"
            >
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

interface AdditionalPropsFieldProps {
  readonly node: BuilderNode;
  readonly onChange: (source: string) => string | null;
}

/** Keeps rejected additional-prop text outside the accepted document. */
function AdditionalPropsField({ node, onChange }: AdditionalPropsFieldProps) {
  const acceptedSource = node.extra ?? "";
  const [draft, setDraft] = useState(acceptedSource);
  const [error, setError] = useState<string | null>(null);
  const inputId = `control-${node.id}-additional-props`;
  const errorId = `${inputId}-error`;
  useEffect(() => {
    setDraft(acceptedSource);
    setError(null);
  }, [node.id, acceptedSource]);
  return (
    <label className="discern-builder-control" htmlFor={inputId}>
      <span>
        Additional props <code>JSON object</code>
      </span>
      <AutoGrowTextarea
        id={inputId}
        rows={2}
        spellCheck={false}
        value={draft}
        placeholder={ADDITIONAL_PROPS_PLACEHOLDER}
        aria-invalid={error !== null ? true : undefined}
        aria-describedby={error !== null ? errorId : undefined}
        onChange={(event) => {
          const source = event.currentTarget.value;
          const nextError = onChange(source);
          if (
            builderValueBytes(source) <=
              BUILDER_DOCUMENT_LIMITS.jsonSourceBytes
          ) {
            setDraft(source);
          }
          setError(nextError);
        }}
      />
      {error === null ? null : (
        <small
          className="discern-builder-control__error"
          id={errorId}
          role="alert"
        >
          {error}
        </small>
      )}
    </label>
  );
}

function App() {
  const [history, setHistory] = useState<BuilderHistoryState>(() =>
    initialHistory(restoredSession.document)
  );
  const historyRef = useRef(history);
  historyRef.current = history;
  const [selection, setSelection] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<
    { readonly nodeId: string; readonly prop: string } | null
  >(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [purpose, setPurpose] = useState<CataloguePurpose | undefined>(
    undefined,
  );
  const [canvasWidth, setCanvasWidth] = useState<CanvasWidth>("fluid");
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeSwitcherMode>(restoredSession.theme);
  const [accentHue, setAccentHue] = useState(255);
  const [activePane, setActivePane] = useState<WorkspacePane>("canvas");
  const [confirmingNew, setConfirmingNew] = useState(false);
  const feedbackSerial = useRef(0);
  const [feedback, setFeedback] = useState<BuilderFeedback | null>(null);
  const [durableFeedback, setDurableFeedback] = useState<
    BuilderFeedback | null
  >(
    () =>
      restoredSession.message === undefined ? null : {
        kind: restoredSession.error ? "error" : "status",
        message: restoredSession.message,
        serial: 0,
      },
  );
  const [recoverySource] = useState<string | null>(
    restoredSession.recoverySource ?? null,
  );
  const fileLoadToken = useRef(0);
  const canvasPageRef = useRef<HTMLDivElement>(null);
  const inspectorHeadingRef = useRef<HTMLHeadingElement>(null);
  const compositionHeadingRef = useRef<HTMLHeadingElement>(null);
  const paletteSearchRef = useRef<HTMLInputElement>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);
  const confirmNewButtonRef = useRef<HTMLButtonElement>(null);
  const outlineButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const focusRequest = useRef<
    | { readonly kind: "selection"; readonly id: string | null }
    | { readonly kind: "inspector" }
    | { readonly kind: "palette" }
    | null
  >(null);

  const document = history.present;

  const announce = (
    message: string,
    kind: BuilderFeedback["kind"] = "status",
  ): void => {
    feedbackSerial.current += 1;
    setFeedback({ kind, message, serial: feedbackSerial.current });
  };

  useEffect(() => {
    const result = persistBuilderDocument(
      builderStorage,
      document,
      documentPolicy,
    );
    if (!result.ok) {
      setDurableFeedback((current) =>
        current?.message === result.message
          ? current
          : { kind: "error", message: result.message, serial: 0 }
      );
    }
  }, [document]);

  useLayoutEffect(() => {
    const page = canvasPageRef.current;
    if (page === null) return;
    const suppressCanvasControls = (): void => {
      for (const element of page.querySelectorAll(CANVAS_FOCUSABLE_SELECTOR)) {
        if (element.getAttribute("tabindex") !== "-1") {
          element.setAttribute("tabindex", "-1");
        }
        if (
          element.hasAttribute("contenteditable") &&
          element.getAttribute("contenteditable") !== "false"
        ) {
          element.setAttribute("contenteditable", "false");
        }
      }
    };
    suppressCanvasControls();
    const observer = new MutationObserver(suppressCanvasControls);
    observer.observe(page, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["contenteditable", "controls", "href", "tabindex"],
    });
    return () => observer.disconnect();
  }, [document]);

  useEffect(() => {
    const request = focusRequest.current;
    if (request === null) return;
    focusRequest.current = null;
    globalThis.requestAnimationFrame(() => {
      if (request.kind === "palette") {
        paletteSearchRef.current?.focus();
      } else if (request.kind === "inspector") {
        (inspectorHeadingRef.current ?? compositionHeadingRef.current)?.focus();
      } else if (request.id === null) {
        compositionHeadingRef.current?.focus();
      } else {
        outlineButtonRefs.current.get(request.id)?.focus();
      }
    });
  }, [document, selection, activePane]);

  useEffect(() => {
    if (confirmingNew) confirmNewButtonRef.current?.focus();
  }, [confirmingNew]);

  const apply = (
    update: (current: BuilderDocument) => BuilderDocument,
  ): ApplyResult => {
    try {
      const current = historyRef.current;
      const nextDocument = update(current.present);
      if (nextDocument === current.present) {
        return { changed: false, error: null };
      }
      assertBuilderDocument(nextDocument, documentPolicy);
      const nextHistory = commitHistory(current, nextDocument);
      historyRef.current = nextHistory;
      setHistory(nextHistory);
      return { changed: true, error: null };
    } catch (error) {
      const message = error instanceof BuilderDocumentError
        ? error.message
        : error instanceof Error
        ? error.message
        : "The composition could not be changed.";
      announce(message, "error");
      return { changed: false, error: message };
    }
  };

  const commitName = (): void => {
    if (nameDraft === null) return;
    const name = nameDraft;
    if (name === document.name) {
      setNameDraft(null);
      return;
    }
    if (apply((current) => ({ ...current, name })).changed) {
      setNameDraft(null);
      announce(`Renamed composition to ${name}.`);
    }
  };

  const travelHistory = (direction: "undo" | "redo"): void => {
    const current = historyRef.current;
    const next = direction === "undo"
      ? undoHistory(current)
      : redoHistory(current);
    if (next === current) return;
    historyRef.current = next;
    setHistory(next);
    if (
      selection !== null && findChild(next.present, selection) === undefined
    ) {
      setSelection(null);
      focusRequest.current = { kind: "selection", id: null };
    }
    announce(
      direction === "undo" ? "Undid the last change." : "Redid the change.",
    );
  };

  const undo = (): void => travelHistory("undo");
  const redo = (): void => travelHistory("redo");

  const changeTheme = (next: ThemeSwitcherMode): void => {
    setTheme(next);
    const result = persistBuilderTheme(builderStorage, next);
    if (!result.ok) {
      setDurableFeedback((current) =>
        current?.message === result.message
          ? current
          : { kind: "error", message: result.message, serial: 0 }
      );
    }
  };

  const retryStorage = (): void => {
    builderStorage.retry();
    const savedDocument = persistBuilderDocument(
      builderStorage,
      historyRef.current.present,
      documentPolicy,
    );
    const savedTheme = persistBuilderTheme(builderStorage, theme);
    if (!savedDocument.ok) {
      setDurableFeedback({
        kind: "error",
        message: savedDocument.message,
        serial: 0,
      });
    } else if (!savedTheme.ok) {
      setDurableFeedback({
        kind: "error",
        message: savedTheme.message,
        serial: 0,
      });
    } else {
      setDurableFeedback(null);
      announce("Browser storage is working again. This composition is saved.");
    }
  };

  const placeComponent = (slug: string, at?: InsertionPoint): void => {
    if (!documentPolicy.knownSlugs.has(slug)) return;
    const armedSlot = pendingSlot !== null &&
        findChild(document, pendingSlot.nodeId)?.child.kind === "component"
      ? pendingSlot
      : null;
    const target = at ??
      (armedSlot !== null
        ? {
          location: {
            parent: "node",
            nodeId: armedSlot.nodeId,
            prop: armedSlot.prop,
          } as const,
          index: Number.MAX_SAFE_INTEGER,
        }
        : insertionPoint(document, selection));
    const instance = instantiateComponent(slug);
    const result = apply((current) =>
      insertChild(current, target.location, target.index, instance)
    );
    if (!result.changed) return;
    setPendingSlot(null);
    setSelection(instance.id);
    setActivePane("inspector");
    focusRequest.current = { kind: "inspector" };
    announce(`Placed ${childLabel(instance)}.`);
  };

  const deleteChild = (id: string): void => {
    const found = findChild(historyRef.current.present, id);
    if (found === undefined) return;
    const siblings = childrenAt(historyRef.current.present, found.location);
    const focusId = siblings[found.index + 1]?.id ??
      siblings[found.index - 1]?.id ??
      (found.location.parent === "node" ? found.location.nodeId : null);
    const label = childLabel(found.child);
    if (!apply((current) => removeChild(current, id)).changed) return;
    setSelection(focusId);
    setPendingSlot(null);
    setActivePane("inspector");
    focusRequest.current = { kind: "selection", id: focusId };
    announce(`Deleted ${label}.`);
  };

  const wrapSelection = (id: string, slug: string): void => {
    if (findChild(document, id) === undefined) return;
    const wrapper = instantiateComponent(slug);
    if (!apply((current) => wrapChild(current, id, wrapper)).changed) return;
    setSelection(wrapper.id);
    focusRequest.current = { kind: "inspector" };
    announce(`Wrapped the selection in ${childLabel(wrapper)}.`);
  };

  const wrapTargets = LAYOUT_WRAPPER_SLUGS
    .filter((slug) => documentPolicy.knownSlugs.has(slug))
    .map((slug) => ({
      slug,
      name: entryBySlug.get(slug)?.meta.name ?? slug,
    }));

  const handleDrop = (
    payload: DragPayload,
    location: BuilderLocation,
    index: number,
  ): void => {
    if (payload.type === "palette") {
      placeComponent(payload.slug, { location, index });
      return;
    }
    if (
      !apply((current) => moveChild(current, payload.id, location, index))
        .changed
    ) {
      return;
    }
    const moved = findChild(historyRef.current.present, payload.id);
    if (moved === undefined) return;
    setSelection(payload.id);
    announce(`Moved ${childLabel(moved.child)}.`);
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
      if (
        event.defaultPrevented || event.isComposing ||
        shortcutBelongsToControl(event)
      ) return;
      if (event.key === "Escape") {
        setPendingSlot(null);
        setSelection(null);
        return;
      }
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
        deleteChild(selection);
      }
    };
    const onDragEnd = (): void => {
      setDragging(false);
      setDropHint(null);
    };
    globalThis.addEventListener("keydown", onKeyDown);
    globalThis.addEventListener("dragend", onDragEnd);
    return () => {
      globalThis.removeEventListener("keydown", onKeyDown);
      globalThis.removeEventListener("dragend", onDragEnd);
    };
  }, [selection]);

  const slugs = useMemo(() => usedSlugs(document), [document]);
  const cost = useMemo(() => compositionCost(slugs), [slugs]);
  const exported = useMemo(() => {
    try {
      return {
        tsx: documentToTsx(document, exportNaming),
        selection: documentSelectionSnippet(document, documentPolicy),
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
    ...(dropHint?.kind === "node" && node.id === dropHint.id
      ? { "data-discern-builder-drop": "" }
      : {}),
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

  const rootInsertionAt = (pointerY: number) => {
    const page = canvasPageRef.current;
    if (page === null) return { index: document.children.length, offset: 0 };
    const rects = [...page.querySelectorAll<HTMLElement>(
      ":scope > [data-discern-builder-root-child]",
    )].map((element) => {
      const range = globalThis.document.createRange();
      range.selectNodeContents(element);
      const rangeRect = range.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const rect = rangeRect.height > 0 ? rangeRect : elementRect;
      return { top: rect.top, bottom: rect.bottom };
    });
    return rootInsertionFromPointer(
      pointerY,
      rects,
      page.getBoundingClientRect().top,
    );
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
  const selectedSiblings = selectedContext === undefined
    ? []
    : childrenAt(document, selectedContext.location);
  const canMoveUp = selectedContext !== undefined && selectedContext.index > 0;
  const canMoveDown = selectedContext !== undefined &&
    selectedContext.index < selectedSiblings.length - 1;

  const selectForEditing = (id: string | null): void => {
    const selected = id === null ? undefined : findChild(document, id)?.child;
    if (id !== null && selected === undefined) return;
    setSelection(id);
    setPendingSlot(null);
    setActivePane("inspector");
    focusRequest.current = { kind: "inspector" };
    announce(
      selected === undefined
        ? "Selected the composition."
        : `Selected ${childLabel(selected)}.`,
    );
  };

  const nudgeSelection = (id: string, direction: -1 | 1): void => {
    const found = findChild(document, id);
    if (found === undefined) return;
    if (!apply((current) => nudgeChild(current, id, direction)).changed) return;
    announce(
      `Moved ${childLabel(found.child)} ${direction < 0 ? "up" : "down"}.`,
    );
  };

  const duplicateSelection = (id: string): void => {
    const found = findChild(historyRef.current.present, id);
    if (found === undefined) return;
    let duplicatedId: string | null = null;
    const result = apply((current) => {
      const currentFound = findChild(current, id);
      if (currentFound === undefined) return current;
      const next = duplicateChild(current, id);
      duplicatedId = childrenAt(next, currentFound.location)[
        currentFound.index + 1
      ]?.id ?? null;
      return next;
    });
    if (!result.changed || duplicatedId === null) return;
    setSelection(duplicatedId);
    focusRequest.current = { kind: "selection", id: duplicatedId };
    announce(`Duplicated ${childLabel(found.child)}.`);
  };

  const armComponentSlot = (nodeId: string, prop: string): void => {
    setPendingSlot({ nodeId, prop });
    setActivePane("palette");
    focusRequest.current = { kind: "palette" };
    announce(`Choose a component for ${prop}.`);
  };

  const loadFile = async (file: File): Promise<void> => {
    const token = fileLoadToken.current + 1;
    fileLoadToken.current = token;
    announce(`Loading ${file.name}.`);
    try {
      const loaded = await readBuilderDocumentFile(file, documentPolicy);
      if (fileLoadToken.current !== token) return;
      if (apply(() => loaded).error !== null) return;
      setSelection(null);
      setPendingSlot(null);
      setActivePane("inspector");
      focusRequest.current = { kind: "selection", id: null };
      announce(`Loaded ${file.name}.`);
    } catch (error) {
      if (fileLoadToken.current !== token) return;
      announce(
        error instanceof BuilderDocumentError
          ? error.message
          : "The selected file could not be loaded.",
        "error",
      );
    }
  };

  const cancelNewComposition = (): void => {
    setConfirmingNew(false);
    announce("Kept the current composition.");
    globalThis.requestAnimationFrame(() => newButtonRef.current?.focus());
  };

  const confirmNewComposition = (): void => {
    const result = apply(() => emptyDocument("Untitled page"));
    if (result.error !== null) return;
    setConfirmingNew(false);
    setSelection(null);
    setPendingSlot(null);
    setActivePane("inspector");
    focusRequest.current = { kind: "selection", id: null };
    announce("Started a new composition.");
  };

  return (
    <div
      className="discern-builder-shell"
      data-discern-root
      data-discern-builder-ready="true"
      data-discern-theme={theme}
      data-discern-builder-pane={activePane}
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
          value={nameDraft ?? document.name}
          aria-label="Composition name"
          onChange={(event) => setNameDraft(event.currentTarget.value)}
          onBlur={commitName}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
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
          <Select
            value={canvasWidth}
            onChange={(event) =>
              setCanvasWidth(event.currentTarget.value as CanvasWidth)}
            options={Object.entries(canvasWidths).map(([key, { label }]) => ({
              value: key,
              label,
            }))}
          />
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

      <section
        className={`discern-builder-status${
          feedback === null && recoverySource === null &&
            durableFeedback === null && !builderStorage.blocked
            ? " discern-builder-status--empty"
            : ""
        }`}
        aria-label="Builder status"
      >
        {durableFeedback === null ? null : (
          <p
            role={durableFeedback.kind === "error" ? "alert" : "status"}
            aria-live={durableFeedback.kind === "error"
              ? "assertive"
              : "polite"}
            aria-atomic="true"
          >
            {durableFeedback.message}
          </p>
        )}
        <p
          key={feedback?.serial ?? -1}
          role={feedback?.kind === "error" ? "alert" : "status"}
          aria-live={feedback?.kind === "error" ? "assertive" : "polite"}
          aria-atomic="true"
        >
          {feedback?.message ?? ""}
        </p>
        {builderStorage.blocked
          ? (
            <button type="button" onClick={retryStorage}>
              Retry browser storage
            </button>
          )
          : null}
        {recoverySource === null
          ? null
          : (
            <details className="discern-builder-recovery">
              <summary>Rejected composition recovery source</summary>
              <textarea
                readOnly
                rows={4}
                value={recoverySource}
                aria-label="Rejected composition recovery source"
              />
              <button
                type="button"
                onClick={() => {
                  try {
                    downloadSource(recoverySource, "composition-recovery.json");
                    announce("Downloaded the recovery source.");
                  } catch {
                    announce(
                      "The recovery source could not be downloaded.",
                      "error",
                    );
                  }
                }}
              >
                Download recovery source
              </button>
            </details>
          )}
      </section>

      <div
        className="discern-builder-pane-tabs"
        role="tablist"
        aria-label="Workspace panes"
      >
        {WORKSPACE_PANES.map((pane, index) => (
          <button
            type="button"
            role="tab"
            id={`discern-builder-tab-${pane}`}
            aria-controls={`discern-builder-pane-${pane}`}
            aria-selected={activePane === pane}
            tabIndex={activePane === pane ? 0 : -1}
            key={pane}
            onClick={() => setActivePane(pane)}
            onKeyDown={(event) => {
              const delta = event.key === "ArrowRight"
                ? 1
                : event.key === "ArrowLeft"
                ? -1
                : 0;
              if (delta === 0) return;
              event.preventDefault();
              const nextPane = WORKSPACE_PANES[
                (index + delta + WORKSPACE_PANES.length) %
                WORKSPACE_PANES.length
              ];
              if (nextPane === undefined) return;
              setActivePane(nextPane);
              globalThis.requestAnimationFrame(() =>
                globalThis.document.getElementById(
                  `discern-builder-tab-${nextPane}`,
                )?.focus()
              );
            }}
          >
            {pane === "palette"
              ? "Palette"
              : pane === "canvas"
              ? "Canvas"
              : "Inspector"}
          </button>
        ))}
      </div>

      <aside
        className="discern-builder-sidebar"
        id="discern-builder-pane-palette"
        role="tabpanel"
        aria-labelledby="discern-builder-tab-palette"
        onFocusCapture={() => setActivePane("palette")}
      >
        <label className="discern-builder-search">
          <span aria-hidden="true">⌕</span>
          <span className="discern-visually-hidden">Search components</span>
          <input
            ref={paletteSearchRef}
            type="search"
            value={query}
            placeholder="Search components"
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
        <label className="discern-builder-purpose">
          <span className="discern-visually-hidden">Filter by purpose</span>
          <Select
            value={purpose ?? ""}
            onChange={(event) =>
              setPurpose(
                cataloguePurposes.find(
                  (candidate) => candidate === event.currentTarget.value,
                ),
              )}
            options={[
              { value: "", label: "All purposes" },
              ...cataloguePurposes.map((candidate) => ({
                value: candidate,
                label: candidate,
              })),
            ]}
          />
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
        id="discern-builder-pane-canvas"
        role="tabpanel"
        tabIndex={0}
        aria-labelledby="discern-builder-tab-canvas"
        aria-description="Rendered components are an inspection surface. Use the outline and inspector to select and edit them."
        onClickCapture={(event) => {
          event.preventDefault();
          event.stopPropagation();
          selectForEditing(nodeIdAt(event.target));
        }}
        onFocusCapture={(event) => {
          if (
            event.target !== event.currentTarget &&
            event.target instanceof HTMLElement
          ) {
            event.target.blur();
          }
        }}
        onDragOverCapture={(event) => {
          event.preventDefault();
          const nodeId = nodeIdAt(event.target);
          setDropHint(
            nodeId === null
              ? { kind: "root", ...rootInsertionAt(event.clientY) }
              : { kind: "node", id: nodeId },
          );
        }}
        onDragLeave={(event) => {
          if (
            event.relatedTarget instanceof Node &&
            event.currentTarget.contains(event.relatedTarget)
          ) return;
          setDropHint(null);
        }}
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
              rootInsertionAt(event.clientY).index,
            );
          } else {
            dropOnNode(payload, nodeId);
          }
        }}
      >
        <div
          ref={canvasPageRef}
          className="discern-builder-canvas__page"
          style={pageStyle}
          aria-hidden="true"
        >
          {dropHint?.kind === "root" && dragging
            ? (
              <div
                className="discern-builder-root-insertion"
                data-discern-builder-root-insertion={dropHint.index}
                style={{ top: dropHint.offset }}
              />
            )
            : null}
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
            : document.children.map((child, index) => (
              <div
                className="discern-builder-root-child"
                data-discern-builder-root-child={child.id}
                data-discern-builder-root-index={index}
                key={child.id}
              >
                <CanvasBoundary label={childLabel(child)}>
                  <CanvasInstance
                    child={child}
                    options={{ decorate }}
                  />
                </CanvasBoundary>
              </div>
            ))}
        </div>
      </main>

      <aside
        className="discern-builder-inspector"
        id="discern-builder-pane-inspector"
        role="tabpanel"
        aria-labelledby="discern-builder-tab-inspector"
        onFocusCapture={() => setActivePane("inspector")}
      >
        {selectedNode !== undefined && selectedEntry !== undefined
          ? (
            <div className="discern-builder-inspector__body">
              <InspectorBreadcrumb
                document={document}
                selectionId={selectedNode.id}
                currentLabel={selectedEntry.meta.name}
                onSelect={selectForEditing}
              />
              <header>
                <h2 ref={inspectorHeadingRef} tabIndex={-1}>
                  {selectedEntry.meta.name}
                </h2>
                <p>{selectedEntry.meta.description}</p>
              </header>
              <div
                className="discern-builder-toolbar__group"
                role="group"
                aria-label="Instance actions"
              >
                <button
                  type="button"
                  aria-label={`Move ${selectedEntry.meta.name} up`}
                  title="Move up"
                  disabled={!canMoveUp}
                  onClick={() => nudgeSelection(selectedNode.id, -1)}
                >
                  <span aria-hidden="true">↑</span>
                </button>
                <button
                  type="button"
                  aria-label={`Move ${selectedEntry.meta.name} down`}
                  title="Move down"
                  disabled={!canMoveDown}
                  onClick={() => nudgeSelection(selectedNode.id, 1)}
                >
                  <span aria-hidden="true">↓</span>
                </button>
                <button
                  type="button"
                  onClick={() => duplicateSelection(selectedNode.id)}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="discern-builder-danger"
                  onClick={() => deleteChild(selectedNode.id)}
                >
                  Delete
                </button>
              </div>
              <div
                className="discern-builder-toolbar__group discern-builder-wrap"
                role="group"
                aria-label="Wrap in a layout component"
              >
                <span>Wrap in</span>
                {wrapTargets.map(({ slug, name }) => (
                  <button
                    type="button"
                    key={slug}
                    onClick={() => wrapSelection(selectedNode.id, slug)}
                  >
                    {name}
                  </button>
                ))}
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
                              onClick={() => selectForEditing(child.id)}
                            >
                              {childLabel(child)}
                            </button>
                            <button
                              type="button"
                              aria-label={`Remove ${childLabel(child)}`}
                              onClick={() => deleteChild(child.id)}
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
                            onClick={() => {
                              const textChild: BuilderSlotChild = {
                                kind: "text",
                                id: newChildId(),
                                text: "Text",
                              };
                              if (
                                apply((current) =>
                                  insertChild(
                                    current,
                                    {
                                      parent: "node",
                                      nodeId: selectedNode.id,
                                      prop: control.name,
                                    },
                                    Number.MAX_SAFE_INTEGER,
                                    textChild,
                                  )
                                ).changed
                              ) {
                                setSelection(textChild.id);
                                focusRequest.current = { kind: "inspector" };
                                announce(`Added text to ${control.label}.`);
                              }
                            }}
                          >
                            ＋ Text
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            armComponentSlot(selectedNode.id, control.name)}
                        >
                          ＋ Component…
                        </button>
                      </div>
                    </section>
                  )
                  : (
                    <ControlField
                      key={`${selectedNode.id}:${control.name}`}
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
                        ).error}
                    />
                  )
              )}
              <AdditionalPropsField
                key={selectedNode.id}
                node={selectedNode}
                onChange={(source) =>
                  apply((current) =>
                    updateNodeExtra(current, selectedNode.id, source)
                  ).error}
              />
            </div>
          )
          : selectedText !== undefined
          ? (
            <div className="discern-builder-inspector__body">
              <InspectorBreadcrumb
                document={document}
                selectionId={selectedText.id}
                currentLabel="Text"
                onSelect={selectForEditing}
              />
              <header>
                <h2 ref={inspectorHeadingRef} tabIndex={-1}>Text</h2>
                <p>
                  Literal text placed in a slot. Newlines become line breaks.
                </p>
              </header>
              <div
                className="discern-builder-toolbar__group"
                role="group"
                aria-label="Text actions"
              >
                <button
                  type="button"
                  aria-label="Move text up"
                  title="Move up"
                  disabled={!canMoveUp}
                  onClick={() => nudgeSelection(selectedText.id, -1)}
                >
                  <span aria-hidden="true">↑</span>
                </button>
                <button
                  type="button"
                  aria-label="Move text down"
                  title="Move down"
                  disabled={!canMoveDown}
                  onClick={() => nudgeSelection(selectedText.id, 1)}
                >
                  <span aria-hidden="true">↓</span>
                </button>
                <button
                  type="button"
                  onClick={() => duplicateSelection(selectedText.id)}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="discern-builder-danger"
                  onClick={() => deleteChild(selectedText.id)}
                >
                  Delete
                </button>
              </div>
              <label className="discern-builder-control">
                <span>Content</span>
                <AutoGrowTextarea
                  rows={4}
                  value={selectedText.text}
                  onChange={(event) => {
                    const content = event.currentTarget.value;
                    apply((current) =>
                      updateTextChild(current, selectedText.id, content)
                    );
                  }}
                />
              </label>
              <div
                className="discern-builder-toolbar__group discern-builder-wrap"
                role="group"
                aria-label="Wrap in a layout component"
              >
                <span>Wrap in</span>
                {wrapTargets.map(({ slug, name }) => (
                  <button
                    type="button"
                    key={slug}
                    onClick={() => wrapSelection(selectedText.id, slug)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )
          : (
            <div className="discern-builder-inspector__body">
              <header>
                <h2 ref={compositionHeadingRef} tabIndex={-1}>Composition</h2>
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
                    try {
                      downloadSource(
                        serializeDocument(document, documentPolicy),
                        `${fileStem(document.name)}.json`,
                      );
                      announce("Saved the composition file.");
                    } catch {
                      announce(
                        "The composition file could not be saved.",
                        "error",
                      );
                    }
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
                      void loadFile(file);
                    }}
                  />
                </label>
                {confirmingNew
                  ? (
                    <div
                      className="discern-builder-new-confirmation"
                      role="group"
                      aria-label="Confirm new composition"
                    >
                      <span>Replace the current composition?</span>
                      <button
                        ref={confirmNewButtonRef}
                        type="button"
                        className="discern-builder-danger"
                        onClick={confirmNewComposition}
                      >
                        Replace with empty composition
                      </button>
                      <button type="button" onClick={cancelNewComposition}>
                        Keep current composition
                      </button>
                    </div>
                  )
                  : (
                    <button
                      ref={newButtonRef}
                      type="button"
                      className="discern-builder-danger"
                      onClick={() => {
                        setConfirmingNew(true);
                        announce(
                          "Confirm whether to replace the current composition.",
                        );
                      }}
                    >
                      New
                    </button>
                  )}
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
                  data-discern-builder-outline-id={row.child.id}
                  style={{
                    "--discern-builder-depth": row.depth,
                  } as CSSProperties}
                >
                  <button
                    ref={(element) => {
                      if (element === null) {
                        outlineButtonRefs.current.delete(row.child.id);
                      } else {
                        outlineButtonRefs.current.set(row.child.id, element);
                      }
                    }}
                    type="button"
                    draggable
                    aria-current={row.child.id === selection
                      ? "true"
                      : undefined}
                    className={row.child.id === selection
                      ? "discern-builder-outline__row discern-builder-outline__row--selected"
                      : "discern-builder-outline__row"}
                    onClick={() => {
                      setSelection(row.child.id);
                      announce(`Selected ${childLabel(row.child)}.`);
                    }}
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
createRoot(root).render(
  <AppBoundary>
    <App />
  </AppBoundary>,
);
