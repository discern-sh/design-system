import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  terminalGlyphAnimates,
  terminalGlyphFrame,
} from "../../src/cli/glyph-motion.ts";
import {
  deriveTerminalMotif,
  DISCERN_TERMINAL_MOTIF,
  terminalMotifRepertoire,
} from "../../src/cli/motif.ts";
import { TERMINAL_GLYPHS } from "../../src/cli/terminal-glyphs.ts";
import { measureText } from "../../src/cli/text.ts";

const unicode = { unicode: true };
const ascii = { unicode: false };

Deno.test("every glyph in the table stays one cell at every phase and moves only in Unicode", () => {
  const spinner = terminalMotifRepertoire(DISCERN_TERMINAL_MOTIF, true).spinner;
  for (const [name, glyph] of Object.entries(TERMINAL_GLYPHS)) {
    const animates = glyph.animation === "spinner";
    assertEquals(terminalGlyphAnimates(glyph, unicode), animates, name);
    assertEquals(terminalGlyphAnimates(glyph, ascii), false, name);
    assertEquals(
      terminalGlyphAnimates(glyph, unicode, { reducedMotion: true }),
      false,
      name,
    );
    const frames = new Set<string>();
    for (let phase = 0; phase < spinner.length * 2; phase += 1) {
      const cell = terminalGlyphFrame(glyph, phase, unicode);
      if (glyph.column !== "key") assertEquals(measureText(cell), 1, name);
      frames.add(cell);
      assertEquals(terminalGlyphFrame(glyph, phase, ascii), glyph.ascii, name);
      assertEquals(
        terminalGlyphFrame(glyph, phase, unicode, { reducedMotion: true }),
        glyph.unicode,
        name,
      );
    }
    assertEquals(frames.size, animates ? spinner.length : 1, name);
  }
});

Deno.test("a moving glyph cycles through the bound motif's spinner from its first frame", () => {
  const running = TERMINAL_GLYPHS.running;
  assertEquals(
    [0, 1, 2, 3, 4].map((phase) => terminalGlyphFrame(running, phase, unicode)),
    ["◐", "◓", "◑", "◒", "◐"],
  );
  const motif = deriveTerminalMotif(DISCERN_TERMINAL_MOTIF, {
    unicode: { spinner: ["▖", "▘", "▝", "▗"] },
  });
  assertEquals(terminalGlyphFrame(running, 2, unicode, { motif }), "▝");
  assertEquals(terminalGlyphFrame(running, 2, ascii, { motif }), "@");
  for (const phase of [-1, 0.5, Number.NaN]) {
    assertThrows(
      () => terminalGlyphFrame(running, phase, unicode),
      TypeError,
      "animation phase",
    );
  }
  assert(!terminalGlyphAnimates(TERMINAL_GLYPHS.done, unicode));
});
