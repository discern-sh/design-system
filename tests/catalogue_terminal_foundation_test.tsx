import { assertEquals, assertMatch, assertStringIncludes } from "@std/assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { catalogueCliCapabilities } from "../catalogue/cli-preview.tsx";
import { TerminalFoundationPreview } from "../catalogue/terminal-foundation-preview.tsx";
import { stripAnsi } from "../src/cli/ansi.ts";
import { browseTopChoices } from "../scripts/playground/browse.ts";
import {
  renderTerminalFoundationSheet,
  terminalFoundationDestinations,
  type TerminalFoundationSheet,
  terminalFoundationSheets,
} from "../catalogue/terminal-foundations.ts";

Deno.test("terminal foundation inventory enrols every sheet and specimen", () => {
  assertEquals(
    terminalFoundationSheets.map(({ id }) => id),
    ["motifs", "narration"],
  );

  const sheetIds = new Set<string>();
  const specimenIds = new Set<string>();
  for (const sheet of terminalFoundationSheets) {
    assertMatch(sheet.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assertEquals(sheetIds.has(sheet.id), false, `duplicate sheet ${sheet.id}`);
    sheetIds.add(sheet.id);
    assertEquals(
      sheet.title.trim().length > 0,
      true,
      `${sheet.id} has no title`,
    );
    assertEquals(
      sheet.description.trim().length > 0,
      true,
      `${sheet.id} has no description`,
    );
    assertEquals(
      sheet.keywords.trim().length > 0,
      true,
      `${sheet.id} has no search keywords`,
    );
    const specimens = sheet.specimens(catalogueCliCapabilities, {
      theme: "dark",
    });
    assertEquals(specimens.length > 0, true, `${sheet.id} has no specimens`);
    for (const specimen of specimens) {
      assertMatch(specimen.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      const identity = `${sheet.id}:${specimen.id}`;
      assertEquals(
        specimenIds.has(identity),
        false,
        `duplicate specimen ${identity}`,
      );
      specimenIds.add(identity);
      assertEquals(specimen.output.length > 0, true, `${identity} is empty`);
      if (specimen.animation !== undefined) {
        assertEquals(
          specimen.animation.frames.length > 1,
          true,
          `${identity} animation needs multiple frames`,
        );
        assertEquals(
          Number.isSafeInteger(specimen.animation.intervalMs) &&
            specimen.animation.intervalMs > 0,
          true,
          `${identity} animation needs a positive interval`,
        );
      }
    }
  }

  const motifs = terminalFoundationSheets.find(({ id }) => id === "motifs");
  if (motifs === undefined) throw new TypeError("missing motif foundation");
  const specimens = motifs.specimens(catalogueCliCapabilities);
  const spinner = specimens.find(({ id }) => id === "spinner-phases");
  const consumer = specimens.find(({ id }) =>
    id === "derived-consumer-override"
  );
  assertEquals(
    spinner?.animation?.frames.map(stripAnsi),
    ["▴", "◂", "▾", "▸"],
  );
  assertEquals(
    consumer?.animation?.frames.map(stripAnsi),
    ["◴", "◷", "◶", "◵"],
  );
});

Deno.test("a fresh terminal foundation sheet auto-enrols in search and browser rendering", () => {
  const futureSheet = {
    id: "future-surface",
    title: "Future surface",
    description: "An unrelated future foundation review surface.",
    keywords: "unrelated kinetic proof",
    specimens: () => [{
      id: "kinetic-proof",
      title: "Kinetic proof",
      output: "future frame",
      animation: {
        label: "Future activity",
        frames: ["first", "second"],
        intervalMs: 120,
      },
    }],
  } satisfies TerminalFoundationSheet;

  assertEquals(terminalFoundationDestinations([futureSheet]), [{
    href: "#terminal-foundation-future-surface",
    title: "Future surface",
    context: "Terminal foundation",
    keywords:
      "Future surface An unrelated future foundation review surface. unrelated kinetic proof",
  }]);
  assertEquals(
    browseTopChoices([futureSheet]).some(({ id }) =>
      id === "foundation-future-surface"
    ),
    true,
  );
  assertStringIncludes(
    renderTerminalFoundationSheet(futureSheet, catalogueCliCapabilities),
    "## Future surface\n\n### Kinetic proof\n\nfuture frame",
  );

  const html = renderToStaticMarkup(
    createElement(TerminalFoundationPreview, {
      sheet: futureSheet,
      theme: "dark",
    }),
  );
  assertStringIncludes(
    html,
    'data-discern-terminal-foundation="future-surface"',
  );
  assertStringIncludes(
    html,
    'data-discern-terminal-foundation-specimen="kinetic-proof"',
  );
  assertStringIncludes(html, "Future surface");
  assertStringIncludes(html, "future frame");
  assertStringIncludes(html, "Future activity");
});
