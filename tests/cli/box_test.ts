import { assert, assertEquals, assertThrows } from "@std/assert";
import { stripAnsi, styleText } from "../../src/cli/ansi.ts";
import {
  renderBox,
  type TerminalBoxStyle,
  terminalFrameGlyphs,
} from "../../src/cli/box.ts";
import { graphemeWidth, measureText } from "../../src/cli/text.ts";
import { deriveTerminalTheme } from "../../src/cli/theme.ts";
import {
  assertExactFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

Deno.test("box drawing has exact Unicode and ASCII frames", () => {
  const unicode = testTerminalCapabilities({ columns: 12, unicode: true });
  assertExactFrame(
    renderBox({ body: "Hi", title: "Info", width: 12 }, unicode),
    "┌ Info ────┐\n│ Hi       │\n└──────────┘",
    unicode,
  );
  const ascii = testTerminalCapabilities({ columns: 12, unicode: false });
  assertExactFrame(
    renderBox({ body: "Hi", title: "Info", width: 12 }, ascii),
    "+ Info ----+\n| Hi       |\n+----------+",
    ascii,
  );
});

Deno.test("box bodies wrap to their derived inner width", () => {
  const capabilities = testTerminalCapabilities({ columns: 12 });
  assertExactFrame(
    renderBox({ body: "one two three", width: 12 }, capabilities),
    "┌──────────┐\n│ one two  │\n│ three    │\n└──────────┘",
    capabilities,
  );
});

Deno.test("box bottom labels retain exact border geometry", () => {
  const unicode = testTerminalCapabilities({ columns: 20 });
  assertExactFrame(
    renderBox({ body: "Hi", width: 20, bottomLabel: "↓ 3 more" }, unicode),
    "┌──────────────────┐\n│ Hi               │\n└──── ↓ 3 more ────┘",
    unicode,
  );
  const ascii = testTerminalCapabilities({ columns: 20, unicode: false });
  assertExactFrame(
    renderBox({ body: "Hi", width: 20, bottomLabel: "v 3 more" }, ascii),
    "+------------------+\n| Hi               |\n+---- v 3 more ----+",
    ascii,
  );
});

Deno.test("box bodies preserve meaningful leading indentation while fitting and wrapping", () => {
  const capabilities = testTerminalCapabilities({ columns: 12 });
  assertExactFrame(
    renderBox({
      body: "  Alpha\n  one two three",
      width: 12,
      padding: 0,
    }, capabilities),
    "┌──────────┐\n│  Alpha   │\n│  one two │\n│  three   │\n└──────────┘",
    capabilities,
  );
});

Deno.test("box bodies preserve fitting Token-styled structural lines", () => {
  const capabilities = testTerminalCapabilities({
    colorDepth: "truecolor",
    columns: 12,
  });
  const frame = renderBox({
    body: styleText("Section", { bold: true }, capabilities),
    width: 12,
  }, capabilities);
  assert(frame.includes(String.fromCharCode(27)));
  assertExactFrame(
    stripAnsi(frame),
    "┌──────────┐\n│ Section  │\n└──────────┘",
    capabilities,
  );
});

Deno.test("box bodies preserve Token styling across wrapped lines", () => {
  const capabilities = testTerminalCapabilities({
    colorDepth: "truecolor",
    columns: 12,
  });
  const frame = renderBox({
    body: styleText("one two three", { bold: true }, capabilities),
    width: 12,
  }, capabilities);
  assert(frame.includes(styleText("one two", { bold: true }, capabilities)));
  assert(frame.includes(styleText("three", { bold: true }, capabilities)));
  assertExactFrame(
    stripAnsi(frame),
    "┌──────────┐\n│ one two  │\n│ three    │\n└──────────┘",
    capabilities,
  );
});

Deno.test("rounded boxes share the light geometry and ASCII fallback", () => {
  const unicode = testTerminalCapabilities({ columns: 12 });
  assertExactFrame(
    renderBox(
      { body: "Hi", title: "Info", width: 12, style: "rounded" },
      unicode,
    ),
    "╭ Info ────╮\n│ Hi       │\n╰──────────╯",
    unicode,
  );
  const ascii = testTerminalCapabilities({ columns: 12, unicode: false });
  assertEquals(
    renderBox(
      { body: "Hi", title: "Info", width: 12, style: "rounded" },
      ascii,
    ),
    renderBox({ body: "Hi", title: "Info", width: 12 }, ascii),
  );
});

Deno.test("borderless boxes keep the frame's area as blank cells", () => {
  const capabilities = testTerminalCapabilities({ columns: 12 });
  const drawn = renderBox(
    { body: "Hi", title: "Info", width: 12 },
    capabilities,
  );
  const blank = renderBox(
    { body: "Hi", title: "Info", width: 12, style: "none" },
    capabilities,
  );
  assertExactFrame(
    blank,
    "  Info      \n  Hi        \n            ",
    capabilities,
  );
  const padded = renderBox(
    { body: "Hi", title: "Info", width: 14, padding: 3, style: "none" },
    testTerminalCapabilities({ columns: 14 }),
  );
  assertEquals(
    padded.split("\n").slice(0, 2),
    ["    Info      ", "    Hi        "],
    "a borderless title aligns with the body",
  );
  assertEquals(
    blank.split("\n").map((line) => measureText(line)),
    drawn.split("\n").map((line) => measureText(line)),
  );
});

Deno.test("box titles align to the start, centre, or end of the upper border", () => {
  const capabilities = testTerminalCapabilities({ columns: 14 });
  const top = (titleAlign: "start" | "center" | "end") =>
    renderBox({ body: "x", title: "Hi", width: 14, titleAlign }, capabilities)
      .split("\n")[0];
  assertEquals(top("start"), "┌ Hi ────────┐");
  assertEquals(top("center"), "┌──── Hi ────┐");
  assertEquals(top("end"), "┌──────── Hi ┐");
});

Deno.test("a filled box paints its fill under every cell where fills paint", () => {
  const theme = deriveTerminalTheme("dark", { accent: 255 });
  const fill = { background: theme.surfaces.raised } as const;
  const truecolor = testTerminalCapabilities({
    columns: 10,
    colorDepth: "truecolor",
  });
  const filled = renderBox(
    {
      body: styleText("Go", { bold: true }, truecolor),
      width: 10,
      style: "none",
      fill,
    },
    truecolor,
  );
  const background = "48;2;28;28;28";
  for (const line of filled.split("\n")) {
    assertEquals(measureText(line), 10);
    assert(line.startsWith(`\x1b[${background}m`), JSON.stringify(line));
  }
  assert(filled.includes(`\x1b[1;${background}mGo`));
  const sixteen = testTerminalCapabilities({
    columns: 10,
    colorDepth: "ansi16",
  });
  assertEquals(
    renderBox({ body: "Go", width: 10, style: "rounded", fill }, sixteen),
    renderBox({ body: "Go", width: 10, style: "rounded" }, sixteen),
    "a surface fill yields to the drawn frame at 16 colours",
  );
});

Deno.test("box styles reject unknown treatments", () => {
  assertThrows(
    () =>
      renderBox(
        { body: "x", style: "heavy" as TerminalBoxStyle },
        testTerminalCapabilities(),
      ),
    TypeError,
  );
});

Deno.test("frame glyphs are single-cell and ASCII stays one repertoire", () => {
  for (const style of ["light", "rounded", "none"] as const) {
    for (const unicode of [true, false]) {
      for (const glyph of Object.values(terminalFrameGlyphs(style, unicode))) {
        assertEquals(graphemeWidth(glyph), 1, `${style} ${glyph}`);
        if (!unicode) assert(/^[ +|-]$/u.test(glyph), glyph);
      }
    }
  }
});

async function terminalSources(directory: URL): Promise<URL[]> {
  const files: URL[] = [];
  for await (const entry of Deno.readDir(directory)) {
    if (entry.isDirectory) {
      if (entry.name === "generated") continue;
      files.push(
        ...await terminalSources(new URL(`${entry.name}/`, directory)),
      );
    } else if (entry.isFile && entry.name.endsWith(".ts")) {
      files.push(new URL(entry.name, directory));
    }
  }
  return files;
}

Deno.test("frame corners are declared once, in the box authority", async () => {
  const source = new URL("../../src/", import.meta.url);
  const owner = new URL("cli/box.ts", source).href;
  // Chart line paths reuse the rounded arcs as curve glyphs, not frames.
  const linePaths = new URL("cli/glyph-ramps.ts", source).href;
  const offenders: string[] = [];
  for (const file of await terminalSources(source)) {
    if (file.href === owner || file.href === linePaths) continue;
    const text = await Deno.readTextFile(file);
    if (/["'`][┌┐└┘╭╮╰╯]["'`]/u.test(text)) {
      offenders.push(file.pathname.slice(source.pathname.length));
    }
  }
  assertEquals(offenders, [], "use terminalFrameGlyphs() from cli/box.ts");
});
