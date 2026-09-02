/**
 * Safe, width-aware composition of package CLI component renderers.
 *
 * Structural Components accept {@linkcode CliBlock} values instead of
 * already-rendered strings. Each block therefore re-renders at the measure
 * its parent owns. The rendered result must use only the package's supported
 * styled-sequence grammar, carry clean block edges, and respect that measure
 * unless it explicitly declares a preserve-width policy.
 *
 * @module
 */

import type { TerminalCapabilities } from "./capabilities.ts";
import {
  type CliPresentationOptions,
  cliPresentationPassthrough,
  type CliRenderer,
} from "./contracts.ts";
import { composeCliBlocks } from "./rhythm.ts";
import { parseStyledSource } from "./styled-sequences.ts";
import { measureText } from "./text.ts";

/** Maximum nested structural-block depth accepted by terminal composition. */
export const CLI_BLOCK_MAX_DEPTH = 64;

/** Width posture for one rendered terminal block. */
export type CliBlockWidthPolicy = "bounded" | "preserve";

const CLI_BLOCK = Symbol("discern.cli-block");
const CLI_BLOCK_DEPTH = Symbol("discern.cli-block-depth");

type ContextualCapabilities = TerminalCapabilities & {
  readonly [CLI_BLOCK_DEPTH]?: CliBlockContext;
};

interface CliBlockContext {
  readonly depth: number;
  readonly preservedOverflow: { version: number };
}

/** Options recorded with a terminal block at creation time. */
export interface CliBlockOptions {
  /** Whether visible lines must fit the parent measure. Defaults to bounded. */
  readonly widthPolicy?: CliBlockWidthPolicy;
}

/** Options supplied by a structural parent when rendering child blocks. */
export interface CliBlockRenderOptions extends CliPresentationOptions {
  /** Maximum child measure in cells, bounded by terminal columns. */
  readonly maxWidth?: number;
}

/**
 * An opaque, re-renderable terminal Component block.
 *
 * Create values with {@linkcode createCliBlock}; structural Components do not
 * accept arbitrary rendered strings as children.
 */
export interface CliBlock {
  readonly [CLI_BLOCK]: true;
  readonly render: (
    capabilities: TerminalCapabilities,
    presentation?: CliPresentationOptions,
  ) => string;
  readonly widthPolicy: CliBlockWidthPolicy;
}

const knownBlocks = new WeakSet<object>();

function assertWidth(width: number): void {
  if (!Number.isSafeInteger(width) || width < 1) {
    throw new TypeError(
      `CLI block width must be a positive safe integer; received ${width}`,
    );
  }
}

function assertRenderedBlock(output: string): void {
  const segments = parseStyledSource(output);
  const plain = segments.map((segment) => segment.text).join("");
  if (/[\p{Cc}\p{Cf}]/u.test(plain.replaceAll("\n", ""))) {
    throw new TypeError(
      "CLI block output must not contain terminal controls or Unicode format characters",
    );
  }
}

/**
 * Bind immutable props to a pure CLI Component renderer for later nested
 * rendering. The parent's effective columns are supplied to the renderer;
 * an explicit width in the bound props may still narrow that measure.
 */
export function createCliBlock<Props>(
  renderer: CliRenderer<Props>,
  props: Readonly<Props>,
  options: CliBlockOptions = {},
): CliBlock {
  if (typeof renderer !== "function") {
    throw new TypeError("CLI block renderer must be a function");
  }
  const widthPolicy = options.widthPolicy ?? "bounded";
  if (widthPolicy !== "bounded" && widthPolicy !== "preserve") {
    throw new TypeError(`unknown CLI block width policy: ${widthPolicy}`);
  }
  const block: CliBlock = Object.freeze({
    [CLI_BLOCK]: true as const,
    render: (
      capabilities: TerminalCapabilities,
      presentation: CliPresentationOptions = {},
    ) =>
      renderer(
        {
          ...cliPresentationPassthrough(presentation),
          ...props,
        } as Readonly<Props>,
        capabilities,
      ),
    widthPolicy,
  });
  knownBlocks.add(block);
  return block;
}

/**
 * Render one Component block at a parent-owned measure.
 *
 * Clean block edges are returned so the result can be nested again. Styled
 * SGR and OSC 8 output is accepted only when the shared package parser can
 * decode it; foreign or unterminated sequences throw. Bounded blocks are
 * checked line by line after rendering. Preserve-width blocks are the sole
 * explicit overflow escape hatch for content such as preformatted code.
 */
export function renderCliBlock(
  block: CliBlock,
  capabilities: TerminalCapabilities,
  options: CliBlockRenderOptions = {},
): string {
  if (!knownBlocks.has(block)) {
    throw new TypeError("CLI block must be created with createCliBlock");
  }
  const requestedWidth = options.maxWidth ?? capabilities.columns;
  assertWidth(requestedWidth);
  const width = Math.min(requestedWidth, capabilities.columns);
  assertWidth(width);

  const parentContext = (capabilities as ContextualCapabilities)[
    CLI_BLOCK_DEPTH
  ];
  const depth = (parentContext?.depth ?? 0) + 1;
  if (depth > CLI_BLOCK_MAX_DEPTH) {
    throw new TypeError(
      `CLI block nesting exceeds ${CLI_BLOCK_MAX_DEPTH} levels`,
    );
  }

  const preservedOverflow = parentContext?.preservedOverflow ?? { version: 0 };
  const preserveVersionBefore = preservedOverflow.version;
  const childCapabilities: ContextualCapabilities = {
    ...capabilities,
    columns: width,
    [CLI_BLOCK_DEPTH]: { depth, preservedOverflow },
  };
  const output = block.render(
    childCapabilities,
    cliPresentationPassthrough(options),
  );
  assertRenderedBlock(output);
  const clean = composeCliBlocks([output]);
  if (clean === "") {
    throw new TypeError("CLI block renderer produced no visible content");
  }
  const overflow = clean.split("\n").find((line) => measureText(line) > width);
  if (overflow !== undefined) {
    if (block.widthPolicy === "preserve") {
      preservedOverflow.version += 1;
    } else if (preservedOverflow.version === preserveVersionBefore) {
      throw new TypeError(
        `bounded CLI block rendered ${
          measureText(overflow)
        } cells at width ${width}`,
      );
    }
  }
  return clean;
}

/**
 * Render semantic child blocks at one shared measure and compose exactly one
 * blank line between them. A nested call inherits and advances the structural
 * depth carried by its parent renderer's capabilities.
 */
export function renderCliBlocks(
  blocks: readonly CliBlock[],
  capabilities: TerminalCapabilities,
  options: CliBlockRenderOptions = {},
): string {
  return composeCliBlocks(
    blocks.map((block) => renderCliBlock(block, capabilities, options)),
  );
}
