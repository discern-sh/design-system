/**
 * The branded default preset: Discern's blue accent expressed as public
 * theme tokens, kept separate from the semantic base roles so a consumer
 * theme can replace it without forking component CSS.
 *
 * @module
 */
import { discernThemeTokens } from "../tokens/tokens.ts";

/** Name of the branded default preset. */
export const DISCERN_THEME_NAME = "discern" as const;

/** Shape of the branded preset exported beside the semantic base roles. */
export interface DiscernTheme {
  readonly name: typeof DISCERN_THEME_NAME;
  readonly tokens: Readonly<Record<`--discern-${string}`, string>>;
}

/** The branded blue preset, kept separate from the semantic base roles. */
export const discernTheme: DiscernTheme = {
  name: DISCERN_THEME_NAME,
  tokens: Object.fromEntries(
    discernThemeTokens.map((token) => [token.name, token.value]),
  ) as Readonly<Record<`--discern-${string}`, string>>,
};

const declarations: string = discernThemeTokens.map((token) =>
  `    ${token.name}: ${token.value};`
).join("\n");

/** CSS for consumers that select the default Discern preset. */
export const discernThemeCss = `@layer discern.theme {
  :where([data-discern-root]) {
${declarations}
  }
}`;
