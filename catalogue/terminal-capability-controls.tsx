import { useEffect, useId, useState } from "react";
import { Select } from "../src/components/forms/select/select.tsx";
import { SegmentedControl } from "../src/components/forms/segmented-control/segmented-control.tsx";
import {
  parseTerminalLabState,
  type TerminalLabCapability,
  type TerminalLabState,
  terminalLabStateUrl,
  terminalViewportPreset,
  terminalViewportPresets,
  withTerminalCustomGeometry,
  withTerminalViewportPreset,
} from "./terminal-lab-state.ts";

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

/** Shared clean/inspect choice with a native labelled single-selection contract. */
export function TerminalViewControl(
  { state, update }: {
    readonly state: TerminalLabState;
    readonly update: (state: TerminalLabState) => void;
  },
) {
  const id = useId();
  return (
    <SegmentedControl
      label="Terminal view"
      name={`terminal-view-${id}`}
      items={[{ value: "clean", label: "Clean" }, {
        value: "inspect",
        label: "Inspect",
      }]}
      value={state.view}
      onValueChange={(view) =>
        update({ ...state, view: view === "inspect" ? "inspect" : "clean" })}
    />
  );
}

/** One control surface for recipe and Component capability inspection. */
export function TerminalCapabilityControls(
  { state, notices, controls, update }: {
    readonly state: TerminalLabState;
    readonly notices: readonly string[];
    readonly controls: readonly TerminalLabCapability[];
    readonly update: (state: TerminalLabState) => void;
  },
) {
  const activePreset = terminalViewportPreset(state.presetId);
  const hasCapability = (capability: TerminalLabCapability) =>
    controls.includes(capability);
  return (
    <section
      className="discern-catalogue-terminal-lab__controls"
      aria-label="Terminal capability controls"
    >
      <div className="discern-catalogue-terminal-lab__control-heading">
        <div>
          <strong>Capability controls</strong>
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

      <label>
        <span>Viewport preset</span>
        <Select
          value={state.custom ? "custom" : state.presetId}
          onChange={(event) => {
            const preset = terminalViewportPresets.find(({ id }) =>
              id === event.currentTarget.value
            );
            if (preset) update(withTerminalViewportPreset(state, preset.id));
          }}
        >
          {state.custom && <option value="custom">Custom</option>}
          {terminalViewportPresets.map((preset) => (
            <option value={preset.id} key={preset.id}>
              {preset.label} {preset.columns} × {preset.rows}
            </option>
          ))}
        </Select>
      </label>

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
        {state.view === "inspect" && (
          <label>
            <input
              type="checkbox"
              checked={state.showGrid}
              onChange={(event) =>
                update({ ...state, showGrid: event.currentTarget.checked })}
            />
            <span>Show cell grid</span>
          </label>
        )}
        <button
          type="button"
          onClick={() =>
            update(withTerminalViewportPreset(state, state.presetId))}
        >
          Reset to {activePreset.label} preset
        </button>
      </div>
    </section>
  );
}

/** URL normalization and browser state shared by both terminal inspection surfaces. */
export function useTerminalLabState(
  controls: readonly TerminalLabCapability[],
  initialUrl?: URL,
) {
  const href = initialUrl?.href;
  const read = () =>
    parseTerminalLabState(
      new URLSearchParams(
        href === undefined
          ? globalThis.location?.search ?? ""
          : new URL(href).search,
      ),
      controls,
    );
  const [parsed, setParsed] = useState(read);
  useEffect(() => {
    setParsed(read());
    const restore = () =>
      setParsed(
        parseTerminalLabState(
          new URLSearchParams(globalThis.location?.search ?? ""),
          controls,
        ),
      );
    globalThis.addEventListener?.("popstate", restore);
    return () => globalThis.removeEventListener?.("popstate", restore);
  }, [href, controls]);
  const update = (state: TerminalLabState) => {
    setParsed({ state, notices: [] });
    if (globalThis.location !== undefined) {
      const url = terminalLabStateUrl(
        new URL(globalThis.location.href),
        state,
        controls,
      );
      globalThis.history?.replaceState(null, "", url);
    }
  };
  return { ...parsed, update };
}
