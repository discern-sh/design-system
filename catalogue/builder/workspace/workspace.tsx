import { useEffect, useMemo, useState } from "react";
import { BuilderDiscovery } from "../discovery/palette.tsx";
import { BuilderFeedbackRegion } from "../inspector/feedback-region.tsx";
import { BuilderInspector } from "../inspector/inspector.tsx";
import { preflightBuilderDocument } from "../inspector/preflight.ts";
import { useBuilderFeedback } from "../inspector/use-feedback.ts";
import {
  browserBuilderStorage,
  persistBuilderDocument,
  restoreBuilderSession,
} from "../persistence.ts";
import { BuilderPreviewCanvas } from "../preview/canvas.tsx";
import { useBuilderPreviewPreferences } from "../preview/controls.tsx";
import { documentPolicy } from "../registry-core.ts";
import { useBuilderTreeController } from "../tree/controller.ts";
import { BuilderLayers } from "../tree/layers.tsx";
import { useAcceptedDocumentStore } from "./document-store.ts";
import { WorkspacePaneTabs } from "./panes.tsx";
import type { WorkspacePane } from "./panes.tsx";
import { BuilderToolbar } from "./toolbar.tsx";

const builderStorage = browserBuilderStorage();
const restoredSession = restoreBuilderSession(builderStorage, documentPolicy);

/**
 * Compose the feature-owned Builder surfaces around one accepted document.
 * No feature receives a history setter or an unvalidated document channel.
 */
export function BuilderWorkspace() {
  const [activePane, setActivePane] = useState<WorkspacePane>("canvas");
  const feedback = useBuilderFeedback(restoredSession);
  const store = useAcceptedDocumentStore(
    restoredSession.document,
    documentPolicy,
    (message) => feedback.announce(message, "error"),
  );
  const preview = useBuilderPreviewPreferences(
    restoredSession.theme,
  );
  const tree = useBuilderTreeController(
    store,
    setActivePane,
    feedback.announce,
  );
  const preflight = useMemo(
    () => preflightBuilderDocument(store.document),
    [store.document],
  );
  useEffect(() => {
    feedback.persistence("saving", "Saving composition.");
    const result = persistBuilderDocument(
      builderStorage,
      store.document,
      documentPolicy,
    );
    if (!result.ok) {
      feedback.storageFailure(result.message);
      return;
    }
    feedback.storageFailure(null);
    feedback.persistence("saved", "Composition saved.");
  }, [store.document]);

  const retryStorage = (): void => {
    builderStorage.retry();
    const savedDocument = persistBuilderDocument(
      builderStorage,
      store.document,
      documentPolicy,
    );
    if (!savedDocument.ok) {
      feedback.storageFailure(savedDocument.message);
    } else {
      feedback.storageFailure(null);
      feedback.persistence("saved", "Composition saved.");
      feedback.announce(
        "Browser storage is working again. This composition is saved.",
      );
    }
  };

  return (
    <div
      className="discern-builder-shell"
      data-discern-root
      data-discern-builder-ready="true"
      data-discern-theme={preview.workspaceAppearance.theme}
      data-discern-accent={preview.workspaceAppearance.accent === undefined
        ? undefined
        : ""}
      data-discern-builder-pane={activePane}
      style={preview.workspaceStyle}
    >
      <BuilderToolbar
        store={store}
        preview={preview}
        onUndo={tree.undo}
        onRedo={tree.redo}
        announce={feedback.announce}
      />
      <BuilderFeedbackRegion
        feedback={feedback}
        storage={builderStorage}
        recoverySource={restoredSession.recoverySource ?? null}
        onRetry={retryStorage}
      />
      <WorkspacePaneTabs active={activePane} onActive={setActivePane} />
      <BuilderDiscovery
        tree={tree}
        store={store}
        theme={preview.previewResolvedTheme}
        onActive={() => setActivePane("palette")}
      />
      <BuilderPreviewCanvas
        document={store.document}
        selectionId={tree.selection.id}
        preferences={preview}
        tree={tree}
      />
      <BuilderInspector
        store={store}
        tree={tree}
        preflight={preflight}
        feedback={feedback}
        onActive={() => setActivePane("inspector")}
        layers={<BuilderLayers document={store.document} tree={tree} />}
      />
    </div>
  );
}
