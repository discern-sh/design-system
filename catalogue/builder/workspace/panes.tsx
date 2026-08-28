import type { Dispatch, SetStateAction } from "react";

export type WorkspacePane = "palette" | "canvas" | "inspector";

export const WORKSPACE_PANES: readonly WorkspacePane[] = [
  "palette",
  "canvas",
  "inspector",
];

function paneLabel(pane: WorkspacePane): string {
  return pane === "palette"
    ? "Palette"
    : pane === "canvas"
    ? "Canvas"
    : "Inspector";
}

/** Adaptive pane navigation; wide layouts continue to expose all panes. */
export function WorkspacePaneTabs(
  { active, onActive }: Readonly<{
    active: WorkspacePane;
    onActive: Dispatch<SetStateAction<WorkspacePane>>;
  }>,
) {
  return (
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
          aria-selected={active === pane}
          tabIndex={active === pane ? 0 : -1}
          key={pane}
          onClick={() => onActive(pane)}
          onKeyDown={(event) => {
            const delta = event.key === "ArrowRight"
              ? 1
              : event.key === "ArrowLeft"
              ? -1
              : 0;
            if (delta === 0) return;
            event.preventDefault();
            const next = WORKSPACE_PANES[
              (index + delta + WORKSPACE_PANES.length) % WORKSPACE_PANES.length
            ];
            if (next === undefined) return;
            onActive(next);
            globalThis.requestAnimationFrame(() =>
              globalThis.document.getElementById(
                `discern-builder-tab-${next}`,
              )?.focus()
            );
          }}
        >
          {paneLabel(pane)}
        </button>
      ))}
    </div>
  );
}
