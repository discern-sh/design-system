import { useMemo, useState } from "react";
import { CopyButton } from "../src/components/docs/copy-button/copy-button.tsx";
import { Select } from "../src/components/forms/select/select.tsx";
import { OverflowCue } from "../src/components/layout/overflow-cue/overflow-cue.tsx";
import type { TerminalCapabilities } from "../src/cli/capabilities.ts";
import { projectTerminalInspectorHtml } from "../src/cli/projection.ts";
import type { TerminalThemeVariant } from "../src/cli/theme.ts";
import type { CliCompositionRecipe } from "./cli-compositions.ts";
import {
  parseTerminalLabState,
  type TerminalLabState,
  terminalLabStateUrl,
  terminalViewportPreset,
  terminalViewportPresets,
  withTerminalCustomGeometry,
  withTerminalViewportPreset,
} from "./terminal-lab-state.ts";

/** One pure projection from validated lab state into real output and geometry. */
export interface TerminalLayoutProjection {
  readonly capabilities: TerminalCapabilities;
  readonly output: string;
  readonly inspectorHtml: string;
}

/** Feed validated URL state to the recipe renderer and public inspector once. */
export function projectTerminalLayoutRecipe(
  recipe: CliCompositionRecipe,
  state: TerminalLabState,
  theme: TerminalThemeVariant,
): TerminalLayoutProjection {
  const capabilities: TerminalCapabilities = {
    ansiControl: true,
    colorDepth: state.colorDepth,
    columns: state.columns,
    hyperlinks: state.hyperlinks,
    unicode: state.unicode,
  };
  const output = recipe.render(capabilities, theme, state.rows);
  const profile = terminalViewportPreset(state.presetId);
  const title = `${recipe.title} · ${state.custom ? "Custom" : profile.label}`;
  return {
    capabilities,
    output,
    inspectorHtml: projectTerminalInspectorHtml(output, {
      columns: state.columns,
      rows: state.rows,
      title,
      showGrid: state.showGrid,
      theme,
    }),
  };
}

function validCustomGeometry(
  state: TerminalLabState,
  field: "columns" | "rows",
  value: number,
): TerminalLabState | undefined {
  const minimum = field === "columns" ? 20 : 8;
  const maximum = field === "columns" ? 240 : 100;
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    return undefined;
  }
  return withTerminalCustomGeometry(state, { ...state, [field]: value });
}

