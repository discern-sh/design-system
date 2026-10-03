import { assert, assertEquals } from "@std/assert";
import { styleText } from "../../src/cli/ansi.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import * as text from "../../src/cli/text.ts";
import { deriveTerminalTheme } from "../../src/cli/theme.ts";
import { type LayoutWork, layoutWork } from "./layout_work.ts";
import * as reference from "./text_layout_oracle.ts";

const SIZE = 2_000;
/** The quadratic reference shows its work on less input, where it costs less. */
const REFERENCE_SIZE = 500;
const GROWTH = 4;
/** Work may grow at most this much faster than the input for constant overhead. */
const LINEAR_SLACK = 1.125;
const COLUMNS = 58;

type TextModule = typeof text;
type FunctionExport = {
  [Name in keyof TextModule]: TextModule[Name] extends
    (...parameters: never[]) => unknown ? Name : never;
}[keyof TextModule];

/** Function exports that take no text to segment, and why. */
const UNSEGMENTED = {
  graphemeWidth:
    "measures one grapheme its caller has already segmented, and never segments",
} as const satisfies Partial<Record<FunctionExport, string>>;

type ProbedExport = Exclude<FunctionExport, keyof typeof UNSEGMENTED>;

/** The helpers a probe drives: the package's, or the reference algorithm's. */
type Layout = Pick<TextModule, ProbedExport>;

/**
 * Quadratic work the direct algorithm does on a shape: the export whose
 * reference does it, the measure that sees it, and what it is.
 */
interface Cause {
  readonly through: ProbedExport;
  readonly seenBy: keyof LayoutWork;
  readonly work: string;
}

/** A way a long text reaches the helpers, and the quadratic work it reaches. */
interface Shape {
  readonly input: (size: number) => string;
  readonly reaches: readonly Cause[];
}

function repeatTo(unit: string, size: number): string {
  return unit.repeat(Math.ceil(size / unit.length)).slice(0, size);
}

const LONG_WORD: Cause = {
  through: "wrapText",
  seenBy: "units",
  work: "re-measuring the rest of a long word for every piece it cuts",
};

/** Input shapes by length, each naming any quadratic work it reaches. */
const SHAPES: Readonly<Record<string, Shape>> = {
  "an unbroken word": {
    input: (size) => "x".repeat(size),
    reaches: [LONG_WORD],
  },
  "a long path": {
    input: (size) => repeatTo("node-modules/", size),
    reaches: [LONG_WORD],
  },
  "prose with paths wider than a line": {
    input: (size) =>
      repeatTo(
        "open .worktrees/homepage-session-prototype-b2c3d4/session-preview-card-header-actions.tsx to review it ",
        size,
      ),
    reaches: [{
      through: "wrapText",
      seenBy: "lineExtensions",
      work:
        "re-wrapping the rest of the paragraph to choose each path word's break",
    }, {
      through: "wrapStyledText",
      seenBy: "runVisits",
      work:
        "re-reading the paragraph's styled runs from its first for each word",
    }],
  },
  "wide and joined graphemes": {
    input: (size) => "界e\u0301👩\u200d💻🇬🇧-".repeat(Math.ceil(size / 12)),
    reaches: [LONG_WORD],
  },
  "many short lines": {
    input: (size) => repeatTo("a short line\n", size),
    reaches: [],
  },
};

const capabilities = testTerminalCapabilities({ colorDepth: "truecolor" });
const theme = deriveTerminalTheme("dark");

/** Package-styled text with a style run for every other word. */
function styled(plain: string): string {
  return plain.split(" ").map((word, index) =>
    index % 2 === 0 ? styleText(word, { bold: true }, capabilities) : word
  ).join(" ");
}

