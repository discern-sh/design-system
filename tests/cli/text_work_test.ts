import { assert, assertEquals } from "@std/assert";
import { styleText } from "../../src/cli/ansi.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import * as text from "../../src/cli/text.ts";
import { deriveTerminalTheme } from "../../src/cli/theme.ts";
import {
  type SegmentationWork,
  segmentationWork,
} from "./segmentation_work.ts";
import * as reference from "./text_layout_oracle.ts";

const SIZE = 2_000;
const GROWTH = 4;
/** Work may grow at most this much faster than the input for constant overhead. */
const LINEAR_SLACK = 1.125;
const COLUMNS = 58;

function repeatTo(unit: string, size: number): string {
  return unit.repeat(Math.ceil(size / unit.length)).slice(0, size);
}

/** Input shapes by length: each one a way a long text reaches the helpers. */
const SHAPES: Readonly<Record<string, (size: number) => string>> = {
  "an unbroken word": (size) => "x".repeat(size),
  "a long path": (size) => repeatTo("node-modules/", size),
  "prose with long paths": (size) =>
    repeatTo(
      "type agent/homepage-session-prototype-b2c3d4/and/more to drop it ",
      size,
    ),
  "wide and joined graphemes": (size) =>
    "界e\u0301👩\u200d💻🇬🇧-".repeat(Math.ceil(size / 12)),
  "many short lines": (size) => repeatTo("a short line\n", size),
};

const capabilities = testTerminalCapabilities({ colorDepth: "truecolor" });
const theme = deriveTerminalTheme("dark");

/** Package-styled text with a style run for every other word. */
function styled(plain: string): string {
  return plain.split(" ").map((word, index) =>
    index % 2 === 0 ? styleText(word, { bold: true }, capabilities) : word
  ).join(" ");
}

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

/** How each text export is driven over a shape of input. */
const PROBES: Readonly<
  Record<
    Exclude<FunctionExport, keyof typeof UNSEGMENTED>,
    (input: string) => unknown
  >
> = {
  measureText: (input) => text.measureText(input),
  padText: (input) => text.padText(input, COLUMNS, "center"),
  truncateText: (input) => [
    text.truncateText(input, COLUMNS),
    text.truncateText(input, COLUMNS, "…", { at: "word" }),
  ],
  truncateStyledText: (input) =>
    text.truncateStyledText(styled(input), COLUMNS, "…", { at: "word" }),
  wrapText: (input) => text.wrapText(input, COLUMNS),
  wrapTextPreservingIndent: (input) =>
    text.wrapTextPreservingIndent(`    ${input}`, COLUMNS),
  wrapStyledText: (input) => text.wrapStyledText(styled(input), COLUMNS),
  wrapStyledTextPreservingIndent: (input) =>
    text.wrapStyledTextPreservingIndent(`  ${styled(input)}`, COLUMNS),
  fillStyledLine: (input) =>
    text.fillStyledLine(
      styled(input.replaceAll("\n", " ")),
      COLUMNS,
      { background: theme.surfaces.selection },
      capabilities,
    ),
};

/** How `run`'s segmentation work grows when its input grows fourfold. */
function growth(
  run: (input: string) => unknown,
  shape: (size: number) => string,
): {
  readonly small: SegmentationWork;
  readonly large: SegmentationWork;
  /** The fastest-growing measure's growth, and the most linear work allows. */
  readonly worst: number;
  readonly allowed: number;
} {
  const smallInput = shape(SIZE);
  const largeInput = shape(SIZE * GROWTH);
  const small = segmentationWork(() => run(smallInput));
  const large = segmentationWork(() => run(largeInput));
  const ratio = (measure: keyof SegmentationWork): number =>
    large[measure] === 0 ? 0 : large[measure] / Math.max(1, small[measure]);
  const inputGrowth = largeInput.length / smallInput.length;
  return {
    small,
    large,
    worst: Math.max(ratio("calls"), ratio("units"), ratio("graphemes")),
    allowed: inputGrowth * LINEAR_SLACK,
  };
}

Deno.test("every text export is probed for linear work or names why it never segments", () => {
  const exported = Object.entries(text)
    .filter(([, value]) => typeof value === "function")
    .map(([name]) => name)
    .sort();
  assertEquals(
    exported,
    [...Object.keys(PROBES), ...Object.keys(UNSEGMENTED)].sort(),
    "a new text export needs a probe here, or an entry saying why it never segments",
  );
});

Deno.test("text export work grows linearly with its input, never per line it produces", () => {
  for (const [name, probe] of Object.entries(PROBES)) {
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
        }× the segmentation work (${JSON.stringify(small)} → ${
          JSON.stringify(large)
        }); re-segmenting what remains after each line or piece is quadratic`,
      );
    }
  }
});

Deno.test("the work instrument sees the reference's per-piece re-segmentation", () => {
  // The reference re-measures the remainder of a long word for every piece
  // it cuts; if the instrument stopped seeing that, the guard above would
  // pass vacuously.
  const { worst, allowed } = growth(
    (input) => reference.wrapText(input, COLUMNS),
    SHAPES["an unbroken word"] ?? ((size) => "x".repeat(size)),
  );
  assert(worst > allowed * 2, `the reference grew only ${worst.toFixed(2)}×`);
});