/** Focused capability lab for one complete CLI recipe. */
export function TerminalLayoutLab(
  { recipe, theme, initialUrl }: {
    readonly recipe: CliCompositionRecipe;
    readonly theme: TerminalThemeVariant;
    readonly initialUrl: URL;
  },
) {
  const initial = useMemo(
    () =>
      parseTerminalLabState(
        initialUrl.searchParams,
        recipe.capabilityControls,
      ),
    [initialUrl, recipe],
  );
  const [state, setState] = useState<TerminalLabState>(initial.state);
  const [notices, setNotices] = useState(initial.notices);
  const projection = useMemo(
    () => projectTerminalLayoutRecipe(recipe, state, theme),
    [recipe, state, theme],
  );
  const shareUrl = useMemo(
    () => terminalLabStateUrl(initialUrl, state, recipe.capabilityControls),
    [initialUrl, recipe, state],
  );

  const update = (next: TerminalLabState): void => {
    setState(next);
    setNotices([]);
    const url = terminalLabStateUrl(
      initialUrl,
      next,
      recipe.capabilityControls,
    );
    globalThis.history?.replaceState(null, "", url);
  };
  const activePreset = terminalViewportPreset(state.presetId);
  const hasCapability = (capability: string): boolean =>
    recipe.capabilityControls.some((candidate) => candidate === capability);

  return (
    <article
      className="discern-catalogue-terminal-lab"
      data-discern-cli-composition={recipe.id}
    >
      <OverflowCue
        axis="both"
        scrollContainer="descendant"
        className="discern-catalogue-terminal-lab__frame"
      >
        <div
          dangerouslySetInnerHTML={{ __html: projection.inspectorHtml }}
        />
      </OverflowCue>

      <section
        className="discern-catalogue-terminal-lab__controls"
        aria-labelledby="terminal-capability-heading"
      >
        <div className="discern-catalogue-terminal-lab__control-heading">
          <div>
            <h2 id="terminal-capability-heading">Capability controls</h2>
            <p>
              These viewport examples are reproducible; they do not limit
              supported terminal sizes.
            </p>
          </div>
          <strong data-discern-terminal-lab-mode>
            {state.custom ? "Custom" : activePreset.label}
          </strong>
        </div>

        {notices.length > 0 && (
          <div
            className="discern-catalogue-terminal-lab__notice"
            role="status"
            aria-live="polite"
          >
            <strong>Some shared settings were adjusted.</strong>
            <ul>
              {notices.map((notice) => <li key={notice}>{notice}</li>)}
            </ul>
          </div>
        )}

        <fieldset className="discern-catalogue-terminal-lab__presets">
          <legend>Viewport preset</legend>
          <div>
            {terminalViewportPresets.map((preset) => (
              <button
                type="button"
                aria-pressed={!state.custom && state.presetId === preset.id}
                onClick={() =>
                  update(withTerminalViewportPreset(state, preset.id))}
                key={preset.id}
              >
                <span>{preset.label}</span>
                <small>{preset.columns} × {preset.rows}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="discern-catalogue-terminal-lab__fields">
          <label>
            <span>Columns</span>
            <input
              type="number"
              min="20"
              max="240"
              step="1"
              value={state.columns}
              onChange={(event) => {
                const next = validCustomGeometry(
                  state,
                  "columns",
                  event.currentTarget.valueAsNumber,
                );
                if (next !== undefined) update(next);
              }}
            />
          </label>
          <label>
            <span>Rows</span>
            <input
              type="number"
              min="8"
              max="100"
              step="1"
              value={state.rows}
              onChange={(event) => {
                const next = validCustomGeometry(
                  state,
                  "rows",
                  event.currentTarget.valueAsNumber,
                );
                if (next !== undefined) update(next);
              }}
            />
          </label>
          {hasCapability("unicode") && (
            <label>
              <span>Character set</span>
              <Select
                value={state.unicode ? "unicode" : "ascii"}
                onChange={(event) =>
                  update({
                    ...state,
                    unicode: event.currentTarget.value === "unicode",
                  })}
              >
                <option value="unicode">Unicode</option>
                <option value="ascii">ASCII</option>
              </Select>
            </label>
          )}
          {hasCapability("colorDepth") && (
            <label>
              <span>Colour depth</span>
              <Select
                value={state.colorDepth}
                onChange={(event) =>
                  update({
                    ...state,
                    colorDepth: event.currentTarget
                      .value as TerminalLabState["colorDepth"],
                  })}
              >
                <option value="truecolor">Truecolour</option>
                <option value="ansi256">ANSI 256</option>
                <option value="ansi16">ANSI 16</option>
                <option value="none">No colour</option>
              </Select>
            </label>
          )}
        </div>

        <div className="discern-catalogue-terminal-lab__options">
          {hasCapability("hyperlinks") && (
            <label>
              <input
                type="checkbox"
                checked={state.hyperlinks}
                onChange={(event) =>
                  update({
                    ...state,
                    hyperlinks: event.currentTarget.checked,
                  })}
              />
              <span>Hyperlink support</span>
            </label>
          )}
          <label>
            <input
              type="checkbox"
              checked={state.showGrid}
              onChange={(event) =>
                update({ ...state, showGrid: event.currentTarget.checked })}
            />
            <span>Show cell grid</span>
          </label>
          <button
            type="button"
            onClick={() =>
              update(withTerminalViewportPreset(state, state.presetId))}
          >
            Reset to {activePreset.label} preset
          </button>
        </div>
      </section>

      <div className="discern-catalogue-terminal-lab__actions">
        <CopyButton
          value={projection.output}
          label="Copy raw terminal output"
          copiedLabel="Raw terminal output copied"
        />
        <CopyButton
          value={shareUrl.href}
          label="Copy reproducible lab URL"
          copiedLabel="Lab URL copied"
        />
      </div>

      <details className="discern-catalogue-terminal-lab__source">
        <summary>Adaptable composition source</summary>
        <div>
          <p>
            Use this as an adaptable example; it is not exported as a Component.
          </p>
          <OverflowCue
            axis="both"
            scrollContainer="descendant"
            className="discern-catalogue-terminal-lab__source-cue"
          >
            <pre
              role="region"
              aria-label="Adaptable terminal layout source"
              tabIndex={0}
              data-discern-overflow-cue-target=""
            ><code>{recipe.source}</code></pre>
          </OverflowCue>
          <CopyButton
            value={recipe.source}
            label="Copy adaptable composition source"
            copiedLabel="Adaptable source copied"
          />
        </div>
      </details>
    </article>
  );
}
