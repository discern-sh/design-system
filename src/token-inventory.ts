/**
 * Complete public Token inventory across the neutral field and optional
 * appearance presets. Projection graphs import their narrower authorities;
 * manifests and discovery surfaces import this complete inventory.
 *
 * @module
 */

import { blueThemeTokens } from "./theme/blue.ts";
import { allTokens } from "./tokens/tokens.ts";
import type { DesignToken, ThemeToken } from "./tokens/tokens.ts";

/** Every public Token exposed by the package, including preset primitives. */
export const publicTokens: readonly (DesignToken | ThemeToken)[] = Object
  .freeze([
    ...allTokens,
    ...blueThemeTokens,
  ]);
