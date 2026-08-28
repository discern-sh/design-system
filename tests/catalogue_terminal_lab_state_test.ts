import { assertEquals } from "@std/assert";
import {
  parseTerminalLabState,
  terminalLabStateUrl,
  terminalViewportPresets,
  withTerminalCustomGeometry,
  withTerminalViewportPreset,
} from "../catalogue/terminal-lab-state.ts";

const allControls = ["unicode", "colorDepth", "hyperlinks"] as const;

Deno.test("terminal presets and capabilities round-trip through canonical URL state", () => {
  assertEquals(
    terminalViewportPresets.map(({ id, columns, rows }) => ({
      id,
      columns,
      rows,
    })),
    [
      { id: "compact", columns: 40, rows: 24 },
      { id: "standard", columns: 80, rows: 24 },
      { id: "wide", columns: 120, rows: 30 },
      { id: "tall", columns: 80, rows: 40 },
    ],
  );

  const parsed = parseTerminalLabState(
    new URLSearchParams(
      "preset=wide&unicode=0&color=ansi256&hyperlinks=0&grid=1",
    ),
    allControls,
  );
  assertEquals(parsed.notices, []);
  assertEquals(parsed.state, {
    presetId: "wide",
    custom: false,
    columns: 120,
    rows: 30,
    unicode: false,
    colorDepth: "ansi256",
    hyperlinks: false,
    showGrid: true,
  });

  const url = terminalLabStateUrl(
    new URL("https://catalogue.example/catalogue/terminal/future-layout/"),
    parsed.state,
    allControls,
  );
  assertEquals(
    url.href,
    "https://catalogue.example/catalogue/terminal/future-layout/?preset=wide&unicode=0&color=ansi256&hyperlinks=0&grid=1",
  );
  assertEquals(
    parseTerminalLabState(url.searchParams, allControls).state,
    parsed.state,
  );
});

Deno.test("explicit geometry creates Custom state and reset returns to its selected preset", () => {
  const initial = parseTerminalLabState(
    new URLSearchParams("preset=compact&columns=72&rows=31"),
    allControls,
  ).state;
  assertEquals(initial.custom, true);
  assertEquals({ columns: initial.columns, rows: initial.rows }, {
    columns: 72,
    rows: 31,
  });

  const resized = withTerminalCustomGeometry(initial, {
    columns: 96,
    rows: 36,
  });
  assertEquals(resized.custom, true);
  assertEquals({ columns: resized.columns, rows: resized.rows }, {
    columns: 96,
    rows: 36,
  });

  assertEquals(withTerminalViewportPreset(resized, "compact"), {
    ...resized,
    presetId: "compact",
    custom: false,
    columns: 40,
    rows: 24,
  });
});

Deno.test("invalid, extreme, and unsupported URL values fail to bounded defaults with reasons", () => {
  const parsed = parseTerminalLabState(
    new URLSearchParams(
      "preset=enormous&columns=99999&rows=-2&unicode=perhaps&color=millions&hyperlinks=0&grid=yes",
    ),
    ["unicode", "colorDepth"],
  );
  assertEquals(parsed.state, {
    presetId: "standard",
    custom: false,
    columns: 80,
    rows: 24,
    unicode: true,
    colorDepth: "truecolor",
    hyperlinks: true,
    showGrid: false,
  });
  assertEquals(parsed.notices, [
    "Unknown viewport preset; Standard 80×24 was used.",
    "Columns must be a whole number from 20 to 240; 80 was used.",
    "Rows must be a whole number from 8 to 100; 24 was used.",
    "Unicode must be 1 or 0; Unicode was used.",
    "Colour depth must be none, ansi16, ansi256, or truecolor; truecolor was used.",
    "This recipe does not exercise hyperlink support; the URL value was ignored.",
    "Cell grid must be 1 or 0; the grid stayed hidden.",
  ]);
});
