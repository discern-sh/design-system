/**
 * Vertical rhythm for composed terminal output: exactly one blank line
 * between semantic blocks, as a property of composition rather than author
 * bookkeeping.
 *
 * The contract has three clauses. A **block** is a rendered string whose
 * edges are clean: it neither begins nor ends with a blank line and carries
 * no trailing newline; its interior lines, including deliberate single blank
 * lines, are its own. A **boundary** between two blocks on the same surface
 * is exactly one blank line — two newlines between the last content line of
 * one block and the first of the next. A **sink** that appends blocks to a
 * stream incrementally satisfies the boundary by counting the consecutive
 * newlines already at the stream tail (capping the count at two), writing
 * {@linkcode cliBlockBoundary} of that count before every block after the
 * first, and writing one newline after each block to terminate its last
 * line.
 *
 * {@linkcode composeCliBlocks} makes one conforming block out of many, so
 * callers that build a whole surface in memory get the rhythm by
 * construction; the sink clauses cover callers that write as they go. The
 * package supplies no sink — writing is the consumer's effect.
 *
 * @module
 */

import { stripAnsi } from "./ansi.ts";

function isBlankLine(line: string): boolean {
  return stripAnsi(line).trim() === "";
}

/**
 * Compose blocks into one block with exactly one blank line between them.
 * Each block's leading and trailing blank lines are removed — a Heading that
 * owns its usual boundary composes without doubling — blocks left empty are
 * dropped, and block interiors are preserved byte-for-byte, so composed
 * results nest: composing already-composed blocks changes nothing.
 */
export function composeCliBlocks(blocks: readonly string[]): string {
  return blocks.map((block) => {
    const lines = block.split("\n");
    let start = 0;
    let end = lines.length;
    while (start < end && isBlankLine(lines[start] ?? "")) start += 1;
    while (end > start && isBlankLine(lines[end - 1] ?? "")) end -= 1;
    return lines.slice(start, end).join("\n");
  }).filter((block) => block !== "").join("\n\n");
}

/**
 * The string a conforming sink writes before its next block: enough newlines
 * to leave exactly one blank line after content, given how many consecutive
 * newlines already end the stream. Counts above two behave as two; at the
 * very start of a stream a sink writes no boundary at all.
 */
export function cliBlockBoundary(trailingNewlines: number): string {
  if (!Number.isSafeInteger(trailingNewlines) || trailingNewlines < 0) {
    throw new TypeError(
      `trailing newline count must be a non-negative safe integer; received ${trailingNewlines}`,
    );
  }
  return "\n".repeat(Math.max(0, 2 - Math.min(trailingNewlines, 2)));
}
