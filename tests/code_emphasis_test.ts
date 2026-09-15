import { assert, assertEquals } from "@std/assert";
import {
  type CodeDialect,
  type CodeEmphasis,
  emphasiseCode,
  projectCodeRuns,
  resolveCodeDialect,
  splitCodeRunsByLine,
} from "../src/internal/code-emphasis.ts";

const DIALECTS: readonly CodeDialect[] = [
  "c-family",
  "css",
  "generic",
  "hash",
  "plain",
  "sgml",
  "sql",
];

/** Render runs as a compact classified string for readable assertions. */
function classify(source: string, dialect: CodeDialect): string {
  return emphasiseCode(source, dialect)
    .map((run) =>
      run.emphasis === undefined
        ? run.text
        : `[${run.emphasis.charAt(0)}:${run.text}]`
    )
    .join("");
}

function tiersOf(
  source: string,
  dialect: CodeDialect,
): readonly CodeEmphasis[] {
  return emphasiseCode(source, dialect)
    .flatMap((run) => run.emphasis === undefined ? [] : [run.emphasis]);
}

// ── The invariant that makes every other behaviour safe ──────────────────────

Deno.test("every dialect reproduces its input exactly", () => {
  const sources = [
    'const a = "b"; // c',
    "# comment only",
    "/* unterminated block",
    '"unterminated string\nnext line',
    "-- sql comment\nSELECT 'it''s';",
    '<!-- markup -->\n<p class="x">y</p>',
    ".a { --b: 1px; /* c */ }",
    "\t\n  mixed \r\n whitespace \t",
    'emoji 🎚️ and 中文 in "a string 🎚️"',
    "",
    "'''triple'''\n#after",
  ];
  for (const dialect of DIALECTS) {
    for (const source of sources) {
      assertEquals(
        emphasiseCode(source, dialect).map((run) => run.text).join(""),
        source,
        `${dialect} must reproduce ${JSON.stringify(source)}`,
      );
    }
  }
});

Deno.test("projected runs reproduce their input exactly", () => {
  const source = 'const label = "中文 🎚️"; // note\nconst n = 42;';
  for (const dialect of DIALECTS) {
    assertEquals(
      projectCodeRuns(source, dialect).map((run) => run.text).join(""),
      source,
    );
  }
});

// ── Fail closed ─────────────────────────────────────────────────────────────

Deno.test("an unterminated string reverts to base and spares what follows", () => {
  const source = [
    'const opening = "never closes;',
    'const after = "closes";',
    "const count = 42; // survives",
  ].join("\n");
  const classified = classify(source, "c-family");
  assert(
    !classified.includes('[l:"never closes;'),
    "the unterminated literal must not be emphasised",
  );
  assert(
    classified.includes('[l:"closes"]'),
    `the following string must still close: ${classified}`,
  );
  assert(
    classified.includes("[c:// survives]"),
    `the trailing comment must survive: ${classified}`,
  );
});

Deno.test("an unterminated block comment reverts to base", () => {
  assertEquals(tiersOf("before /* never closes", "c-family"), []);
});

Deno.test("an unterminated triple quote reverts to base", () => {
  assertEquals(tiersOf('"""never closes', "hash"), []);
});

// ── Delimiter families ──────────────────────────────────────────────────────

Deno.test("the same source reads differently under each dialect", () => {
  const source = "--discern-space-4: 16px;\n#id { color: red; }";
  assertEquals(
    classify(source, "sql"),
    "[c:--discern-space-4: 16px;]\n[p:#]id [p:{] color[p::] red[p:;] [p:}]",
  );
  assertEquals(
    classify(source, "css"),
    "--discern-space-4[p::] [l:16]px[p:;]\n[p:#]id [p:{] color[p::] red[p:;] [p:}]",
  );
  assertEquals(
    classify(source, "hash"),
    "[p:--]discern-space-4[p::] [l:16]px[p:;]\n[c:#id { color: red; }]",
  );
});

Deno.test("generic omits the ambiguous hash marker", () => {
  assert(
    !tiersOf("#include <stdio.h>", "generic").includes("comment"),
    "a hash must not open a comment under generic",
  );
  assertEquals(tiersOf("# a comment", "hash"), ["comment"]);
});

Deno.test("sql closes a doubled-quote escape inside one literal", () => {
  assertEquals(
    classify("label <> 'it''s exempt'", "sql"),
    "label [p:<>] [l:'it''s exempt']",
  );
});

