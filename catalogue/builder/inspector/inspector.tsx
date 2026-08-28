import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CodeListing } from "../../../src/components/editorial/code-listing/code-listing.tsx";
import { catalogueComponentPath } from "../../routes/components.ts";
import {
  INSPECTOR_SECTIONS,
  type InspectorSection,
  type PropControl,
} from "../controls.ts";
import { AutoGrowTextarea } from "../fields.tsx";
import {
  emptyDocument,
  updateNodeExtra,
  updateNodeProp,
  updateTextChild,
} from "../model.ts";
import { componentCount } from "../model.ts";
import { readBuilderDocumentFile } from "../persistence.ts";
import {
  documentPolicy,
  entryBySlug,
  instantiateComponent,
} from "../registry-core.ts";
import type { BuilderTreeController } from "../tree/controller.ts";
import { childLabel, slotChildrenOf } from "../tree/projection.ts";
import type { AcceptedDocumentStore } from "../workspace/document-store.ts";
import { copyBuilderSource, downloadBuilderSource } from "./files.ts";
import type { BuilderPreflightResult } from "./preflight.ts";
import {
  AdditionalPropsField,
  InspectorControlField,
} from "./property-fields.tsx";
import { inspectorControlBySlug } from "./registry.ts";
import type { BuilderFeedbackController } from "./use-feedback.ts";
import type { ProjectedBuilderIssue } from "./validation.ts";
import { projectPolicyIssue } from "./validation.ts";
import { ancestorsOf } from "../model.ts";

function formatBytes(bytes: number): string {
  return bytes >= 1000
    ? `${(bytes / 1000).toFixed(1)} kB`
    : `${String(bytes)} B`;
}

function humanSelectionPath(
  document: AcceptedDocumentStore["document"],
  selectionId: string,
  currentLabel: string,
): string {
  return [
    ...ancestorsOf(document, selectionId).map((ancestor) =>
      entryBySlug.get(ancestor.slug)?.meta.name ?? ancestor.slug
    ),
    currentLabel,
  ].join(" › ");
}

function controlsInSection(
  controls: readonly PropControl[],
  section: InspectorSection,
): readonly PropControl[] {
  return controls.filter((control) =>
    (control.section ?? "Content") === section && control.control !== "slot"
  );
}

