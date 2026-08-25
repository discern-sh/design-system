/**
 * Literal resolution of authored design Tokens shared by the kind families,
 * for portable assets rendered without a live cascade.
 *
 * @module
 */

import {
  baseTokens,
  discernThemeTokens,
  themeTokens,
} from "../tokens/tokens.ts";

/** Explicit palette variant resolvable without a live cascade. */
export type TokenPaletteVariant = "light" | "dark";

/** Authored Token values for one variant, keyed by custom-property name. */
export function authoredTokenValues(
  variant: TokenPaletteVariant,
): ReadonlyMap<string, string> {
  return new Map([
    ...baseTokens.map((token) => [token.name, token.value] as const),
    ...discernThemeTokens.map((token) => [token.name, token.value] as const),
    ...themeTokens.map((token) => [token.name, token[variant]] as const),
  ]);
}

/** Resolve one authored Token to a literal by following var() chains. */
export function resolveTokenLiteral(
  name: string,
  values: ReadonlyMap<string, string>,
  subject: string,
  stack: ReadonlySet<string> = new Set(),
): string {
  if (stack.has(name)) {
    throw new TypeError(`Circular ${subject} Token reference at ${name}`);
  }
  const source = values.get(name);
  if (source === undefined) {
    throw new TypeError(`Unknown ${subject} Token reference ${name}`);
  }
  const nextStack = new Set(stack).add(name);
  return source.replace(
    /var\(\s*(--discern-[a-z0-9-]+)\s*\)/giu,
    (_match, dependency: string) =>
      resolveTokenLiteral(dependency, values, subject, nextStack),
  );
}
