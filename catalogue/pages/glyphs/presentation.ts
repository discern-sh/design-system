import { publicTokens } from "../../../src/token-inventory.ts";
import type { DesignToken, ThemeToken } from "../../../src/tokens/tokens.ts";
import type { CanonicalGlyphRecord } from "../../../src/glyphs/atlas.ts";

/** Readable labels for Unicode names and private machine vocabulary. */
export function glyphHumanize(value: string): string {
  return value.replaceAll("-", " ").replaceAll("_", " ").toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}

export interface GlyphBrowserFontRole {
  readonly token: string;
  readonly label: string;
}

/** Derive browser font-stack roles from the public Token inventory. */
export function glyphBrowserFontRoles(
  tokens: readonly (DesignToken | ThemeToken)[] = publicTokens,
): readonly GlyphBrowserFontRole[] {
  return tokens.flatMap((token) => {
    if (
      !("value" in token) || token.category !== "Typography" ||
      !token.name.startsWith("--discern-font-") ||
      !/\b(?:serif|sans-serif|monospace)\b/u.test(token.value)
    ) return [];
    return [{
      token: token.name,
      label: token.name === "--discern-font-ui"
        ? "UI"
        : glyphHumanize(token.name.slice("--discern-font-".length)),
    }];
  });
}

export function glyphJavaScriptEscape(
  record: Pick<CanonicalGlyphRecord, "codePoints">,
): string {
  return record.codePoints.map((codePoint) =>
    `\\u{${codePoint.toString(16).toUpperCase()}}`
  ).join("");
}
