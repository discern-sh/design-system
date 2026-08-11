import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import { renderDiffstatCli, renderTableCli } from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testCapabilities,
} from "./helpers.ts";

Deno.test("Diffstat renders exact narrow, standard, wide, and sign-preserving degraded bars", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderDiffstatCli(
      { added: 14, removed: 5, maxWidth: capabilities.columns },
      capabilities,
    );
  for (
    const [columns, expected] of [
      [10, "+14 −5 ++−"],
      [20, "+14 −5 ++++−"],
      [40, "+14 −5 ++++−"],
    ] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testCapabilities({ colorDepth, columns: 20 });
    assertStyledFrame(render(capabilities), "+14 −5 ++++−", capabilities);
  }
  const ascii = testCapabilities({ columns: 20, unicode: false });
  assertExactFrame(render(ascii), "+14 -5 ++++-", ascii);
});

const TABLE_PROPS = {
  columns: [{ header: "Name" }, { header: "State" }, { header: "Count" }],
  rows: [["Alpha", "Ready", "12"], ["Beta", "Queued", "3"]],
  numeric: true,
  striped: true,
  caption: "Checks",
} as const;

Deno.test("Table renders exact narrow, standard, wide, and box-degraded columns", () => {
  const render = (capabilities: TerminalCapabilities) =>
    renderTableCli(
      { ...TABLE_PROPS, width: capabilities.columns },
      capabilities,
    );
  const narrow =
    "Checks\n┌─────┬────┬────┐\n│ Na… │ S… │ C… │\n├─────┼────┼────┤\n│ Al… │ R… │ 12 │\n│ Be… │ Q… │  3 │\n└─────┴────┴────┘";
  const standard =
    "Checks\n┌────────┬─────────┬─────────┐\n│ Name   │ State   │   Count │\n├────────┼─────────┼─────────┤\n│ Alpha  │ Ready   │      12 │\n│ Beta   │ Queued  │       3 │\n└────────┴─────────┴─────────┘";
  const wide =
    "Checks\n┌─────────────┬──────────────┬─────────────┐\n│ Name        │ State        │       Count │\n├─────────────┼──────────────┼─────────────┤\n│ Alpha       │ Ready        │          12 │\n│ Beta        │ Queued       │           3 │\n└─────────────┴──────────────┴─────────────┘";
  for (
    const [columns, expected] of [[17, narrow], [30, standard], [
      44,
      wide,
    ]] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(render(capabilities), expected, capabilities);
  }
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testCapabilities({ colorDepth, columns: 30 });
    assertStyledFrame(render(capabilities), standard, capabilities);
  }
  const ascii = testCapabilities({ columns: 30, unicode: false });
  assertExactFrame(
    render(ascii),
    "Checks\n+--------+---------+---------+\n| Name   | State   |   Count |\n+--------+---------+---------+\n| Alpha  | Ready   |      12 |\n| Beta   | Queued  |       3 |\n+--------+---------+---------+",
    ascii,
  );
});