function InspectorBreadcrumb(
  { document, selectionId, currentLabel, onSelect }: Readonly<{
    document: AcceptedDocumentStore["document"];
    selectionId: string;
    currentLabel: string;
    onSelect: (id: string | null) => void;
  }>,
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

function InstanceActions(
  { id, label, tree }: Readonly<{
    id: string;
    label: string;
    tree: BuilderTreeController;
  }>,
) {
  return (
    <div
      className="discern-builder-toolbar__group"
      role="group"
      aria-label={label === "Text" ? "Text actions" : "Instance actions"}
    >
      <button
        type="button"
        aria-label={`Move ${
          label.toLowerCase() === "text" ? "text" : label
        } up`}
        title="Move up"
        disabled={!tree.canMoveUp}
        onClick={() => tree.nudgeSelection(id, -1)}
      >
        <span aria-hidden="true">↑</span>
      </button>
      <button
        type="button"
        aria-label={`Move ${
          label.toLowerCase() === "text" ? "text" : label
        } down`}
        title="Move down"
        disabled={!tree.canMoveDown}
        onClick={() => tree.nudgeSelection(id, 1)}
      >
        <span aria-hidden="true">↓</span>
      </button>
      <button type="button" onClick={() => tree.duplicateSelection(id)}>
        Duplicate
      </button>
      <button
        type="button"
        className="discern-builder-danger"
        aria-label="Delete"
        onClick={() => tree.deleteChild(id)}
      >
        Delete <kbd aria-hidden="true">Del</kbd>
      </button>
    </div>
  );
}

function WrapActions(
  { id, tree }: Readonly<{ id: string; tree: BuilderTreeController }>,
) {
  return (
    <div
      className="discern-builder-toolbar__group discern-builder-wrap"
      role="group"
      aria-label="Wrap in a layout component"
    >
      <span>Wrap in</span>
      {tree.wrapTargets.map(({ slug, name }) => (
        <button
          type="button"
          key={slug}
          onClick={() => tree.wrapSelection(id, slug)}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

function SlotActions(
  { nodeId, control, tree }: Readonly<{
    nodeId: string;
    control: Extract<PropControl, { control: "slot" }>;
    tree: BuilderTreeController;
  }>,
) {
  return (
    <div className="discern-builder-toolbar__group">
      {control.elementOnly ? null : (
        <button
          type="button"
          onClick={() => tree.addText(nodeId, control.name, control.label)}
        >
          Add Text to {control.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => tree.armComponentSlot(nodeId, control.name)}
      >
        Add Component to {control.label}…
      </button>
    </div>
  );
}

function SlotEditor(
  { node, control, store, tree }: Readonly<{
    node: NonNullable<BuilderTreeController["selection"]["node"]>;
    control: Extract<PropControl, { control: "slot" }>;
    store: AcceptedDocumentStore;
    tree: BuilderTreeController;
  }>,
) {
  const children = slotChildrenOf(node, control.name);
  const onlyText = children.length === 1 && children[0]?.kind === "text"
    ? children[0]
    : undefined;
  return (
    <section className="discern-builder-slot" data-control={control.name}>
      <header>
        <h4>{control.label}</h4>
        <span>
          {String(children.length)} item{children.length === 1 ? "" : "s"}
        </span>
      </header>
      <small className="discern-builder-control__technical">
        <code>{control.name}</code> · <code>{control.typeText}</code>
      </small>
      {onlyText === undefined
        ? (
          <ul>
            {children.map((child) => (
              <li key={child.id}>
                <button
                  type="button"
                  onClick={() => tree.selectForEditing(child.id)}
                >
                  {childLabel(child)}
                </button>
                <button
                  type="button"
                  className="discern-builder-danger"
                  aria-label={`Remove ${
                    childLabel(child)
                  } from ${control.label}`}
                  onClick={() => tree.deleteChild(child.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )
        : (
          <label className="discern-builder-slot__text">
            <span>{control.label} text</span>
            <AutoGrowTextarea
              rows={2}
              value={onlyText.text}
              onChange={(event) => {
                const content = event.currentTarget.value;
                store.apply((current) =>
                  updateTextChild(current, onlyText.id, content)
                );
              }}
            />
          </label>
        )}
      <SlotActions nodeId={node.id} control={control} tree={tree} />
    </section>
  );
}

function OptionalSlotMenu(
  { node, controls, tree }: Readonly<{
    node: NonNullable<BuilderTreeController["selection"]["node"]>;
    controls: readonly Extract<PropControl, { control: "slot" }>[];
    tree: BuilderTreeController;
  }>,
) {
  if (controls.length === 0) return null;
  return (
    <details className="discern-builder-optional-slots">
      <summary>Add content…</summary>
      <ul>
        {controls.map((control) => (
          <li key={control.name}>
            <div>
              <strong>{control.label}</strong>
              <small>
                <code>{control.name}</code> · {control.typeText}
              </small>
            </div>
            <SlotActions nodeId={node.id} control={control} tree={tree} />
          </li>
        ))}
      </ul>
    </details>
  );
}

function InspectorDisclosure(
  { section, children }: Readonly<{
    section: InspectorSection;
    children: ReactNode;
  }>,
) {
  const [open, setOpen] = useState(section === "Content");
  return (
    <details
      className="discern-builder-inspector-section"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>{section}</summary>
      <div className="discern-builder-inspector-section__body">{children}</div>
    </details>
  );
}

type ExportTab = "tsx" | "runtime" | "json";

const EXPORT_TABS: readonly {
  readonly id: ExportTab;
  readonly label: string;
  readonly language: string;
}[] = [
  { id: "tsx", label: "TSX", language: "tsx" },
  { id: "runtime", label: "Runtime selection", language: "typescript" },
  { id: "json", label: "Builder JSON", language: "json" },
];

function ExportWorkspace(
  { preflight }: Readonly<{ preflight: BuilderPreflightResult }>,
) {
  const [active, setActive] = useState<ExportTab>("tsx");
  const [action, setAction] = useState<
    {
      readonly tone: "status" | "error";
      readonly message: string;
    } | null
  >(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (action === null || paused) return;
    const timer = globalThis.setTimeout(() => setAction(null), 4800);
    return () => globalThis.clearTimeout(timer);
  }, [action, paused]);

  if (!preflight.ok) {
    return (
      <section
        className="discern-builder-export"
        id="discern-builder-export"
        aria-labelledby="discern-builder-export-heading"
      >
        <h3 id="discern-builder-export-heading">Export</h3>
        <p className="discern-builder-control__error" role="alert">
          Export is blocked. Fix the composition issue first.
        </p>
        <details>
          <summary>Technical details</summary>
          <code>{preflight.message}</code>
        </details>
      </section>
    );
  }

  const selected = EXPORT_TABS.find(({ id }) => id === active) ??
    EXPORT_TABS[0];
  if (selected === undefined) return null;
  const source = active === "tsx"
    ? preflight.tsx
    : active === "runtime"
    ? preflight.selection
    : preflight.json;
  const filename = active === "tsx"
    ? preflight.identity.filenames.tsx
    : active === "runtime"
    ? preflight.identity.filenames.runtime
    : preflight.identity.filenames.json;
  const mediaType = active === "json"
    ? "application/json;charset=utf-8"
    : active === "tsx"
    ? "text/tsx;charset=utf-8"
    : "text/typescript;charset=utf-8";
  const copy = async (): Promise<void> => {
    const result = await copyBuilderSource(source);
    setAction(
      result.ok
        ? { tone: "status", message: `${selected.label} copied.` }
        : { tone: "error", message: result.message },
    );
  };
  const download = (): void => {
    try {
      downloadBuilderSource(source, filename, mediaType);
      setAction({
        tone: "status",
        message: `Downloaded ${filename}.`,
      });
    } catch {
      setAction({
        tone: "error",
        message: `${filename} could not be downloaded.`,
      });
    }
  };
  return (
    <section
      className="discern-builder-export"
      id="discern-builder-export"
      aria-labelledby="discern-builder-export-heading"
    >
      <header>
        <div>
          <h3 id="discern-builder-export-heading">Export</h3>
          <p>Ready from the currently accepted composition.</p>
        </div>
        <span className="discern-builder-export__ready">Ready</span>
      </header>
      <dl className="discern-builder-export__identity">
        <div>
          <dt>React function</dt>
          <dd>
            <code>{preflight.identity.componentName}</code>
          </dd>
        </div>
        <div>
          <dt>Proposed file</dt>
          <dd>
            <code>{filename}</code>
          </dd>
        </div>
      </dl>
      <div
        className="discern-builder-export__tabs"
        role="tablist"
        aria-label="Export formats"
      >
        {EXPORT_TABS.map((tab) => (
          <button
            type="button"
            role="tab"
            id={`discern-builder-export-tab-${tab.id}`}
            aria-controls="discern-builder-export-source"
            aria-selected={active === tab.id}
            tabIndex={active === tab.id ? 0 : -1}
            key={tab.id}
            onClick={() => {
              setActive(tab.id);
              setAction(null);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        id="discern-builder-export-source"
        role="tabpanel"
        aria-labelledby={`discern-builder-export-tab-${active}`}
      >
        <CodeListing
          title={selected.label}
          filename={filename}
          language={selected.language}
          code={source}
        />
      </div>
      <div className="discern-builder-toolbar__group">
        <button type="button" onClick={() => void copy()}>
          Copy {selected.label}
        </button>
        <button type="button" onClick={download}>
          Download {selected.label}
        </button>
      </div>
      {action === null ? null : (
        <p
          className="discern-builder-export__action"
          role={action.tone === "error" ? "alert" : "status"}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          tabIndex={-1}
        >
          {action.message}
        </p>
      )}
    </section>
  );
}

/** Property, validation, persistence, cost, and export surface. */
export function BuilderInspector(
  { store, tree, preflight, feedback, layers, onActive }: Readonly<{
    store: AcceptedDocumentStore;
    tree: BuilderTreeController;
    preflight: BuilderPreflightResult;
    feedback: BuilderFeedbackController;
    layers: ReactNode;
    onActive: () => void;
  }>,
) {
  const [confirmingNew, setConfirmingNew] = useState(false);
  const [fileIssue, setFileIssue] = useState<
    (ProjectedBuilderIssue & { readonly serial: number }) | null
  >(null);
  const fileLoadToken = useRef(0);
  const newButtonRef = useRef<HTMLButtonElement>(null);
  const confirmNewButtonRef = useRef<HTMLButtonElement>(null);
  const document = store.document;
  const selectedNode = tree.selection.node;
  const selectedText = tree.selection.text;
  const selectedEntry = selectedNode === undefined
    ? undefined
    : entryBySlug.get(selectedNode.slug);
  const selectedRecord = selectedNode === undefined
    ? undefined
    : inspectorControlBySlug(selectedNode.slug);
  const selectionPath =
    selectedNode === undefined || selectedEntry === undefined
      ? ""
      : humanSelectionPath(document, selectedNode.id, selectedEntry.meta.name);

  useEffect(() => {
    if (confirmingNew) confirmNewButtonRef.current?.focus();
  }, [confirmingNew]);

  const loadFile = async (file: File): Promise<void> => {
    const token = fileLoadToken.current + 1;
    fileLoadToken.current = token;
    setFileIssue(null);
    feedback.announce(`Importing ${file.name}.`);
    try {
      const loaded = await readBuilderDocumentFile(file, documentPolicy);
      if (fileLoadToken.current !== token) return;
      if (store.apply(() => loaded).error !== null) return;
      tree.resetSelection();
      setFileIssue(null);
      feedback.announce(`Imported ${file.name}.`);
    } catch (error) {
      if (fileLoadToken.current !== token) return;
      const technical = error instanceof Error
        ? error.message
        : "The selected file could not be read.";
      setFileIssue({
        ...projectPolicyIssue(technical, `Import ${file.name}`),
        serial: token,
      });
    }
  };

  const cancelNew = (): void => {
    setConfirmingNew(false);
    feedback.announce("Kept the current composition.");
    globalThis.requestAnimationFrame(() => newButtonRef.current?.focus());
  };
  const confirmNew = (): void => {
    if (!store.apply(() => emptyDocument("Untitled page")).changed) return;
    setConfirmingNew(false);
    setFileIssue(null);
    tree.resetSelection();
    feedback.announce(
      "Started a new composition. The previous composition was replaced locally.",
    );
  };

  return (
    <aside
      className="discern-builder-inspector"
      id="discern-builder-pane-inspector"
      role="tabpanel"
      aria-labelledby="discern-builder-tab-inspector"
      onFocusCapture={onActive}
    >
      {selectedNode !== undefined && selectedEntry !== undefined &&
          selectedRecord !== undefined
        ? (
          <div className="discern-builder-inspector__body">
            <InspectorBreadcrumb
              document={document}
              selectionId={selectedNode.id}
              currentLabel={selectedEntry.meta.name}
              onSelect={tree.selectForEditing}
            />
            <header>
              <h2 id="discern-builder-selection-heading" tabIndex={-1}>
                {selectedEntry.meta.name}
              </h2>
              <p>{selectedEntry.meta.description}</p>
            </header>
            <InstanceActions
              id={selectedNode.id}
              label={selectedEntry.meta.name}
              tree={tree}
            />
            <WrapActions id={selectedNode.id} tree={tree} />
            <div className="discern-builder-inspector-sections">
              {INSPECTOR_SECTIONS.map((section) => {
                const scalarControls = controlsInSection(
                  selectedRecord.controls,
                  section,
                );
                const slots = section === "Content"
                  ? selectedRecord.controls.filter((
                    control,
                  ): control is Extract<PropControl, { control: "slot" }> =>
                    control.control === "slot"
                  )
                  : [];
                const visibleSlots = slots.filter((control) =>
                  control.required ||
                  slotChildrenOf(selectedNode, control.name).length > 0
                );
                const unusedSlots = slots.filter((control) =>
                  !control.required &&
                  slotChildrenOf(selectedNode, control.name).length === 0
                );
                const callbacks = section === "Behaviour"
                  ? selectedRecord.requiredFunctionProps
                  : [];
                const hasAdvanced = section === "Advanced";
                if (
                  scalarControls.length === 0 && visibleSlots.length === 0 &&
                  unusedSlots.length === 0 && callbacks.length === 0 &&
                  !hasAdvanced
                ) return null;
                return (
                  <InspectorDisclosure section={section} key={section}>
                    {visibleSlots.map((control) => (
                      <SlotEditor
                        key={control.name}
                        node={selectedNode}
                        control={control}
                        store={store}
                        tree={tree}
                      />
                    ))}
                    <OptionalSlotMenu
                      node={selectedNode}
                      controls={unusedSlots}
                      tree={tree}
                    />
                    {scalarControls.map((control) => (
                      <InspectorControlField
                        key={`${selectedNode.id}:${control.name}`}
                        node={selectedNode}
                        control={control}
                        humanPath={`${selectionPath} › ${control.label}`}
                        onChange={(value) =>
                          store.apply((current) =>
                            updateNodeProp(
                              current,
                              selectedNode.id,
                              control.name,
                              value,
                            )
                          ).error}
                        onReset={() => {
                          const seeded = instantiateComponent(
                            selectedNode.slug,
                          ).props[control.name];
                          store.apply((current) =>
                            updateNodeProp(
                              current,
                              selectedNode.id,
                              control.name,
                              seeded,
                            )
                          );
                        }}
                        onRecovered={feedback.announce}
                      />
                    ))}
                    {callbacks.map((callback) => (
                      <article
                        className="discern-builder-callback"
                        key={callback.name}
                      >
                        <strong>{callback.name}</strong>
                        <span>Required consumer callback</span>
                        <code>{callback.name}: function</code>
                        <p>
                          Test this control in Interact mode. Its event witness
                          appears in the Preview event log; the function itself
                          stays outside Builder JSON.
                        </p>
                      </article>
                    ))}
                    {hasAdvanced
                      ? (
                        <AdditionalPropsField
                          key={selectedNode.id}
                          node={selectedNode}
                          humanPath={`${selectionPath} › Additional props`}
                          onChange={(source) =>
                            store.apply((current) =>
                              updateNodeExtra(
                                current,
                                selectedNode.id,
                                source,
                              )
                            ).error}
                          onRecovered={feedback.announce}
                        />
                      )
                      : null}
                  </InspectorDisclosure>
                );
              })}
            </div>
          </div>
        )
        : selectedText !== undefined
        ? (
          <div className="discern-builder-inspector__body">
            <InspectorBreadcrumb
              document={document}
              selectionId={selectedText.id}
              currentLabel="Text"
              onSelect={tree.selectForEditing}
            />
            <header>
              <h2 id="discern-builder-selection-heading" tabIndex={-1}>Text</h2>
              <p>Literal text placed in a slot. Newlines become line breaks.</p>
            </header>
            <InstanceActions id={selectedText.id} label="Text" tree={tree} />
            <label className="discern-builder-control">
              <span>Content</span>
              <AutoGrowTextarea
                rows={4}
                value={selectedText.text}
                onChange={(event) => {
                  const content = event.currentTarget.value;
                  store.apply((current) =>
                    updateTextChild(current, selectedText.id, content)
                  );
                }}
              />
            </label>
            <WrapActions id={selectedText.id} tree={tree} />
          </div>
        )
        : (
          <div className="discern-builder-inspector__body">
            <header>
              <h2 id="discern-builder-composition-heading" tabIndex={-1}>
                Composition
              </h2>
              <p>
                {componentCount(document)} component instances ·{" "}
                {preflight.ok ? preflight.cost.resolved.length : 0}{" "}
                shipped components
              </p>
            </header>
            <details className="discern-builder-shortcuts">
              <summary>Keyboard shortcuts</summary>
              <dl>
                <div>
                  <dt>Undo</dt>
                  <dd>
                    <kbd>⌘ Z</kbd>
                  </dd>
                </div>
                <div>
                  <dt>Redo</dt>
                  <dd>
                    <kbd>⇧ ⌘ Z</kbd>
                  </dd>
                </div>
                <div>
                  <dt>Cancel selection</dt>
                  <dd>
                    <kbd>Esc</kbd>
                  </dd>
                </div>
                <div>
                  <dt>Delete selection</dt>
                  <dd>
                    <kbd>Del</kbd>
                  </dd>
                </div>
              </dl>
              <p>Shortcuts pause while you are typing in a control.</p>
            </details>
            {preflight.ok
              ? (
                <>
                  <dl className="discern-builder-cost">
                    <div>
                      <dt>Instances</dt>
                      <dd>{preflight.cost.instanceCount}</dd>
                    </div>
                    <div>
                      <dt>Unique placed Components</dt>
                      <dd>{preflight.cost.uniquePlacedCount}</dd>
                    </div>
                    <div>
                      <dt>Shipped Components</dt>
                      <dd>{preflight.cost.resolved.length}</dd>
                    </div>
                    <div>
                      <dt>Component CSS</dt>
                      <dd>{formatBytes(preflight.cost.componentCssBytes)}</dd>
                    </div>
                    <div>
                      <dt>Behaviour script</dt>
                      <dd>
                        {preflight.cost.needsBehaviorScript
                          ? "required"
                          : "not needed"}
                      </dd>
                    </div>
                  </dl>
                  <p className="discern-builder-cost__explanation">
                    Repeated instances reuse Component CSS. Dependencies add CSS
                    once when they enter the shipped closure.
                  </p>
                  <p className="discern-builder-cost__behaviour">
                    {preflight.cost.needsBehaviorScript
                      ? "Behaviour is needed by " +
                        preflight.cost.behaviorComponents.map(({ name }) =>
                          name
                        )
                          .join(", ") +
                        "."
                      : "No selected Component needs the behaviour script."}
                  </p>
                  {preflight.cost.breakdown.length === 0
                    ? null
                    : (
                      <details className="discern-builder-cost-detail">
                        <summary>CSS and dependency breakdown</summary>
                        <ul>
                          {preflight.cost.breakdown.map((
                            {
                              id,
                              name,
                              cssBytes,
                              instances,
                              direct,
                              dependencies,
                            },
                          ) => (
                            <li key={id}>
                              <span>
                                <a href={catalogueComponentPath(id)}>{name}</a>
                                <code>{id}</code>
                                <small>
                                  {direct
                                    ? String(instances) + " instance" +
                                      (instances === 1 ? "" : "s")
                                    : "Dependency"}
                                  {dependencies.length === 0
                                    ? ""
                                    : " · needs " + dependencies.join(", ")}
                                </small>
                              </span>
                              <span>{formatBytes(cssBytes)}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                </>
              )
              : null}
            <ExportWorkspace preflight={preflight} />
            <div className="discern-builder-toolbar__group">
              <label className="discern-builder-file">
                Import builder JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    if (file !== undefined) void loadFile(file);
                  }}
                />
              </label>
              {fileIssue === null ? null : (
                <div
                  className="discern-builder-control__issue"
                  key={fileIssue.serial}
                >
                  <p
                    className="discern-builder-control__error"
                    role="alert"
                  >
                    {fileIssue.message}
                  </p>
                  <details>
                    <summary>Technical details</summary>
                    <code>{fileIssue.technical}</code>
                  </details>
                </div>
              )}
              {confirmingNew
                ? (
                  <div
                    className="discern-builder-new-confirmation"
                    role="group"
                    aria-label="Confirm new composition"
                  >
                    <span>
                      Replace the current locally saved composition with an
                      empty one?
                    </span>
                    <button
                      ref={confirmNewButtonRef}
                      type="button"
                      className="discern-builder-danger"
                      onClick={confirmNew}
                    >
                      Replace locally
                    </button>
                    <button type="button" onClick={cancelNew}>
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
                      feedback.announce(
                        "Confirm whether to replace the current composition.",
                      );
                    }}
                  >
                    New / Replace
                  </button>
                )}
            </div>
          </div>
        )}
      {layers}
    </aside>
  );
}
