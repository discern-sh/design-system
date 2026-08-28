import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CopyButton } from "../../../src/components/docs/copy-button/copy-button.tsx";
import { AutoGrowTextarea } from "../fields.tsx";
import {
  emptyDocument,
  updateNodeExtra,
  updateNodeProp,
  updateTextChild,
} from "../model.ts";
import { componentCount } from "../model.ts";
import { readBuilderDocumentFile } from "../persistence.ts";
import { documentPolicy, entryBySlug } from "../registry-core.ts";
import type { BuilderTreeController } from "../tree/controller.ts";
import { childLabel, slotChildrenOf } from "../tree/projection.ts";
import type { AcceptedDocumentStore } from "../workspace/document-store.ts";
import { builderFileStem, downloadBuilderSource } from "./files.ts";
import type { BuilderPreflightResult } from "./preflight.ts";
import {
  AdditionalPropsField,
  InspectorControlField,
} from "./property-fields.tsx";
import { controlsBySlug } from "./registry.ts";
import type { BuilderFeedbackController } from "./use-feedback.ts";
import { ancestorsOf } from "../model.ts";

function formatBytes(bytes: number): string {
  return bytes >= 1000
    ? `${(bytes / 1000).toFixed(1)} kB`
    : `${String(bytes)} B`;
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
        onClick={() => tree.deleteChild(id)}
      >
        Delete
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
  const fileLoadToken = useRef(0);
  const newButtonRef = useRef<HTMLButtonElement>(null);
  const confirmNewButtonRef = useRef<HTMLButtonElement>(null);
  const document = store.document;
  const selectedNode = tree.selection.node;
  const selectedText = tree.selection.text;
  const selectedEntry = selectedNode === undefined
    ? undefined
    : entryBySlug.get(selectedNode.slug);

  useEffect(() => {
    if (confirmingNew) confirmNewButtonRef.current?.focus();
  }, [confirmingNew]);

  const loadFile = async (file: File): Promise<void> => {
    const token = fileLoadToken.current + 1;
    fileLoadToken.current = token;
    feedback.announce(`Loading ${file.name}.`);
    try {
      const loaded = await readBuilderDocumentFile(file, documentPolicy);
      if (fileLoadToken.current !== token) return;
      if (store.apply(() => loaded).error !== null) return;
      tree.resetSelection();
      feedback.validation(null);
      feedback.announce(`Loaded ${file.name}.`);
    } catch (error) {
      if (fileLoadToken.current !== token) return;
      feedback.announce(
        error instanceof Error
          ? error.message
          : "The selected file could not be loaded.",
        "error",
      );
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
    tree.resetSelection();
    feedback.validation(null);
    feedback.announce("Started a new composition.");
  };

  return (
    <aside
      className="discern-builder-inspector"
      id="discern-builder-pane-inspector"
      role="tabpanel"
      aria-labelledby="discern-builder-tab-inspector"
      onFocusCapture={onActive}
    >
      {selectedNode !== undefined && selectedEntry !== undefined
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
            {controlsBySlug(selectedNode.slug).map((control) =>
              control.control === "slot"
                ? (
                  <section className="discern-builder-slot" key={control.name}>
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
                            onClick={() => tree.selectForEditing(child.id)}
                          >
                            {childLabel(child)}
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove ${childLabel(child)}`}
                            onClick={() => tree.deleteChild(child.id)}
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
                            tree.addText(
                              selectedNode.id,
                              control.name,
                              control.label,
                            )}
                        >
                          ＋ Text
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          tree.armComponentSlot(selectedNode.id, control.name)}
                      >
                        ＋ Component…
                      </button>
                    </div>
                  </section>
                )
                : (
                  <InspectorControlField
                    key={`${selectedNode.id}:${control.name}`}
                    node={selectedNode}
                    control={control}
                    onChange={(value) =>
                      store.apply((current) =>
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
                store.apply((current) =>
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
            {preflight.ok
              ? (
                <>
                  <dl className="discern-builder-cost">
                    <div>
                      <dt>Component CSS</dt>
                      <dd>{formatBytes(preflight.cost.componentCssBytes)}</dd>
                    </div>
                    <div>
                      <dt>Behavior script</dt>
                      <dd>
                        {preflight.cost.needsBehaviorScript
                          ? "required"
                          : "not needed"}
                      </dd>
                    </div>
                  </dl>
                  {preflight.cost.breakdown.length === 0
                    ? null
                    : (
                      <details className="discern-builder-cost-detail">
                        <summary>Shipped components</summary>
                        <ul>
                          {preflight.cost.breakdown.map(({ id, cssBytes }) => (
                            <li key={id}>
                              <span>{id}</span>
                              <span>{formatBytes(cssBytes)}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  <div className="discern-builder-exports">
                    <CopyButton
                      value={preflight.tsx}
                      label="Copy TSX source"
                      copiedLabel="TSX copied"
                    />
                    <CopyButton
                      value={preflight.selection}
                      label="Copy runtime selection"
                      copiedLabel="Selection copied"
                    />
                  </div>
                </>
              )
              : (
                <p className="discern-builder-control__error" role="alert">
                  {preflight.message}
                </p>
              )}
            <div className="discern-builder-toolbar__group">
              <button
                type="button"
                onClick={() => {
                  if (!preflight.ok) return;
                  try {
                    downloadBuilderSource(
                      preflight.json,
                      `${builderFileStem(document.name)}.json`,
                    );
                    feedback.announce("Saved the composition file.");
                  } catch {
                    feedback.announce(
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
                    if (file !== undefined) void loadFile(file);
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
                      onClick={confirmNew}
                    >
                      Replace with empty composition
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
                    New
                  </button>
                )}
            </div>
          </div>
        )}
      {layers}
    </aside>
  );
}
