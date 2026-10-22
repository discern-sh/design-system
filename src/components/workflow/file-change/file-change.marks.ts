/**
 * Disposition marks shared by the web and terminal File change renderers, so
 * a file reads with the same glyph on every surface.
 *
 * @module
 */

import { TERMINAL_GLYPHS } from "../../../cli/terminal-glyphs.ts";
import type { FileDisposition } from "./file-change.types.ts";

/** One disposition mark with its Unicode form and printable ASCII fallback. */
export interface FileDispositionMark {
  readonly unicode: string;
  readonly ascii: string;
}

/** The mark that leads every canonical File change disposition. */
export const FILE_DISPOSITION_MARKS = {
  added: { unicode: "+", ascii: "+" },
  updated: { unicode: "~", ascii: "~" },
  generated: { unicode: "◇", ascii: "*" },
  removed: TERMINAL_GLYPHS.removes,
  unchanged: TERMINAL_GLYPHS.keeps,
} as const satisfies Readonly<Record<FileDisposition, FileDispositionMark>>;
