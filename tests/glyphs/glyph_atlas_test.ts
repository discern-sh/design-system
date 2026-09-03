import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertStringIncludes,
} from "@std/assert";
import { measureText } from "../../src/cli/text.ts";
import {
  defineCanonicalGlyph,
  defineDiscernGlyphAlias,
  defineUnicodeScalarFacts,
  DISCERN_GLYPH_ACCESSIBILITY_POSTURE,
  type DiscernGlyphAlias,
  expectedCanonicalGlyphSearchTerms,
  glyphAtlasData,
  glyphSequenceId,
} from "../../src/glyphs/atlas.ts";
import {
  GlyphAtlasValidationError,
  type GlyphAtlasValidationInput,
  validateGlyphAtlas,
} from "../../src/glyphs/validation.ts";

function captureValidationError(
  data: GlyphAtlasValidationInput,
): GlyphAtlasValidationError {
  try {
    validateGlyphAtlas(data);
  } catch (error) {
    assertInstanceOf(error, GlyphAtlasValidationError);
    return error;
  }
  throw new Error("expected Glyph Atlas validation to fail");
}

Deno.test("the starter Atlas and curated collection satisfy their bounded foundation", () => {
  validateGlyphAtlas(glyphAtlasData);
  assert(
    glyphAtlasData.canonical.length >= 40 &&
      glyphAtlasData.canonical.length <= 60,
  );
  assert(
    glyphAtlasData.aliases.length >= 15 &&
      glyphAtlasData.aliases.length <= 25,
  );

  assert(
    glyphAtlasData.canonical.some((record) =>
      record.kind === "scalar" &&
      record.presentation.defaultPresentation === "text"
    ),
    "the Atlas exercises default text presentation",
  );
  assert(
    glyphAtlasData.canonical.some((record) =>
      record.kind === "variation-sequence" &&
      record.presentation.selectedVariation === "text"
    ),
    "the Atlas exercises explicit text variation",
  );
  assert(
    glyphAtlasData.canonical.some((record) =>
      record.presentation.effectivePresentation === "emoji"
    ),
    "the Atlas exercises emoji presentation",
  );
  assert(
    glyphAtlasData.canonical.some((record) => record.kind === "emoji-sequence"),
    "the Atlas exercises a standardized non-ZWJ emoji sequence",
  );
  assert(
    glyphAtlasData.canonical.some((record) =>
      record.kind === "emoji-zwj-sequence"
    ),
    "the Atlas exercises a standardized ZWJ sequence",
  );
  assert(
    glyphAtlasData.canonical.some((record) =>
      record.codePoints.length > 1 && record.graphemeCount === 1
    ),
    "the Atlas exercises multi-code-point single graphemes",
  );
  assert(
    glyphAtlasData.canonical.some((record) =>
      record.scalars.some((scalar) => scalar.eastAsianWidth === "A")
    ),
    "the Atlas exposes East Asian Width–Ambiguous facts",
  );
  assert(
    glyphAtlasData.canonical.some((record) => record.terminalWidth === 2),
    "the Atlas exposes package-measured two-cell glyphs",
  );
  assert(
    glyphAtlasData.aliases.some((alias) =>
      alias.recommendation.state === "reference-only"
    ),
    "the curated collection carries a reference-only candidate",
  );
  assert(
    glyphAtlasData.aliases.some((alias) =>
      alias.recommendation.state === "brand-reserved"
    ),
    "the curated collection carries a brand-reserved candidate",
  );
  assertStringIncludes(
    DISCERN_GLYPH_ACCESSIBILITY_POSTURE,
    "not an accessible name",
  );
});

Deno.test("mechanical identity, width, and ASCII measurements derive from their authorities", () => {
  const canonicalById = new Map(
    glyphAtlasData.canonical.map((record) => [record.id, record]),
  );
  for (const record of glyphAtlasData.canonical) {
    assertEquals(record.text, String.fromCodePoint(...record.codePoints));
    assertEquals(record.id, glyphSequenceId(...record.codePoints));
    assertEquals(
      record.searchTerms,
      expectedCanonicalGlyphSearchTerms(record),
    );
    assert(record.searchTerms.length > 0);
    assert(Object.isFrozen(record));
    assert(Object.isFrozen(record.codePoints));
    assert(Object.isFrozen(record.searchTerms));
    assert(Object.isFrozen(record.scalars));
    assert(Object.isFrozen(record.provenance.sources));
  }

  let unequalFallbackWidth = false;
  for (const alias of glyphAtlasData.aliases) {
    assert(Object.isFrozen(alias));
    const canonical = canonicalById.get(alias.canonicalId);
    assert(canonical !== undefined, alias.name);
    const terminal = alias.surfaces.terminal;
    if (terminal.posture !== "supported") continue;
    const fallbackWidth = measureText(terminal.asciiFallback.text);
    assert(fallbackWidth > 0, alias.name);
    if (fallbackWidth !== canonical.terminalWidth) {
      unequalFallbackWidth = true;
    }
  }
  assert(
    unequalFallbackWidth,
    "contextual fallbacks may deliberately differ from Unicode width",
  );
});

