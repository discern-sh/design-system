import type { TerminalColorDepth } from "../src/cli/capabilities.ts";

/** Reproducible terminal viewport fixtures, not supported-terminal limits. */
export const terminalViewportPresets = [
  { id: "compact", label: "Compact", columns: 40, rows: 24 },
  { id: "standard", label: "Standard", columns: 80, rows: 24 },
  { id: "wide", label: "Wide", columns: 120, rows: 30 },
  { id: "tall", label: "Tall", columns: 80, rows: 40 },
] as const;

/** One named viewport fixture. */
export type TerminalViewportPresetId =
  (typeof terminalViewportPresets)[number]["id"];

/** Capability controls a recipe can truthfully exercise in its output. */
export type TerminalLabCapability =
  | "unicode"
  | "colorDepth"
  | "hyperlinks";

/** Complete validated state for one terminal capability lab. */
export interface TerminalLabState {
  readonly presetId: TerminalViewportPresetId;
  readonly custom: boolean;
  readonly columns: number;
  readonly rows: number;
  readonly unicode: boolean;
  readonly colorDepth: TerminalColorDepth;
  readonly hyperlinks: boolean;
  readonly showGrid: boolean;
}

/** Validated URL state plus accessible recovery explanations. */
export interface ParsedTerminalLabState {
  readonly state: TerminalLabState;
  readonly notices: readonly string[];
}

const DEFAULT_PRESET_ID: TerminalViewportPresetId = "standard";
const COLOR_DEPTHS = ["none", "ansi16", "ansi256", "truecolor"] as const;
const LAB_QUERY_KEYS = [
  "preset",
  "columns",
  "rows",
  "unicode",
  "color",
  "hyperlinks",
  "grid",
] as const;

/** Resolve a preset from the one ordered fixture authority. */
export function terminalViewportPreset(id: TerminalViewportPresetId) {
  const preset = terminalViewportPresets.find((candidate) =>
    candidate.id === id
  );
  if (preset === undefined) {
    throw new TypeError(`Unknown terminal viewport preset ${id}`);
  }
  return preset;
}

function supported(
  controls: readonly TerminalLabCapability[],
  capability: TerminalLabCapability,
): boolean {
  return controls.includes(capability);
}

function booleanParameter(
  params: URLSearchParams,
  name: string,
  fallback: boolean,
  invalid: string,
  notices: string[],
): boolean {
  const value = params.get(name);
  if (value === null) return fallback;
  if (value === "1") return true;
  if (value === "0") return false;
  notices.push(invalid);
  return fallback;
}

function geometryParameter(
  params: URLSearchParams,
  name: "columns" | "rows",
  fallback: number,
  minimum: number,
  maximum: number,
  notices: string[],
): { readonly value: number; readonly validOverride: boolean } {
  const source = params.get(name);
  if (source === null) return { value: fallback, validOverride: false };
  const value = Number(source);
  if (
    Number.isSafeInteger(value) && value >= minimum && value <= maximum
  ) {
    return { value, validOverride: true };
  }
  const title = name === "columns" ? "Columns" : "Rows";
  notices.push(
    `${title} must be a whole number from ${minimum} to ${maximum}; ${fallback} was used.`,
  );
  return { value: fallback, validOverride: false };
}

/** Parse, bound, and explain all capability-lab URL state at the boundary. */
export function parseTerminalLabState(
  params: URLSearchParams,
  controls: readonly TerminalLabCapability[],
): ParsedTerminalLabState {
  const notices: string[] = [];
  const requestedPreset = params.get("preset");
  const preset =
    terminalViewportPresets.find(({ id }) => id === requestedPreset) ??
      terminalViewportPreset(DEFAULT_PRESET_ID);
  if (
    requestedPreset !== null &&
    !terminalViewportPresets.some(({ id }) => id === requestedPreset)
  ) {
    notices.push("Unknown viewport preset; Standard 80×24 was used.");
  }
  const columns = geometryParameter(
    params,
    "columns",
    preset.columns,
    20,
    240,
    notices,
  );
  const rows = geometryParameter(
    params,
    "rows",
    preset.rows,
    8,
    100,
    notices,
  );
  const unicode = supported(controls, "unicode")
    ? booleanParameter(
      params,
      "unicode",
      true,
      "Unicode must be 1 or 0; Unicode was used.",
      notices,
    )
    : true;
  const colorSource = params.get("color");
  let colorDepth: TerminalColorDepth = "truecolor";
  if (supported(controls, "colorDepth") && colorSource !== null) {
    if (COLOR_DEPTHS.some((value) => value === colorSource)) {
      colorDepth = colorSource as TerminalColorDepth;
    } else {
      notices.push(
        "Colour depth must be none, ansi16, ansi256, or truecolor; truecolor was used.",
      );
    }
  }
  let hyperlinks = true;
  if (supported(controls, "hyperlinks")) {
    hyperlinks = booleanParameter(
      params,
      "hyperlinks",
      true,
      "Hyperlink support must be 1 or 0; support stayed enabled.",
      notices,
    );
  } else if (params.has("hyperlinks")) {
    notices.push(
      "This recipe does not exercise hyperlink support; the URL value was ignored.",
    );
  }
  const showGrid = booleanParameter(
    params,
    "grid",
    false,
    "Cell grid must be 1 or 0; the grid stayed hidden.",
    notices,
  );
  return {
    state: {
      presetId: preset.id,
      custom: columns.validOverride || rows.validOverride,
      columns: columns.value,
      rows: rows.value,
      unicode,
      colorDepth,
      hyperlinks,
      showGrid,
    },
    notices,
  };
}

/** Apply explicit geometry and visibly enter Custom state. */
export function withTerminalCustomGeometry(
  state: TerminalLabState,
  geometry: { readonly columns: number; readonly rows: number },
): TerminalLabState {
  return {
    ...state,
    custom: true,
    columns: geometry.columns,
    rows: geometry.rows,
  };
}

/** Apply one named fixture and leave Custom state. */
export function withTerminalViewportPreset(
  state: TerminalLabState,
  id: TerminalViewportPresetId,
): TerminalLabState {
  const preset = terminalViewportPreset(id);
  return {
    ...state,
    presetId: preset.id,
    custom: false,
    columns: preset.columns,
    rows: preset.rows,
  };
}

/** Encode the complete applicable lab state without disturbing appearance. */
export function terminalLabStateUrl(
  current: URL,
  state: TerminalLabState,
  controls: readonly TerminalLabCapability[],
): URL {
  const url = new URL(current.href);
  for (const key of LAB_QUERY_KEYS) url.searchParams.delete(key);
  url.searchParams.set("preset", state.presetId);
  if (state.custom) {
    url.searchParams.set("columns", String(state.columns));
    url.searchParams.set("rows", String(state.rows));
  }
  if (supported(controls, "unicode")) {
    url.searchParams.set("unicode", state.unicode ? "1" : "0");
  }
  if (supported(controls, "colorDepth")) {
    url.searchParams.set("color", state.colorDepth);
  }
  if (supported(controls, "hyperlinks")) {
    url.searchParams.set("hyperlinks", state.hyperlinks ? "1" : "0");
  }
  url.searchParams.set("grid", state.showGrid ? "1" : "0");
  return url;
}
