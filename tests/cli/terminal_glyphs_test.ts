import { assert, assertEquals } from "@std/assert";
import {
  TERMINAL_GLYPHS,
  type TerminalGlyph,
  terminalGlyph,
  terminalGlyphIdentityGroup,
  type TerminalGlyphName,
} from "../../src/cli/terminal-glyphs.ts";
import { graphemeWidth, measureText } from "../../src/cli/text.ts";
import { type GlyphName, resolveGlyph } from "../../src/glyphs/mod.ts";

const entries = Object.entries(TERMINAL_GLYPHS) as readonly [
  TerminalGlyphName,
  TerminalGlyph,
][];

Deno.test("every terminal glyph is one cell under the narrow-A policy", () => {
  for (const [name, glyph] of entries) {
    assertEquals(graphemeWidth(glyph.unicode), 1, name);
    assertEquals(measureText(glyph.unicode), 1, name);
  }
});

Deno.test("every ASCII fallback is printable and aligned columns keep one cell", () => {
  for (const [name, glyph] of entries) {
    assert(/^[\x21-\x7e][\x20-\x7e]*$/u.test(glyph.ascii), name);
    if (glyph.column !== "chrome" && glyph.column !== "key") {
      assertEquals(glyph.ascii.length, 1, name);
    }
  }
});

Deno.test("glyphs a reader must tell apart stay unique in both repertoires", () => {
  const seen = new Map<string, TerminalGlyphName>();
  for (const [name, glyph] of entries) {
    const group = terminalGlyphIdentityGroup(glyph.column);
    if (group === undefined) continue;
    for (const form of [`u:${glyph.unicode}`, `a:${glyph.ascii}`]) {
      const key = `${group}/${form}`;
      const previous = seen.get(key);
      assertEquals(
        previous,
        undefined,
        `${name} repeats ${previous}'s ${form} in the ${group} column`,
      );
      seen.set(key, name);
    }
  }
  assertEquals(terminalGlyphIdentityGroup("fold"), "state");
  assertEquals(terminalGlyphIdentityGroup("chrome"), undefined);
});

Deno.test("the table carries every glyph an interactive surface draws", () => {
  assertEquals(Object.keys(TERMINAL_GLYPHS).toSorted(), [
    "active",
    "attention",
    "changes",
    "crumb",
    "cursor",
    "done",
    "down",
    "ellipsis",
    "enter",
    "failed",
    "focusEnd",
    "focusStart",
    "folded",
    "idle",
    "keeps",
    "left",
    "meterFill",
    "meterTrack",
    "overlap",
    "paused",
    "pending",
    "queued",
    "removes",
    "restorable",
    "right",
    "running",
    "selection",
    "separator",
    "shift",
    "times",
    "unavailable",
    "unfolded",
    "up",
  ]);
  assertEquals(TERMINAL_GLYPHS.running.animation, "spinner");
  assertEquals(terminalGlyph("done", { unicode: true }), "✓");
  assertEquals(terminalGlyph("done", { unicode: false }), "v");
});

Deno.test("status glyphs agree with the curated status vocabulary", () => {
  const curated: readonly (readonly [TerminalGlyphName, GlyphName])[] = [
    ["done", "status-complete"],
    ["failed", "status-error"],
  ];
  for (const [terminal, name] of curated) {
    const ascii = resolveGlyph(name, "ascii");
    const unicode = resolveGlyph(name, "unicode");
    assert(ascii.available && unicode.available, name);
    assertEquals(unicode.text, TERMINAL_GLYPHS[terminal].unicode, name);
    assertEquals(ascii.text, TERMINAL_GLYPHS[terminal].ascii, name);
  }
});

async function sources(directory: URL): Promise<URL[]> {
  const files: URL[] = [];
  for await (const entry of Deno.readDir(directory)) {
    if (entry.isDirectory) {
      if (entry.name === "generated" || entry.name === "glyphs") continue;
      files.push(...await sources(new URL(`${entry.name}/`, directory)));
    } else if (entry.isFile && entry.name.endsWith(".ts")) {
      files.push(new URL(entry.name, directory));
    }
  }
  return files;
}

Deno.test("status marks come from the glyph table rather than local fallbacks", async () => {
  const source = new URL("../../src/", import.meta.url);
  const owners = new Map<string, string>([
    ["cli/terminal-glyphs.ts", "the table itself"],
    [
      "components/forms/checkbox/checkbox.cli.ts",
      "a checked box, whose ASCII form is the [x] control convention",
    ],
    [
      "components/forms/switch/switch.cli.ts",
      "a toggle's on and off state, not a status",
    ],
    [
      "components/core/icon/icon.cli.ts",
      "the Icon vocabulary's own named check",
    ],
    [
      "components/display/terminal/terminal.cli.ts",
      "sample transcript text inside an example",
    ],
  ]);
  const offenders: string[] = [];
  for (const file of await sources(source)) {
    const path = file.pathname.slice(source.pathname.length);
    if (owners.has(path)) continue;
    if (/[✓✕]/u.test(await Deno.readTextFile(file))) offenders.push(path);
  }
  assertEquals(offenders, [], "resolve status marks with terminalGlyph()");
});
