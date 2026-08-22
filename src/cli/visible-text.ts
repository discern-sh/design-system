/**
 * Make untrusted source controls visible without losing their identity.
 *
 * This helper emits display text only. Newlines and tabs may be retained by
 * preformatted authorities; every other control or Unicode format character
 * becomes deterministic `\\u{HEX}` notation.
 *
 * @module
 */

/** Options for source-text control notation. */
export interface VisibleSourceTextOptions {
  /** Preserve line-feed characters for a structural or preformatted caller. */
  readonly preserveLineFeeds?: boolean;
  /** Preserve tabs for a preformatted caller that owns tab expansion. */
  readonly preserveTabs?: boolean;
}

function controlNotation(character: string): string {
  const codePoint = character.codePointAt(0);
  return codePoint === undefined
    ? ""
    : `\\u{${codePoint.toString(16).toUpperCase()}}`;
}

/** Replace terminal controls and Unicode format characters with visible text. */
export function makeSourceControlsVisible(
  value: string,
  options: VisibleSourceTextOptions = {},
): string {
  return value.replace(
    /[\p{Cc}\p{Cf}]/gu,
    (character) =>
      (character === "\n" && options.preserveLineFeeds === true) ||
        (character === "\t" && options.preserveTabs === true)
        ? character
        : controlNotation(character),
  );
}