Deno.test("backslash escapes stay inside their literal", () => {
  assertEquals(
    classify('a = "she said \\"yes\\"";', "c-family"),
    'a [p:=] [l:"she said \\"yes\\""][p:;]',
  );
});

Deno.test("sgml does not treat a backslash as an escape", () => {
  assertEquals(
    classify('<a b="c\\">d', "sgml"),
    '[p:<]a b[p:=][l:"c\\"][p:>]d',
  );
});

Deno.test("a template literal may span lines but a quoted one may not", () => {
  assertEquals(tiersOf("`a\nb`", "c-family"), ["literal"]);
  assertEquals(tiersOf('"a\nb"', "c-family"), []);
});

// ── Identifiers keep their shape ────────────────────────────────────────────

Deno.test("hyphenated and underscored names never shatter", () => {
  assertEquals(tiersOf("--discern-space-16", "css"), []);
  assertEquals(classify("a_b-c2 = 1", "generic"), "a_b-c2 [p:=] [l:1]");
});

Deno.test("a digit inside a name is not a literal", () => {
  assertEquals(tiersOf("space16", "generic"), []);
  assertEquals(tiersOf("16", "generic"), ["literal"]);
});

Deno.test("subtraction still recedes while kebab-case does not", () => {
  assertEquals(classify("a - b", "generic"), "a [p:-] b");
  assertEquals(classify("a-b", "generic"), "a-b");
});

// ── Plain ───────────────────────────────────────────────────────────────────

Deno.test("plain emphasises nothing", () => {
  const source = '# not a comment\n"not a string" // not a comment';
  assertEquals(tiersOf(source, "plain"), []);
  assertEquals(emphasiseCode(source, "plain").length, 1);
});

Deno.test("an empty source yields no runs", () => {
  for (const dialect of DIALECTS) assertEquals(emphasiseCode("", dialect), []);
});

// ── Dialect resolution ──────────────────────────────────────────────────────

Deno.test("language labels resolve to a delimiter family", () => {
  assertEquals(resolveCodeDialect("TypeScript"), "c-family");
  assertEquals(resolveCodeDialect("  py  "), "hash");
  assertEquals(resolveCodeDialect("SCSS"), "css");
  assertEquals(resolveCodeDialect("text"), "plain");
  assertEquals(resolveCodeDialect("brainfuck"), "generic");
  assertEquals(resolveCodeDialect(undefined), "generic");
});

// ── Merging with measured terminal cells ────────────────────────────────────

Deno.test("a measured grapheme is never split across an emphasis boundary", () => {
  const runs = projectCodeRuns('"中文" + x', "c-family");
  const wide = runs.filter((run) => run.columns !== undefined);
  assert(wide.length > 0, "the sample must contain a measured grapheme");
  for (const run of wide) {
    assertEquals(
      run.emphasis,
      "literal",
      "a grapheme inside the literal keeps that tier whole",
    );
  }
});

Deno.test("adjacent runs sharing a tier are merged", () => {
  const runs = emphasiseCode("a;;;;b", "generic");
  assertEquals(runs.length, 3);
  assertEquals(runs[1]?.text, ";;;;");
});

// ── Splitting into numbered lines ───────────────────────────────────────────

Deno.test("splitting by line preserves every character and its tier", () => {
  const source = 'a = "one";\n// two\nb = 3;';
  const lines = splitCodeRunsByLine(projectCodeRuns(source, "c-family"));
  assertEquals(lines.length, 3);
  assertEquals(
    lines.map((line) => line.map((run) => run.text).join("")).join("\n"),
    source,
  );
  assertEquals(lines[1]?.map((run) => run.emphasis), ["comment"]);
});

Deno.test("splitting never lets a run straddle a line boundary", () => {
  const lines = splitCodeRunsByLine(projectCodeRuns("`a\nb`", "c-family"));
  assertEquals(lines.length, 2);
  for (const line of lines) {
    for (const run of line) {
      assert(!run.text.includes("\n"), "no run may contain a line separator");
    }
  }
});

Deno.test("a trailing separator yields a final empty line", () => {
  assertEquals(
    splitCodeRunsByLine(projectCodeRuns("a\n", "generic")).length,
    2,
  );
});

Deno.test("the plain dialect yields width runs with no tier", () => {
  const runs = projectCodeRuns('const a = "b";', "plain");
  assertEquals(runs.filter((run) => run.emphasis !== undefined), []);
});
