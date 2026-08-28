import { createRoot } from "react-dom/client";
import { BuilderAppBoundary } from "./workspace/error-boundary.tsx";
import { BuilderWorkspace } from "./workspace/workspace.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("Builder root is missing");

createRoot(root).render(
  <BuilderAppBoundary>
    <BuilderWorkspace />
  </BuilderAppBoundary>,
);
