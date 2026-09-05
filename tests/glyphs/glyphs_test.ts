import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  getGlyph,
  type GlyphName,
  type GlyphRepertoire,
  glyphs,
  isGlyphName,
  resolveGlyph,
} from "../../src/glyphs/mod.ts";
import {
  defineDiscernGlyphAlias,
  glyphAtlasData,
} from "../../src/glyphs/atlas.ts";
import { generateGlyphs, projectGlyphs } from "../../scripts/glyphs.ts";
import { measureText } from "../../src/cli/text.ts";

Deno.test("every approved glyph reaches the immutable public vocabulary and both repertoires", () => {
  assertEquals(glyphs, projectGlyphs(glyphAtlasData));
  assert(Object.isFrozen(glyphs));
  for (const glyph of glyphs) {
    assert(isGlyphName(glyph.name));
    assertEquals(getGlyph(glyph.name), glyph);
    assert(Object.isFrozen(glyph));
    const unicode = resolveGlyph(glyph.name);
    assert(unicode.available, glyph.name);
    assertEquals(unicode.text, glyph.unicode);
    assertEquals(unicode.columns, measureText(unicode.text));
    assertEquals(unicode.fidelity, "exact");
    const ascii = resolveGlyph(glyph.name, "ascii");
    if (glyph.ascii === undefined) {
      assertEquals(ascii, { available: false, reason: "ascii-unavailable" });
    } else {
      assert(Object.isFrozen(glyph.ascii));
      assert(ascii.available, glyph.name);
      assert(/^[\x20-\x7e]+$/.test(ascii.text), glyph.name);
      assertEquals(ascii.text, glyph.ascii.text);
      assertEquals(ascii.columns, measureText(ascii.text));
    }
    assert(Object.isFrozen(unicode));
    assert(Object.isFrozen(ascii));
  }
  for (
    const alias of glyphAtlasData.aliases.filter(({ publication }) =>
      publication === "deferred"
    )
  ) {
    assert(!isGlyphName(alias.name), alias.name);
  }
});

Deno.test("glyph resolution keeps contextual meaning, width, and unavailability explicit", () => {
  assertEquals(
    getGlyph("selection-selected").unicode,
    getGlyph("status-complete").unicode,
  );
  assertEquals(resolveGlyph("selection-selected", "ascii"), {
    available: true,
    text: "x",
    columns: 1,
    fidelity: "semantic",
    repertoire: "ascii",
  });
  assertEquals(resolveGlyph("status-complete", "ascii"), {
    available: true,
    text: "+",
    columns: 1,
    fidelity: "semantic",
    repertoire: "ascii",
  });
  assertEquals(getGlyph("copy").columns, 1);
  assertEquals(resolveGlyph("copy", "ascii"), {
    available: true,
    text: "copy",
    columns: 4,
    fidelity: "semantic",
    repertoire: "ascii",
  });
  assertEquals(getGlyph("warning").unicode, "\u26a0\ufe0e");
  assertEquals(resolveGlyph("brand-mark", "ascii"), {
    available: false,
    reason: "ascii-unavailable",
  });
  for (
    const unknown of [
      "",
      "CHECK",
      "__proto__",
      "constructor",
      " status-complete ",
      "shape-star",
    ]
  ) {
    assert(!isGlyphName(unknown));
    assertThrows(
      () => getGlyph(unknown as GlyphName),
      TypeError,
      "Unknown glyph",
    );
  }
  assertThrows(
    () => resolveGlyph("copy", "auto" as GlyphRepertoire),
    TypeError,
    "Unknown glyph repertoire",
  );
});

Deno.test("a future approved alias joins generated names, data, and resolver inputs without another list", () => {
  const base = glyphAtlasData.aliases[0];
  assert(base !== undefined);
  const future = defineDiscernGlyphAlias({ ...base, name: "future-glyph" });
  const data = {
    ...glyphAtlasData,
    aliases: [...glyphAtlasData.aliases, future],
  };
  assertEquals(projectGlyphs(data).at(-1)?.name, "future-glyph");
  assertStringIncludes(generateGlyphs(data), '"name": "future-glyph"');
  const deferred = {
    ...data,
    aliases: data.aliases.map((alias) =>
      alias.name === "future-glyph"
        ? defineDiscernGlyphAlias({ ...alias, publication: "deferred" })
        : alias
    ),
  };
  assert(!generateGlyphs(deferred).includes('"future-glyph"'));
});

Deno.test("the glyph entrypoint has no React, Atlas, measurement, I/O, or unrelated entry graph", async () => {
  const config = new URL("../../deno.json", import.meta.url).pathname;
  const entry = new URL("../../src/glyphs/mod.ts", import.meta.url).pathname;
  const command = await new Deno.Command(Deno.execPath(), {
    args: ["info", "--json", "--config", config, entry],
    stdout: "piped",
    stderr: "piped",
  }).output();
  assertEquals(command.code, 0, new TextDecoder().decode(command.stderr));
  const graph = JSON.parse(new TextDecoder().decode(command.stdout)) as {
    modules: { specifier: string }[];
  };
  const allowed = [
    "/src/glyphs/mod.ts",
    "/src/glyphs/types.ts",
    "/src/generated/glyphs.ts",
  ];
  assertEquals(graph.modules.length, allowed.length);
  for (const module of graph.modules) {
    assert(
      allowed.some((suffix) => module.specifier.endsWith(suffix)),
      module.specifier,
    );
  }
  const imported = await new Deno.Command(Deno.execPath(), {
    args: ["run", "--no-prompt", "--config", config, entry],
    stdout: "piped",
    stderr: "piped",
  }).output();
  assertEquals(imported.code, 0, new TextDecoder().decode(imported.stderr));
});
