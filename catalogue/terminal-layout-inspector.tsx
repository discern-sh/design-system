import { useMemo, useState } from "react";
import { CopyButton } from "../src/components/docs/copy-button/copy-button.tsx";
import { projectTerminalInspectorHtml } from "../src/cli/projection.ts";
import type { TerminalThemeVariant } from "../src/cli/theme.ts";
import type { CliCompositionRecipe } from "./cli-compositions.ts";
import { catalogueCliCapabilities } from "./cli-preview.tsx";

const terminalViewportProfiles = [
  { id: "compact", label: "Compact", columns: 40, rows: 24 },
  { id: "standard", label: "Standard", columns: 80, rows: 24 },
  { id: "wide", label: "Wide", columns: 120, rows: 30 },
  { id: "tall", label: "Tall", columns: 80, rows: 40 },
] as const;

type TerminalViewportProfileId =
  (typeof terminalViewportProfiles)[number]["id"];

function terminalViewportProfile(id: TerminalViewportProfileId) {
  const profile = terminalViewportProfiles.find((candidate) =>
    candidate.id === id
  );
  if (profile === undefined) {
    throw new TypeError(`Unknown terminal viewport profile ${id}`);
  }
  return profile;
}

/** Render one complete CLI recipe through the package's real layout inspector. */
export function TerminalLayoutRecipe(
  { recipe, theme }: {
    readonly recipe: CliCompositionRecipe;
    readonly theme: TerminalThemeVariant;
  },
) {
  const [profileId, setProfileId] = useState<TerminalViewportProfileId>(
    "standard",
  );
  const [showGrid, setShowGrid] = useState(false);
  const profile = terminalViewportProfile(profileId);
  const inspectorHtml = useMemo(() => {
    const capabilities = {
      ...catalogueCliCapabilities,
      columns: profile.columns,
    };
    return projectTerminalInspectorHtml(
      recipe.render(capabilities, theme, profile.rows),
      {
        columns: profile.columns,
        rows: profile.rows,
        title: `${recipe.title} · ${profile.label}`,
        showGrid,
        theme,
      },
    );
  }, [profile, recipe, showGrid, theme]);

  return (
    <article
      className="discern-catalogue-terminal-layout"
      id={`terminal-layout-${recipe.id}`}
      data-discern-cli-composition={recipe.id}
    >
      <header className="discern-catalogue-terminal-layout__header">
        <div>
          <h3>{recipe.title}</h3>
          <p>{recipe.description}</p>
        </div>
        <div
          className="discern-catalogue-terminal-layout__components"
          aria-label="Components in this composition"
        >
          {recipe.components.map((component) => (
            <span key={component}>{component}</span>
          ))}
        </div>
      </header>
      <div className="discern-catalogue-terminal-layout__controls">
        <div
          className="discern-catalogue-terminal-layout__profiles"
          role="group"
          aria-label={`${recipe.title} terminal viewport`}
        >
          {terminalViewportProfiles.map((candidate) => (
            <button
              type="button"
              aria-pressed={profile.id === candidate.id}
              onClick={() => setProfileId(candidate.id)}
              key={candidate.id}
            >
              <span>{candidate.label}</span>
              <small>{candidate.columns} × {candidate.rows}</small>
            </button>
          ))}
        </div>
        <label className="discern-catalogue-terminal-layout__grid-toggle">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(event) => setShowGrid(event.currentTarget.checked)}
          />
          <span>Show cell grid</span>
        </label>
      </div>
      <div
        className="discern-catalogue-terminal-layout__inspector"
        dangerouslySetInnerHTML={{ __html: inspectorHtml }}
      />
      <details className="discern-catalogue-terminal-layout__source">
        <summary>Copy composition source</summary>
        <div>
          <pre><code>{recipe.source}</code></pre>
          <CopyButton
            value={recipe.source}
            label={`Copy ${recipe.title} source`}
            copiedLabel="Source copied"
          />
        </div>
      </details>
    </article>
  );
}