Deno.test("malformed canonical facts name the offending glyph and field", () => {
  const original = glyphAtlasData.canonical[0];
  assert(original !== undefined);
  const malformedText = {
    ...original,
    text: "?",
    searchTerms: ["not the derived terms"],
  };
  const error = captureValidationError({
    canonical: [malformedText, ...glyphAtlasData.canonical.slice(1)],
    aliases: glyphAtlasData.aliases,
  });
  assertStringIncludes(error.message, `canonical ${original.id}.text`);
  assertStringIncludes(error.message, "round-trip exactly");
  assertStringIncludes(error.message, `canonical ${original.id}.searchTerms`);

  const ambiguous = glyphAtlasData.canonical.find((record) =>
    record.scalars[0]?.eastAsianWidth === "A"
  );
  assert(ambiguous !== undefined);
  const firstScalar = ambiguous.scalars[0];
  assert(firstScalar !== undefined);
  const malformedWidthFact = {
    ...ambiguous,
    scalars: [{ ...firstScalar, eastAsianWidth: "W" as const }],
    provenance: {
      ...ambiguous.provenance,
      unicodeVersion: "16.0.0" as "17.0.0",
    },
  };
  const factsError = captureValidationError({
    canonical: glyphAtlasData.canonical.map((record) =>
      record === ambiguous ? malformedWidthFact : record
    ),
    aliases: glyphAtlasData.aliases,
  });
  assertStringIncludes(
    factsError.message,
    `canonical ${ambiguous.id}.scalars[0].eastAsianWidth`,
  );
  assertStringIncludes(
    factsError.message,
    `canonical ${ambiguous.id}.provenance.unicodeVersion`,
  );
});

Deno.test("malformed curated judgement rejects stale vocabulary and unsafe degradation", () => {
  const original = glyphAtlasData.aliases[0];
  assert(original !== undefined);
  const malformed = {
    ...original,
    name: "future-alias",
    canonicalId: "U+FFFF",
    discoveryTitle: "Broken\nTitle",
    searchTerms: [" Not normalized ", "not normalized"],
    category: "stale-category",
    recommendation: {
      state: "stale-state",
      rationale: "",
    },
    surfaces: {
      ...original.surfaces,
      terminal: {
        posture: "supported",
        geometry: "one-cell",
        guidance: "Broken fixture guidance.",
        asciiFallback: {
          text: "\n",
          fidelity: "stale-fidelity",
          guidance: "Broken fixture fallback.",
        },
      },
    },
  } as unknown as DiscernGlyphAlias;
  const error = captureValidationError({
    canonical: glyphAtlasData.canonical,
    aliases: [...glyphAtlasData.aliases, malformed],
  });
  for (
    const field of [
      "canonicalId",
      "discoveryTitle",
      "searchTerms[0]",
      "category",
      "recommendation.state",
      "recommendation.rationale",
      "surfaces.terminal.asciiFallback.text",
      "surfaces.terminal.asciiFallback.fidelity",
    ]
  ) {
    assertStringIncludes(error.message, `alias future-alias.${field}`);
  }

  const incoherentReference = {
    ...original,
    name: "incoherent-reference",
    recommendation: {
      state: "reference-only",
      rationale: "Synthetic fixture whose surface postures overstate support.",
    },
  } as DiscernGlyphAlias;
  const referenceError = captureValidationError({
    canonical: glyphAtlasData.canonical,
    aliases: [...glyphAtlasData.aliases, incoherentReference],
  });
  assertStringIncludes(
    referenceError.message,
    "alias incoherent-reference.surfaces.browser.posture",
  );
  assertStringIncludes(
    referenceError.message,
    "alias incoherent-reference.surfaces.terminal.posture",
  );

  const misplacedBrand = {
    ...original,
    name: "misplaced-brand",
    recommendation: {
      state: "brand-reserved",
      rationale: "Synthetic fixture without brand ownership.",
    },
  } as DiscernGlyphAlias;
  const brandError = captureValidationError({
    canonical: glyphAtlasData.canonical,
    aliases: [...glyphAtlasData.aliases, misplacedBrand],
  });
  assertStringIncludes(
    brandError.message,
    "alias misplaced-brand.category",
  );
  assertStringIncludes(
    brandError.message,
    "alias misplaced-brand.canonicalId",
  );
});

