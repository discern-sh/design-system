/**
 * Text for terminals without Unicode: the typographic marks text commonly
 * carries become their ASCII spellings, in one table every renderer that
 * paints caller text shares.
 *
 * @module
 */

/** Typographic marks and the ASCII each becomes. */
const ASCII_SPELLINGS: Readonly<Record<string, string>> = Object.freeze({
  "…": "...",
  "·": "-",
  "•": "*",
  "—": "-",
  "–": "-",
  "−": "-",
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  "×": "x",
  "→": "->",
  "←": "<-",
  "↑": "^",
  "↓": "v",
  "⇄": "<>",
});

const MARKS = new RegExp(`[${Object.keys(ASCII_SPELLINGS).join("")}]`, "gu");

/** Spell typographic marks in ASCII, leaving every other character as it is. */
export function asciiSpelling(text: string): string {
  return text.replace(MARKS, (mark) => ASCII_SPELLINGS[mark] ?? mark);
}
