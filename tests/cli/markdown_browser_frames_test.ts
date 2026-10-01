import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { measureText } from "../../src/cli/text.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import {
  inspectTerminalLayout,
  projectTerminalSpans,
} from "../../src/cli/projection.ts";
import {
  type MarkdownBrowserCataloguePosture,
  markdownBrowserCataloguePreview,
} from "../../catalogue/markdown-browser-example.ts";
import { defaultCatalogueTerminalPresentation } from "../../catalogue/terminal-theme.ts";

const PROFILES = [
  { columns: 40, rows: 24 },
  { columns: 80, rows: 24 },
  { columns: 120, rows: 30 },
  { columns: 80, rows: 40 },
] as const;

const POSTURES: readonly MarkdownBrowserCataloguePosture[] = [
  "contents",
  "document",
  "keyboard-link",
  "search",
  "linked-document",
  "internal-destination",
];

function preview(
  columns: number,
  rows: number,
  posture: MarkdownBrowserCataloguePosture,
  overrides: Parameters<typeof testTerminalCapabilities>[0] = {},
) {
  return markdownBrowserCataloguePreview(
    testTerminalCapabilities({
      columns,
      colorDepth: "truecolor",
      hyperlinks: true,
      ...overrides,
    }),
    rows,
    defaultCatalogueTerminalPresentation,
    posture,
  );
}

Deno.test("every browser screen fills its viewport exactly at every review profile", () => {
  for (const profile of PROFILES) {
    for (const posture of POSTURES) {
      const frame = preview(profile.columns, profile.rows, posture).frame;
      const name = `${posture} at ${profile.columns}x${profile.rows}`;
      assertEquals(
        preview(profile.columns, profile.rows, posture).frame,
        frame,
        `${name} renders deterministically`,
      );
      const lines = frame.split("\n");
      assertEquals(lines.length, profile.rows, name);
      assert(
        lines.every((line) => measureText(line) === profile.columns),
        `${name} occupies exact cell rows`,
      );
      assertEquals(
        inspectTerminalLayout(frame, profile).overflowRows,
        [],
        name,
      );
      for (const line of lines) projectTerminalSpans(line);
    }
  }
});

Deno.test("the reader keeps Markdown treatment, live links, and a readable centred measure", () => {
  const reader = preview(120, 30, "document");
  const plain = reader.text;
  assertStringIncludes(plain, "deliberately long guide heading");
  assertStringIncludes(plain, "Keep the selected document");
  assertStringIncludes(plain, "const state = createState(entries);");
  const lines = plain.split("\n").slice(2, -1).filter((line) =>
    line.trim() !== "" && !line.includes("more")
  );
  for (const line of lines) {
    const start = line.length - line.trimStart().length;
    assert(start >= 2 + 22, `prose starts at the centred measure: ${line}`);
    assert(measureText(line.trimEnd()) <= 2 + 22 + 72, line);
  }
  const linked = preview(120, 30, "keyboard-link");
  assert(
    linked.frame.includes("\u001b]8;;#navigation-details"),
    "the Markdown authority keeps OSC 8 links",
  );
  assertStringIncludes(linked.text, "›Read the reference‹");
  assertStringIncludes(linked.text.split("\n").at(-1) ?? "", "Esc Done");
});

Deno.test("the header names where the reader is and the footer what keys do there", () => {
  const contents = preview(80, 24, "contents").text.split("\n");
  assertEquals(contents[0]?.trim(), "Documentation library");
  assertStringIncludes(contents.at(-1) ?? "", "↵ Open");
  assertStringIncludes(contents.at(-1) ?? "", "q Close");
  const reading = preview(80, 24, "document").text.split("\n");
  assertStringIncludes(
    reading[0] ?? "",
    "Documentation library  ›  Keyboard Markdown browser",
  );
  assertStringIncludes(reading.at(-1) ?? "", "Tab Links");
  assertStringIncludes(reading.at(-1) ?? "", "Esc Back");
});

Deno.test("without colour or Unicode the browser stays navigable in plain ASCII", () => {
  const plain = {
    colorDepth: "none",
    hyperlinks: false,
    unicode: false,
  } as const;
  const contents = preview(40, 24, "contents", plain);
  assert(!contents.frame.includes("\u001b"));
  assertStringIncludes(contents.text, "> o Keyboard Markdown");
  const linked = preview(40, 24, "keyboard-link", plain);
  assert(!linked.frame.includes("\u001b"));
  assertStringIncludes(linked.text, ">Read the reference");
  assertStringIncludes(
    linked.text,
    "(#navigation-details)<",
    "the destination is spelled out",
  );
  assertStringIncludes(linked.text.split("\n").at(-1) ?? "", "Esc Done");
});
