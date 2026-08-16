/** Shared leading-space contract for heading-level CLI Components. */

/** Prefix one heading with its validated boundary-owned blank lines. */
export function withCliHeadingBoundary(
  heading: string,
  leadingBlankLines = 1,
): string {
  if (!Number.isSafeInteger(leadingBlankLines) || leadingBlankLines < 0) {
    throw new TypeError(
      `heading leading blank lines must be a non-negative safe integer; received ${leadingBlankLines}`,
    );
  }
  return `${"\n".repeat(leadingBlankLines)}${heading}`;
}
