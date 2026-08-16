/**
 * Grapheme-aware single-line and multiline terminal text editing.
 *
 * @module
 */

import type { TerminalKey } from "./keys.ts";

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Split text at user-perceived Unicode character boundaries. */
export function segmentGraphemes(value: string): readonly string[] {
  return [...segmenter.segment(value)].map((part) => part.segment);
}

/** Editing behavior that differs between single-line interactions and textareas. */
export interface TextEditorOptions {
  readonly multiline?: boolean;
}

/** Mutable Unicode text buffer addressed by grapheme index. */
export class GraphemeTextEditor {
  #graphemes: string[];
  #cursor: number;

  constructor(value = "") {
    this.#graphemes = [...segmentGraphemes(value)];
    this.#cursor = this.#graphemes.length;
  }

  /** Complete unmasked text value. */
  get value(): string {
    return this.#graphemes.join("");
  }

  /** Cursor position as an index into the current grapheme sequence. */
  get cursor(): number {
    return this.#cursor;
  }

  /** Whether the cursor is at the end of the complete value. */
  get atEnd(): boolean {
    return this.#cursor === this.#graphemes.length;
  }

  /** Replace the complete value and place the cursor at its end. */
  replace(value: string): void {
    this.#graphemes = [...segmentGraphemes(value)];
    this.#cursor = this.#graphemes.length;
  }

  /**
   * Apply one decoded key. Returns true only when the underlying value changes;
   * cursor-only movement returns false.
   */
  handle(key: TerminalKey, options: TextEditorOptions = {}): boolean {
    if (key.kind === "text") return this.#insert(key.text);
    if (key.kind !== "named") return false;
    const multiline = options.multiline ?? false;
    switch (key.name) {
      case "left":
      case "ctrl-b":
        this.#cursor = Math.max(0, this.#cursor - 1);
        return false;
      case "right":
      case "ctrl-f":
        this.#cursor = Math.min(this.#graphemes.length, this.#cursor + 1);
        return false;
      case "home":
      case "ctrl-a":
        this.#cursor = multiline ? this.#lineStart() : 0;
        return false;
      case "end":
      case "ctrl-e":
        this.#cursor = multiline ? this.#lineEnd() : this.#graphemes.length;
        return false;
      case "up":
      case "ctrl-p":
        if (multiline) this.#moveVertical(-1);
        return false;
      case "down":
      case "ctrl-n":
        if (multiline) this.#moveVertical(1);
        return false;
      case "delete":
        if (this.#cursor >= this.#graphemes.length) return false;
        this.#graphemes.splice(this.#cursor, 1);
        return true;
      case "backspace":
      case "ctrl-h":
        if (this.#cursor === 0) return false;
        this.#graphemes.splice(this.#cursor - 1, 1);
        this.#cursor -= 1;
        return true;
      case "option-backspace":
        return this.#deleteWord();
      case "enter":
        return multiline ? this.#insert("\n") : false;
      default:
        return false;
    }
  }

  #insert(value: string): boolean {
    const printable = segmentGraphemes(value).filter((grapheme) =>
      grapheme === "\n" || !/[\p{Cc}]/u.test(grapheme)
    );
    if (printable.length === 0) return false;
    const before = this.#graphemes.slice(0, this.#cursor).join("");
    const after = this.#graphemes.slice(this.#cursor).join("");
    const inserted = printable.join("");
    this.#graphemes = [...segmentGraphemes(`${before}${inserted}${after}`)];
    this.#cursor = segmentGraphemes(`${before}${inserted}`).length;
    return true;
  }

  #deleteWord(): boolean {
    if (this.#cursor === 0) return false;
    let start = this.#cursor;
    while (start > 0 && /\s/u.test(this.#graphemes[start - 1] ?? "")) {
      start -= 1;
    }
    while (
      start > 0 &&
      /[\p{L}\p{M}\p{N}]/u.test(this.#graphemes[start - 1] ?? "")
    ) {
      start -= 1;
    }
    if (start === this.#cursor) return false;
    this.#graphemes.splice(start, this.#cursor - start);
    this.#cursor = start;
    return true;
  }

  #lineStart(): number {
    return this.#graphemes.lastIndexOf("\n", this.#cursor - 1) + 1;
  }

  #lineEnd(): number {
    const next = this.#graphemes.indexOf("\n", this.#cursor);
    return next === -1 ? this.#graphemes.length : next;
  }

  #moveVertical(direction: -1 | 1): void {
    const start = this.#lineStart();
    const column = this.#cursor - start;
    if (direction === -1) {
      if (start === 0) {
        this.#cursor = 0;
        return;
      }
      const previousEnd = start - 1;
      const previousStart = this.#graphemes.lastIndexOf(
        "\n",
        previousEnd - 1,
      ) + 1;
      this.#cursor = Math.min(previousStart + column, previousEnd);
      return;
    }
    const end = this.#lineEnd();
    if (end === this.#graphemes.length) {
      this.#cursor = end;
      return;
    }
    const nextStart = end + 1;
    const nextEndIndex = this.#graphemes.indexOf("\n", nextStart);
    const nextEnd = nextEndIndex === -1 ? this.#graphemes.length : nextEndIndex;
    this.#cursor = Math.min(nextStart + column, nextEnd);
  }
}