/** How each text export is driven over a shape of input. */
function probes(
  layout: Layout,
): Readonly<Record<ProbedExport, (input: string) => unknown>> {
  return {
    measureText: (input) => layout.measureText(input),
    padText: (input) => layout.padText(input, COLUMNS, "center"),
    truncateText: (input) => [
      layout.truncateText(input, COLUMNS),
      layout.truncateText(input, COLUMNS, "…", { at: "word" }),
    ],
    truncateStyledText: (input) =>
      layout.truncateStyledText(styled(input), COLUMNS, "…", { at: "word" }),
    wrapText: (input) => layout.wrapText(input, COLUMNS),
    wrapTextPreservingIndent: (input) =>
      layout.wrapTextPreservingIndent(`    ${input}`, COLUMNS),
    wrapStyledText: (input) => layout.wrapStyledText(styled(input), COLUMNS),
    wrapStyledTextPreservingIndent: (input) =>
      layout.wrapStyledTextPreservingIndent(`  ${styled(input)}`, COLUMNS),
    fillStyledLine: (input) =>
      layout.fillStyledLine(
        styled(input.replaceAll("\n", " ")),
        COLUMNS,
        { background: theme.surfaces.selection },
        capabilities,
      ),
  };
}

/** How `run`'s layout work grows when its input grows fourfold from `size`. */
function growth(
  run: (input: string) => unknown,
  shape: Shape,
  size = SIZE,
): {
  readonly small: LayoutWork;
  readonly large: LayoutWork;
  /** One measure's growth. */
  readonly ratio: (measure: keyof LayoutWork) => number;
  /** The fastest-growing measure's growth, and the most linear work allows. */
  readonly worst: number;
  readonly allowed: number;
} {
  const smallInput = shape.input(size);
  const largeInput = shape.input(size * GROWTH);
  const small = layoutWork(() => run(smallInput));
  const large = layoutWork(() => run(largeInput));
  const ratio = (measure: keyof LayoutWork): number =>
    large[measure] === 0 ? 0 : large[measure] / Math.max(1, small[measure]);
  const measures = Object.keys(large) as (keyof LayoutWork)[];
  return {
    small,
    large,
    ratio,
    worst: Math.max(...measures.map(ratio)),
    allowed: (largeInput.length / smallInput.length) * LINEAR_SLACK,
  };
}

Deno.test("every text export is probed for linear work or names why it never segments", () => {
  const exported = Object.entries(text)
    .filter(([, value]) => typeof value === "function")
    .map(([name]) => name)
    .sort();
  assertEquals(
    exported,
    [...Object.keys(probes(text)), ...Object.keys(UNSEGMENTED)].sort(),
    "a new text export needs a probe here, or an entry saying why it never segments",
  );
});

Deno.test("text export work grows linearly with its input, never per line it produces", () => {
  for (const [name, probe] of Object.entries(probes(text))) {
    for (const [shapeName, shape] of Object.entries(SHAPES)) {
      const { small, large, worst, allowed } = growth(probe, shape);
      assert(
        small.calls > 0,
        `${name} over ${shapeName} must segment its input for the probe to measure it`,
      );
      assert(
        worst <= allowed,
        `${name} over ${shapeName}: ${GROWTH}× the input took ${
          worst.toFixed(2)
        }× the layout work (${JSON.stringify(small)} → ${
          JSON.stringify(large)
        }); segmenting, laying out, or reading again what it already passed is quadratic`,
      );
    }
  }
});

Deno.test("each shape reaches the quadratic work it names, and the package counts that work", () => {
  // A shape that stopped reaching its cause, or a measure that stopped
  // counting it, would let the guard above pass vacuously.
  const direct = probes(reference);
  const shipped = probes(text);
  for (const [shapeName, shape] of Object.entries(SHAPES)) {
    for (const { through, seenBy, work } of shape.reaches) {
      const { ratio, allowed } = growth(
        direct[through],
        shape,
        REFERENCE_SIZE,
      );
      assert(
        ratio(seenBy) > allowed,
        `the reference ${through} over ${shapeName} grew only ${
          ratio(seenBy).toFixed(2)
        }× in ${seenBy}, so the shape no longer reaches ${work}`,
      );
      const counted = layoutWork(() => shipped[through](shape.input(SIZE)));
      assert(
        counted[seenBy] > 0,
        `${through} over ${shapeName} counted no ${seenBy}, so the guard cannot see ${work}`,
      );
    }
  }
});