Deno.test("future canonical and curated members enroll without another test case", () => {
  const futureCanonical = defineCanonicalGlyph({
    kind: "scalar",
    scalar: defineUnicodeScalarFacts({
      codePoint: 0x25EF,
      name: "LARGE CIRCLE",
      nameAliases: [],
      generalCategory: "So",
      block: "Geometric Shapes",
      age: "1.1",
      eastAsianWidth: "A",
      emojiProperties: [],
      standardizedVariations: [],
    }),
    atlas: {
      rationale: "Synthetic future member proving authority-driven validation.",
      hazards: [],
    },
  });
  const futureAlias = defineDiscernGlyphAlias({
    name: "future-circle",
    discoveryTitle: "Future circle",
    canonicalId: futureCanonical.id,
    searchTerms: ["circle", "future fixture"],
    category: "shape",
    recommendation: {
      state: "recommended",
      rationale:
        "Synthetic future alias proving complete collection enrollment.",
    },
    recommendedUses: ["Future enrollment fixture"],
    discouragedUses: ["Production data"],
    surfaces: {
      browser: {
        posture: "supported",
        guidance: "Synthetic browser guidance for the future-member proof.",
      },
      terminal: {
        posture: "supported",
        geometry: "one-cell",
        guidance: "Synthetic terminal guidance for the future-member proof.",
        asciiFallback: {
          text: "O",
          fidelity: "approximation",
          guidance: "The capital letter preserves a circular outline.",
        },
      },
    },
  });
  const enrolled: GlyphAtlasValidationInput = {
    canonical: [...glyphAtlasData.canonical, futureCanonical],
    aliases: [...glyphAtlasData.aliases, futureAlias],
  };
  validateGlyphAtlas(enrolled);

  const malformedCanonical = { ...futureCanonical, terminalWidth: 99 };
  const canonicalError = captureValidationError({
    ...enrolled,
    canonical: [...glyphAtlasData.canonical, malformedCanonical],
  });
  assertStringIncludes(
    canonicalError.message,
    `canonical ${futureCanonical.id}.terminalWidth`,
  );

  const malformedAlias = {
    ...futureAlias,
    surfaces: {
      ...futureAlias.surfaces,
      terminal: {
        ...futureAlias.surfaces.terminal,
        asciiFallback: {
          text: "\u0007",
          fidelity: "approximation",
          guidance: "Synthetic invalid fallback.",
        },
      },
    },
  } as DiscernGlyphAlias;
  const aliasError = captureValidationError({
    ...enrolled,
    aliases: [...glyphAtlasData.aliases, malformedAlias],
  });
  assertStringIncludes(
    aliasError.message,
    "alias future-circle.surfaces.terminal.asciiFallback.text",
  );
});

Deno.test("the stage remains private and does not absorb existing glyph authorities", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../../deno.json", import.meta.url)),
  ) as { exports: Record<string, string> };
  assertEquals(manifest.exports["./glyphs"], undefined);

  const atlasSource = await Deno.readTextFile(
    new URL("../../src/glyphs/atlas.ts", import.meta.url),
  );
  for (
    const independentAuthority of [
      "cli/motif.ts",
      "cli/triangles.ts",
      "cli/glyph-ramps.ts",
      "components/core/icon/icon.cli.ts",
    ]
  ) {
    assert(
      !atlasSource.includes(independentAuthority),
      `${independentAuthority} remains independently owned`,
    );
  }
});

Deno.test("the private Glyph Atlas graph remains React-free and local", async () => {
  const repositoryRoot = decodeURIComponent(
    new URL("../../", import.meta.url).pathname,
  ).replace(/\/$/u, "");
  for (const target of ["atlas.ts", "validation.ts"]) {
    const output = await new Deno.Command(Deno.execPath(), {
      args: [
        "info",
        "--config",
        `${repositoryRoot}/deno.json`,
        "--json",
        `${repositoryRoot}/src/glyphs/${target}`,
      ],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assert(output.success, new TextDecoder().decode(output.stderr));
    const info = JSON.parse(new TextDecoder().decode(output.stdout)) as {
      readonly modules?: readonly {
        readonly specifier?: string;
        readonly local?: string;
        readonly mediaType?: string;
      }[];
    };
    for (const module of info.modules ?? []) {
      assert(module.specifier?.startsWith("file:"), module.specifier);
      assert(module.local?.startsWith(`${repositoryRoot}/src/`), module.local);
      assert(!module.specifier?.toLowerCase().includes("react"));
      assert(module.mediaType !== "TSX");
    }
  }
});
