import { useState } from "react";
import { packageVersion } from "../../generated/registry.ts";
import type { BuilderPreviewPreferences } from "../preview/controls.tsx";
import { PreviewToolbarControls } from "../preview/controls.tsx";
import type { AcceptedDocumentStore } from "./document-store.ts";

export interface BuilderToolbarProps {
  readonly store: AcceptedDocumentStore;
  readonly preview: BuilderPreviewPreferences;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly announce: (message: string, tone?: "status" | "error") => void;
}

/** Stable workspace toolbar; preview owns its width and Appearance controls. */
export function BuilderToolbar(
  { store, preview, onUndo, onRedo, announce }: BuilderToolbarProps,
) {
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const commitName = (): void => {
    if (nameDraft === null) return;
    const name = nameDraft;
    if (name === store.document.name) {
      setNameDraft(null);
      return;
    }
    if (store.apply((document) => ({ ...document, name })).changed) {
      setNameDraft(null);
      announce(`Renamed composition to ${name}.`);
    }
  };
  return (
    <header className="discern-builder-toolbar">
      <a className="discern-builder-brand" href="../">
        <span aria-hidden="true">◮</span>
        <span>
          <strong>discern</strong>
          <small>
            <span className="discern-builder-brand-label">
              Interface builder
            </span>
            <span className="discern-builder-beta">Beta</span>
          </small>
        </span>
      </a>
      <input
        className="discern-builder-name"
        type="text"
        value={nameDraft ?? store.document.name}
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
          onClick={onUndo}
          disabled={store.history.past.length === 0}
        >
          ↺ Undo
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={store.history.future.length === 0}
        >
          ↻ Redo
        </button>
      </div>
      <PreviewToolbarControls preferences={preview} />
      <span className="discern-builder-version">v{packageVersion}</span>
    </header>
  );
}
