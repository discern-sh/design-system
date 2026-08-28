import { createRoot } from "react-dom/client";
import { BuilderPreviewFrameApp } from "./preview/frame.tsx";
import { BuilderAppBoundary } from "./workspace/error-boundary.tsx";
import { BuilderWorkspace } from "./workspace/workspace.tsx";

const root = document.getElementById("root");
const frameRoot = document.getElementById("discern-builder-preview-frame-root");
if (!root && !frameRoot) throw new Error("Builder root is missing");

if (frameRoot) {
  createRoot(frameRoot).render(<BuilderPreviewFrameApp />);
} else if (root) {
  createRoot(root).render(
    <BuilderAppBoundary>
      <BuilderWorkspace />
    </BuilderAppBoundary>,
  );
}
